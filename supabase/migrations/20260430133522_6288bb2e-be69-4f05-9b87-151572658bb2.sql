-- Separar preferencias de menú por scope (admin / worker)
ALTER TABLE public.user_nav_preferences
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'worker'
    CHECK (scope IN ('worker', 'admin'));

ALTER TABLE public.user_nav_preferences
  DROP CONSTRAINT IF EXISTS user_nav_preferences_pkey;

ALTER TABLE public.user_nav_preferences
  ADD CONSTRAINT user_nav_preferences_pkey PRIMARY KEY (user_id, scope);