
-- 1) Permitir staff_member_id NULL en staff_journeys (override "vacío")
ALTER TABLE public.staff_journeys ALTER COLUMN staff_member_id DROP NOT NULL;

-- 2) Reescribir set_journey_assignment para aceptar NULL (turno vacío)
CREATE OR REPLACE FUNCTION public.set_journey_assignment(
  p_journey_date date,
  p_shift text,
  p_staff_member_id uuid DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_badge_label text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  IF p_shift NOT IN ('M', 'T', 'N') THEN
    RAISE EXCEPTION 'Turno inválido: %', p_shift;
  END IF;

  INSERT INTO public.staff_journeys (
    staff_member_id, journey_date, shift, color, badge_label, created_by_user_id
  )
  VALUES (
    p_staff_member_id, p_journey_date, p_shift, p_color, p_badge_label, auth.uid()
  )
  ON CONFLICT (journey_date, shift) DO UPDATE SET
    staff_member_id = EXCLUDED.staff_member_id,
    color = EXCLUDED.color,
    badge_label = EXCLUDED.badge_label
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- 3) clear_journey_assignment ahora deja un override "vacío" (NULL) para que gane al Excel
CREATE OR REPLACE FUNCTION public.clear_journey_assignment(
  p_journey_date date,
  p_shift text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_shift NOT IN ('M', 'T', 'N') THEN
    RAISE EXCEPTION 'Turno inválido: %', p_shift;
  END IF;

  INSERT INTO public.staff_journeys (
    staff_member_id, journey_date, shift, color, badge_label, created_by_user_id
  )
  VALUES (NULL, p_journey_date, p_shift, NULL, NULL, auth.uid())
  ON CONFLICT (journey_date, shift) DO UPDATE SET
    staff_member_id = NULL,
    color = NULL,
    badge_label = NULL;

  RETURN TRUE;
END;
$function$;

-- 4) Nueva: delete_journey_assignment — restaura el valor del Excel (borra el override)
CREATE OR REPLACE FUNCTION public.delete_journey_assignment(
  p_journey_date date,
  p_shift text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.staff_journeys
  WHERE journey_date = p_journey_date AND shift = p_shift;
  RETURN FOUND;
END;
$function$;

-- 5) Sembrar Abel, David, Jon en `workers` reutilizando el id de staff_directory
INSERT INTO public.workers (
  id, name, display_name, color_hex, shift_default,
  annual_contract_hours, company_vacation_hours, worker_vacation_days,
  total_annual_hours, extra_vacation_days, linked_staff_member_id, linked_user_id, is_active
)
SELECT
  sd.id,
  upper(sd.full_name),
  sd.full_name,
  CASE sd.color_tag
    WHEN 'indigo' THEN '#6366f1'
    WHEN 'red'    THEN '#ef4444'
    WHEN 'teal'   THEN '#14b8a6'
    ELSE '#4F5A7A'
  END,
  'variable'::shift_default_type,
  1760, 0, 30, 1760, 0,
  sd.id, sd.linked_user_id, true
FROM public.staff_directory sd
WHERE sd.full_name IN ('Abel', 'David', 'Jon')
  AND NOT EXISTS (
    SELECT 1 FROM public.workers w
    WHERE lower(w.display_name) = lower(sd.full_name)
       OR w.id = sd.id
  );
