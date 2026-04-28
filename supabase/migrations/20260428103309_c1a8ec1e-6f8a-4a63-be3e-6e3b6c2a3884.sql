ALTER TABLE public.staff_journeys
  DROP CONSTRAINT IF EXISTS staff_journeys_staff_member_id_journey_date_shift_key;

DELETE FROM public.staff_journeys a
USING public.staff_journeys b
WHERE a.id < b.id
  AND a.journey_date = b.journey_date
  AND a.shift = b.shift;

ALTER TABLE public.staff_journeys
  DROP CONSTRAINT IF EXISTS staff_journeys_date_shift_unique;

ALTER TABLE public.staff_journeys
  ADD CONSTRAINT staff_journeys_date_shift_unique UNIQUE (journey_date, shift);

CREATE OR REPLACE FUNCTION public.set_journey_assignment(
  p_journey_date DATE,
  p_shift TEXT,
  p_staff_member_id UUID,
  p_color TEXT DEFAULT NULL,
  p_badge_label TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.set_journey_assignment(DATE, TEXT, UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_journey_assignment(
  p_journey_date DATE,
  p_shift TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.staff_journeys
  WHERE journey_date = p_journey_date AND shift = p_shift;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_journey_assignment(DATE, TEXT) TO authenticated;