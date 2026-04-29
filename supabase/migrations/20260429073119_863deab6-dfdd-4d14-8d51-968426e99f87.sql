CREATE TABLE IF NOT EXISTS public.user_nav_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hidden_sections TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  section_order TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_nav_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their nav prefs"
  ON public.user_nav_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());