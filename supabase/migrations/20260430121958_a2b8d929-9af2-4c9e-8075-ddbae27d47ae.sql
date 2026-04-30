CREATE TABLE IF NOT EXISTS public.user_nav_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hidden_sections TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  section_order TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_nav_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their nav prefs" ON public.user_nav_preferences;
CREATE POLICY "Users manage their nav prefs"
  ON public.user_nav_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.next_delivery_note_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_max INTEGER;
BEGIN
  SELECT COALESCE(MAX(order_number::INTEGER), 0)
  INTO v_max
  FROM public.delivery_notes
  WHERE order_number ~ '^[0-9]+$';
  RETURN GREATEST(v_max + 1, 2789)::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_delivery_note_autonumber()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_max INTEGER;
BEGIN
  IF NEW.order_number IS NULL OR TRIM(NEW.order_number) = '' THEN
    SELECT COALESCE(MAX(order_number::INTEGER), 0)
    INTO v_max
    FROM public.delivery_notes
    WHERE order_number ~ '^[0-9]+$';
    NEW.order_number := GREATEST(v_max + 1, 2789)::TEXT;
  END IF;
  RETURN NEW;
END;
$$;