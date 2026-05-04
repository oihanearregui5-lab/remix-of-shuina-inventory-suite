
-- 1. Add kilometers column (deprecate extra_info)
ALTER TABLE public.fuel_records
  ADD COLUMN IF NOT EXISTS kilometers INTEGER NULL;

COMMENT ON COLUMN public.fuel_records.extra_info IS 'DEPRECATED: usar columna kilometers en su lugar.';
COMMENT ON COLUMN public.fuel_records.kilometers IS 'Kilómetros del vehículo en el momento del repostaje (opcional).';

-- 2. fuel_recharges
CREATE TABLE IF NOT EXISTS public.fuel_recharges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_eur NUMERIC(10,2) NOT NULL CHECK (amount_eur > 0),
  recharge_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fuel_recharges_date ON public.fuel_recharges (recharge_date DESC);

ALTER TABLE public.fuel_recharges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view fuel recharges"
  ON public.fuel_recharges FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert fuel recharges"
  ON public.fuel_recharges FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by_user_id = auth.uid());

CREATE POLICY "Admins can update fuel recharges"
  ON public.fuel_recharges FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete fuel recharges"
  ON public.fuel_recharges FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER audit_fuel_recharges
  AFTER INSERT OR UPDATE OR DELETE ON public.fuel_recharges
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 3. fuel_settings (singleton)
CREATE TABLE IF NOT EXISTS public.fuel_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  threshold_warning INTEGER NOT NULL DEFAULT 500 CHECK (threshold_warning >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_user_id UUID REFERENCES auth.users(id)
);

INSERT INTO public.fuel_settings (id, threshold_warning) VALUES (1, 500)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.fuel_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view fuel settings"
  ON public.fuel_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update fuel settings"
  ON public.fuel_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- INSERT/DELETE bloqueados (no policies)

-- 4. get_fuel_balance()
CREATE OR REPLACE FUNCTION public.get_fuel_balance()
RETURNS TABLE (
  current_balance NUMERIC,
  last_recharge_date TIMESTAMPTZ,
  last_recharge_amount NUMERIC,
  is_below_threshold BOOLEAN,
  is_negative BOOLEAN,
  threshold INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recharges NUMERIC;
  v_spent NUMERIC;
  v_balance NUMERIC;
  v_threshold INTEGER;
  v_last_date TIMESTAMPTZ;
  v_last_amount NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount_eur), 0) INTO v_recharges FROM public.fuel_recharges;
  SELECT COALESCE(SUM(amount), 0) INTO v_spent FROM public.fuel_records;
  v_balance := v_recharges - v_spent;
  SELECT threshold_warning INTO v_threshold FROM public.fuel_settings WHERE id = 1;
  v_threshold := COALESCE(v_threshold, 500);
  SELECT recharge_date, amount_eur INTO v_last_date, v_last_amount
    FROM public.fuel_recharges ORDER BY recharge_date DESC LIMIT 1;
  RETURN QUERY SELECT
    v_balance,
    v_last_date,
    v_last_amount,
    (v_balance < v_threshold)::BOOLEAN,
    (v_balance < 0)::BOOLEAN,
    v_threshold;
END;
$$;

-- 5. get_consumption_average(card_id)
CREATE OR REPLACE FUNCTION public.get_consumption_average(_card_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg NUMERIC;
BEGIN
  WITH ordered AS (
    SELECT record_date, kilometers, liters,
           LAG(kilometers) OVER (ORDER BY record_date, created_at) AS prev_km,
           LAG(record_date) OVER (ORDER BY record_date, created_at) AS prev_date
    FROM public.fuel_records
    WHERE card_id = _card_id
  ),
  segments AS (
    SELECT (liters / NULLIF((kilometers - prev_km), 0)) * 100 AS l_per_100
    FROM ordered
    WHERE kilometers IS NOT NULL AND prev_km IS NOT NULL AND kilometers > prev_km
      AND liters IS NOT NULL AND liters > 0
  )
  SELECT AVG(l_per_100) INTO v_avg FROM segments WHERE l_per_100 > 0 AND l_per_100 < 100;
  RETURN v_avg;
END;
$$;

-- 6. Add 'fuel_alert' to notification_kind enum
ALTER TYPE public.notification_kind ADD VALUE IF NOT EXISTS 'fuel_alert';

-- 7. Reconfigurar RLS de fuel_records: worker solo ve los suyos, admin todos
DROP POLICY IF EXISTS "Auth users can view fuel records" ON public.fuel_records;
CREATE POLICY "Admin sees all, worker sees own fuel records"
  ON public.fuel_records FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'secretary')
    OR created_by_user_id = auth.uid()
  );
