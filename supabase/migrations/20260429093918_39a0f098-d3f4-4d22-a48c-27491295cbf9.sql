
ALTER TABLE public.tonnage_trips
ADD COLUMN IF NOT EXISTS driver_staff_id uuid REFERENCES public.staff_directory(id) ON DELETE SET NULL;

ALTER TABLE public.tonnage_trips
ADD COLUMN IF NOT EXISTS driver_name_snapshot text;
