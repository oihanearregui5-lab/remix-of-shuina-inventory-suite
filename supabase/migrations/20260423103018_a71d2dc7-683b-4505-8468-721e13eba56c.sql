DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_slot') THEN
    CREATE TYPE public.shift_slot AS ENUM ('dia', 'tarde', 'noche');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_default_type') THEN
    CREATE TYPE public.shift_default_type AS ENUM ('dia', 'tarde', 'noche', 'variable');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'holiday_type') THEN
    CREATE TYPE public.holiday_type AS ENUM ('festivo_nacional', 'cierre_fabrica', 'festivo_local', 'otro');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.can_manage_vacation_journeys()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary')
$$;

CREATE TABLE IF NOT EXISTS public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  color_hex text NOT NULL,
  shift_default public.shift_default_type NOT NULL DEFAULT 'variable',
  annual_contract_hours numeric NOT NULL DEFAULT 0,
  company_vacation_hours numeric NOT NULL DEFAULT 0,
  worker_vacation_days numeric NOT NULL DEFAULT 0,
  total_annual_hours numeric NOT NULL DEFAULT 0,
  extra_vacation_days numeric NOT NULL DEFAULT 0,
  extra_vacation_reason text,
  linked_staff_member_id uuid,
  linked_user_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  type public.holiday_type NOT NULL,
  label text NOT NULL,
  color_hex text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, type, label)
);

CREATE TABLE IF NOT EXISTS public.vacation_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  date date NOT NULL,
  shift public.shift_slot NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, date, shift)
);

CREATE INDEX IF NOT EXISTS idx_workers_active_name ON public.workers(is_active, display_name);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(date);
CREATE INDEX IF NOT EXISTS idx_vacation_slots_date ON public.vacation_slots(date);
CREATE INDEX IF NOT EXISTS idx_vacation_slots_worker_date ON public.vacation_slots(worker_id, date);

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and secretaries can manage workers" ON public.workers;
CREATE POLICY "Admins and secretaries can manage workers"
ON public.workers
FOR ALL
TO authenticated
USING (public.can_manage_vacation_journeys())
WITH CHECK (public.can_manage_vacation_journeys());

DROP POLICY IF EXISTS "Admins and secretaries can manage holidays" ON public.holidays;
CREATE POLICY "Admins and secretaries can manage holidays"
ON public.holidays
FOR ALL
TO authenticated
USING (public.can_manage_vacation_journeys())
WITH CHECK (public.can_manage_vacation_journeys());

DROP POLICY IF EXISTS "Admins and secretaries can manage vacation slots" ON public.vacation_slots;
CREATE POLICY "Admins and secretaries can manage vacation slots"
ON public.vacation_slots
FOR ALL
TO authenticated
USING (public.can_manage_vacation_journeys())
WITH CHECK (public.can_manage_vacation_journeys());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_workers_updated_at ON public.workers;
CREATE TRIGGER update_workers_updated_at
BEFORE UPDATE ON public.workers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_holidays_updated_at ON public.holidays;
CREATE TRIGGER update_holidays_updated_at
BEFORE UPDATE ON public.holidays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vacation_slots_updated_at ON public.vacation_slots;
CREATE TRIGGER update_vacation_slots_updated_at
BEFORE UPDATE ON public.vacation_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.worker_year_summary AS
WITH years AS (
  SELECT 2026::int AS year
  UNION
  SELECT DISTINCT EXTRACT(YEAR FROM te.clock_in)::int FROM public.time_entries te
  UNION
  SELECT DISTINCT EXTRACT(YEAR FROM vs.date)::int FROM public.vacation_slots vs
)
SELECT
  w.id AS worker_id,
  y.year,
  w.total_annual_hours,
  COALESCE((
    SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(te.clock_out, te.clock_in) - te.clock_in)) / 3600)
    FROM public.time_entries te
    WHERE te.user_id = w.linked_user_id
      AND EXTRACT(YEAR FROM te.clock_in)::int = y.year
  ), 0)::numeric AS worked_hours,
  (
    w.total_annual_hours - COALESCE((
      SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(te.clock_out, te.clock_in) - te.clock_in)) / 3600)
      FROM public.time_entries te
      WHERE te.user_id = w.linked_user_id
        AND EXTRACT(YEAR FROM te.clock_in)::int = y.year
    ), 0)::numeric
  ) AS remaining_hours,
  COALESCE((
    SELECT COUNT(*)::numeric / 3
    FROM public.vacation_slots vs
    WHERE vs.worker_id = w.id
      AND EXTRACT(YEAR FROM vs.date)::int = y.year
  ), 0) AS vacation_days_used,
  (w.worker_vacation_days + w.extra_vacation_days) AS vacation_days_total,
  w.extra_vacation_days AS extra_days
FROM public.workers w
CROSS JOIN years y;

INSERT INTO public.workers (
  name, display_name, color_hex, shift_default, annual_contract_hours, company_vacation_hours, worker_vacation_days, total_annual_hours, extra_vacation_days
)
SELECT seed.name, seed.display_name, seed.color_hex, seed.shift_default, seed.annual_contract_hours, seed.company_vacation_hours, seed.worker_vacation_days, seed.total_annual_hours, seed.extra_vacation_days
FROM (
  VALUES
    ('ADRIAN', 'Adrian', '#1F77B4', 'variable'::public.shift_default_type, 1308, 236, 29.5, 1544, 0),
    ('AITOR', 'Aitor', '#FF7F0E', 'variable'::public.shift_default_type, 1744, 112, 14, 1856, 0),
    ('ANDRIY', 'Andriy', '#FF0000', 'variable'::public.shift_default_type, 1744, 152, 19, 1896, 0),
    ('FRAN', 'Fran', '#2CA02C', 'variable'::public.shift_default_type, 1744, 72, 9, 1816, 0),
    ('HAMID', 'Hamid', '#FFFF00', 'variable'::public.shift_default_type, 1744, 0, 0, 1744, 0),
    ('JUAN', 'Juan', '#9467BD', 'variable'::public.shift_default_type, 581.33, 6.67, 0.83, 588, 0),
    ('LYUBEN', 'Lyuben', '#CC00FF', 'variable'::public.shift_default_type, 1744, -72, -9, 1672, 0),
    ('MANUEL', 'Manuel', '#8C564B', 'variable'::public.shift_default_type, 1744, 24, 3, 1768, 0),
    ('MISAEL', 'Misael', '#FFC000', 'variable'::public.shift_default_type, 697.6, 78.4, 9.8, 776, 0),
    ('NELO', 'Nelo', '#92D050', 'variable'::public.shift_default_type, 872, -176, -22, 696, 0),
    ('SILVIO', 'Silvio', '#E377C2', 'variable'::public.shift_default_type, 1744, 136, 17, 1880, 0),
    ('OLEK', 'Olek', '#17BECF', 'variable'::public.shift_default_type, 1744, 164, 20.5, 1908, 0),
    ('RAQUEL', 'Raquel', '#7F7F7F', 'dia'::public.shift_default_type, 436, 68, 34, 504, 0)
) AS seed(name, display_name, color_hex, shift_default, annual_contract_hours, company_vacation_hours, worker_vacation_days, total_annual_hours, extra_vacation_days)
WHERE NOT EXISTS (SELECT 1 FROM public.workers LIMIT 1);

INSERT INTO public.holidays (date, type, label, color_hex)
SELECT seed.date, seed.type, seed.label, seed.color_hex
FROM (
  VALUES
    ('2026-01-01'::date, 'festivo_nacional'::public.holiday_type, 'Año Nuevo', '#FF0000'),
    ('2026-01-06'::date, 'festivo_nacional'::public.holiday_type, 'Reyes', '#FF0000'),
    ('2026-03-19'::date, 'festivo_nacional'::public.holiday_type, 'San José', '#FF0000'),
    ('2026-04-02'::date, 'festivo_nacional'::public.holiday_type, 'Jueves Santo', '#FF0000'),
    ('2026-04-03'::date, 'festivo_nacional'::public.holiday_type, 'Viernes Santo', '#FF0000'),
    ('2026-04-06'::date, 'festivo_nacional'::public.holiday_type, 'Lunes de Pascua', '#FF0000'),
    ('2026-05-01'::date, 'festivo_nacional'::public.holiday_type, 'Día del Trabajo', '#FF0000'),
    ('2026-10-12'::date, 'festivo_nacional'::public.holiday_type, 'Fiesta Nacional', '#FF0000'),
    ('2026-11-02'::date, 'festivo_nacional'::public.holiday_type, 'Todos los Santos', '#FF0000'),
    ('2026-12-03'::date, 'festivo_nacional'::public.holiday_type, 'Día autonómico', '#FF0000'),
    ('2026-12-08'::date, 'festivo_nacional'::public.holiday_type, 'Inmaculada Concepción', '#FF0000'),
    ('2026-12-25'::date, 'festivo_nacional'::public.holiday_type, 'Navidad', '#FF0000'),
    ('2026-08-12'::date, 'cierre_fabrica'::public.holiday_type, 'Cierre fábrica (verano)', '#FFFF00'),
    ('2026-08-13'::date, 'cierre_fabrica'::public.holiday_type, 'Cierre fábrica (verano)', '#FFFF00'),
    ('2026-08-14'::date, 'cierre_fabrica'::public.holiday_type, 'Cierre fábrica (verano)', '#FFFF00'),
    ('2026-08-15'::date, 'cierre_fabrica'::public.holiday_type, 'Cierre fábrica (verano)', '#FFFF00'),
    ('2026-08-16'::date, 'cierre_fabrica'::public.holiday_type, 'Cierre fábrica (verano)', '#FFFF00'),
    ('2026-08-17'::date, 'cierre_fabrica'::public.holiday_type, 'Cierre fábrica (verano)', '#FFFF00'),
    ('2026-08-18'::date, 'cierre_fabrica'::public.holiday_type, 'Cierre fábrica (verano)', '#FFFF00'),
    ('2026-08-19'::date, 'cierre_fabrica'::public.holiday_type, 'Cierre fábrica (verano)', '#FFFF00'),
    ('2026-08-20'::date, 'cierre_fabrica'::public.holiday_type, 'Cierre fábrica (verano)', '#FFFF00'),
    ('2026-08-21'::date, 'cierre_fabrica'::public.holiday_type, 'Cierre fábrica (verano)', '#FFFF00'),
    ('2026-08-22'::date, 'cierre_fabrica'::public.holiday_type, 'Cierre fábrica (verano)', '#FFFF00'),
    ('2026-08-23'::date, 'cierre_fabrica'::public.holiday_type, 'Cierre fábrica (verano)', '#FFFF00'),
    ('2026-08-24'::date, 'cierre_fabrica'::public.holiday_type, 'Cierre fábrica (verano)', '#FFFF00'),
    ('2026-08-25'::date, 'cierre_fabrica'::public.holiday_type, 'Cierre fábrica (verano)', '#FFFF00')
) AS seed(date, type, label, color_hex)
WHERE NOT EXISTS (SELECT 1 FROM public.holidays LIMIT 1);