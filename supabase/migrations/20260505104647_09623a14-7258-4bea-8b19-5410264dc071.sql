ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
COMMENT ON COLUMN public.tasks.estimated_minutes IS 'Duración estimada en minutos. NULL = sin estimar.';