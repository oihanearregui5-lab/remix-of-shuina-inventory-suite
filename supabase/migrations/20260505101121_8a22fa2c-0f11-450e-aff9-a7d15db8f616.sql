ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kiosk_viajes';

ALTER TABLE public.tonnage_trips
  ADD COLUMN IF NOT EXISTS driver_staff_id UUID REFERENCES public.staff_directory(id);

CREATE INDEX IF NOT EXISTS idx_tonnage_trips_driver ON public.tonnage_trips(driver_staff_id);

COMMENT ON COLUMN public.tonnage_trips.driver_staff_id IS 'Conductor real que hizo el viaje. Usado en modo kiosko (tablet compartida). Si NULL, se asume created_by_user_id.';