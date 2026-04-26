ALTER TABLE public.tonnage_trips
ADD COLUMN IF NOT EXISTS driver_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_tonnage_trips_driver_user_id ON public.tonnage_trips(driver_user_id);