-- ============================================================
-- TANDA v3.1 — 4 migraciones: vacaciones auto-balance, albaranes abiertos a trabajadores,
-- toneladas totalmente abiertas, nueva tabla staff_journeys.
-- ============================================================

-- ============================================================
-- 1) DESCUENTO AUTOMÁTICO de saldo al aprobar/rechazar/cancelar vacaciones
-- ============================================================
CREATE OR REPLACE FUNCTION public.count_request_days(p_start DATE, p_end DATE)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(1, (p_end - p_start) + 1)
$$;

CREATE OR REPLACE FUNCTION public.apply_vacation_balance_adjustment(
  p_staff_member_id UUID,
  p_request_type TEXT,
  p_days INTEGER,
  p_direction INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_field TEXT;
BEGIN
  IF p_staff_member_id IS NULL OR p_days IS NULL OR p_days <= 0 THEN
    RETURN;
  END IF;

  IF p_request_type = 'vacation' THEN
    v_field := 'vacation_adjustment_days';
  ELSIF p_request_type = 'leave' THEN
    v_field := 'personal_adjustment_days';
  ELSE
    RETURN;
  END IF;

  INSERT INTO public.staff_allowances (staff_member_id)
  VALUES (p_staff_member_id)
  ON CONFLICT (staff_member_id) DO NOTHING;

  IF v_field = 'vacation_adjustment_days' THEN
    UPDATE public.staff_allowances
    SET vacation_adjustment_days = vacation_adjustment_days + (p_direction * -p_days)
    WHERE staff_member_id = p_staff_member_id;
  ELSIF v_field = 'personal_adjustment_days' THEN
    UPDATE public.staff_allowances
    SET personal_adjustment_days = personal_adjustment_days + (p_direction * -p_days)
    WHERE staff_member_id = p_staff_member_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_vacation_request_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INTEGER;
  v_was_approved BOOLEAN;
  v_is_approved BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_was_approved := false;
    v_is_approved := (NEW.status = 'approved');
  ELSIF TG_OP = 'UPDATE' THEN
    v_was_approved := (OLD.status = 'approved');
    v_is_approved := (NEW.status = 'approved');
  ELSIF TG_OP = 'DELETE' THEN
    v_was_approved := (OLD.status = 'approved');
    v_is_approved := false;
  END IF;

  IF NOT v_was_approved AND v_is_approved THEN
    v_days := public.count_request_days(NEW.start_date, NEW.end_date);
    PERFORM public.apply_vacation_balance_adjustment(NEW.staff_member_id, NEW.request_type, v_days, 1);
  END IF;

  IF v_was_approved AND NOT v_is_approved THEN
    v_days := public.count_request_days(OLD.start_date, OLD.end_date);
    PERFORM public.apply_vacation_balance_adjustment(OLD.staff_member_id, OLD.request_type, v_days, -1);
  END IF;

  IF TG_OP = 'UPDATE' AND v_was_approved AND v_is_approved THEN
    IF OLD.start_date != NEW.start_date OR OLD.end_date != NEW.end_date OR OLD.request_type != NEW.request_type OR COALESCE(OLD.staff_member_id::text, '') != COALESCE(NEW.staff_member_id::text, '') THEN
      v_days := public.count_request_days(OLD.start_date, OLD.end_date);
      PERFORM public.apply_vacation_balance_adjustment(OLD.staff_member_id, OLD.request_type, v_days, -1);
      v_days := public.count_request_days(NEW.start_date, NEW.end_date);
      PERFORM public.apply_vacation_balance_adjustment(NEW.staff_member_id, NEW.request_type, v_days, 1);
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_vacation_balance ON public.vacation_requests;
CREATE TRIGGER tr_vacation_balance
  AFTER INSERT OR UPDATE OR DELETE
  ON public.vacation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_vacation_request_balance();


-- ============================================================
-- 2) ALBARANES: trabajador puede subir/ver/editar los suyos
-- ============================================================
DROP POLICY IF EXISTS "Admins can view delivery notes" ON public.delivery_notes;
DROP POLICY IF EXISTS "Admins manage delivery notes" ON public.delivery_notes;

CREATE POLICY "Workers can view own and admins all"
ON public.delivery_notes FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'secretary')
  OR created_by_user_id = auth.uid()
);

CREATE POLICY "Auth users insert own delivery notes"
ON public.delivery_notes FOR INSERT
TO authenticated
WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Workers update own admins all"
ON public.delivery_notes FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'secretary')
  OR created_by_user_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'secretary')
  OR created_by_user_id = auth.uid()
);

CREATE POLICY "Workers delete own admins all"
ON public.delivery_notes FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'secretary')
  OR created_by_user_id = auth.uid()
);

-- Storage bucket delivery-notes
DROP POLICY IF EXISTS "Admins read delivery-notes storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload delivery-notes storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete delivery-notes storage" ON storage.objects;

CREATE POLICY "Auth users read delivery-notes storage"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'delivery-notes');

CREATE POLICY "Auth users upload delivery-notes storage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery-notes');

CREATE POLICY "Admins delete delivery-notes storage"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'delivery-notes'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
);


-- ============================================================
-- 3) TONELADAS: viajes, camiones y zonas totalmente abiertos a autenticados
-- ============================================================
DROP POLICY IF EXISTS "Admins update tonnage trips" ON public.tonnage_trips;
CREATE POLICY "Auth users update tonnage trips"
ON public.tonnage_trips FOR UPDATE
TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins delete tonnage trips" ON public.tonnage_trips;
CREATE POLICY "Auth users delete tonnage trips"
ON public.tonnage_trips FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins manage tonnage trucks" ON public.tonnage_trucks;
CREATE POLICY "Auth users manage tonnage trucks"
ON public.tonnage_trucks FOR ALL
TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage tonnage zones" ON public.tonnage_zones;
CREATE POLICY "Auth users manage tonnage zones"
ON public.tonnage_zones FOR ALL
TO authenticated
USING (true) WITH CHECK (true);


-- ============================================================
-- 4) STAFF_JOURNEYS: asignación de trabajadores a días con turno y color
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id UUID NOT NULL REFERENCES public.staff_directory(id) ON DELETE CASCADE,
  journey_date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('M', 'T', 'N')),
  color TEXT,
  badge_label TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID,
  UNIQUE (staff_member_id, journey_date, shift)
);

CREATE INDEX IF NOT EXISTS idx_staff_journeys_date ON public.staff_journeys (journey_date);
CREATE INDEX IF NOT EXISTS idx_staff_journeys_member ON public.staff_journeys (staff_member_id);

ALTER TABLE public.staff_journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users view staff journeys"
ON public.staff_journeys FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Admins manage staff journeys"
ON public.staff_journeys FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));