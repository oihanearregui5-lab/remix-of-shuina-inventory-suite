ALTER TABLE public.machine_assets
  ADD COLUMN IF NOT EXISTS watch_points TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];