-- 1. Añadir trip_type a tonnage_trips (acopio / tolva)
ALTER TABLE public.tonnage_trips
  ADD COLUMN IF NOT EXISTS trip_type TEXT CHECK (trip_type IN ('acopio','tolva')) DEFAULT 'tolva';

-- 2. Marcar camioneros principales / ocasionales en staff_directory
ALTER TABLE public.staff_directory
  ADD COLUMN IF NOT EXISTS is_truck_driver BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS truck_driver_role TEXT CHECK (truck_driver_role IN ('principal','ocasional'));

UPDATE public.staff_directory
  SET is_truck_driver = true, truck_driver_role = 'principal'
  WHERE UPPER(full_name) IN ('HAMID','LYUBEN','FRAN','ANDRIY','MISAEL')
     OR UPPER(full_name) LIKE 'HAMID %'
     OR UPPER(full_name) LIKE 'LYUBEN %'
     OR UPPER(full_name) LIKE 'FRAN %'
     OR UPPER(full_name) LIKE 'ANDRIY %'
     OR UPPER(full_name) LIKE 'MISAEL %';

UPDATE public.staff_directory
  SET is_truck_driver = true, truck_driver_role = 'ocasional'
  WHERE UPPER(full_name) IN ('SILVESTRE','MANUEL','ABEL','DAVID','ION')
     OR UPPER(full_name) LIKE 'SILVESTRE %'
     OR UPPER(full_name) LIKE 'MANUEL %'
     OR UPPER(full_name) LIKE 'ABEL %'
     OR UPPER(full_name) LIKE 'DAVID %'
     OR UPPER(full_name) LIKE 'ION %';

-- 3. RLS: todos los camioneros autenticados ven todos los viajes
DROP POLICY IF EXISTS "Workers see own trips" ON public.tonnage_trips;
DROP POLICY IF EXISTS "All workers see all trips" ON public.tonnage_trips;
CREATE POLICY "All workers see all trips"
  ON public.tonnage_trips FOR SELECT TO authenticated USING (true);