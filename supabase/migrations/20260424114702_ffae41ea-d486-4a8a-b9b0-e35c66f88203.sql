-- TONELADAS
CREATE TABLE IF NOT EXISTS public.tonnage_trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_number INTEGER NOT NULL UNIQUE,
  label TEXT NOT NULL,
  material TEXT NOT NULL DEFAULT 'arenas' CHECK (material IN ('arenas', 'tortas', 'sulfatos')),
  machine_asset_id UUID REFERENCES public.machine_assets(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tonnage_trucks_active ON public.tonnage_trucks (is_active, truck_number);

ALTER TABLE public.tonnage_trucks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view tonnage trucks"
ON public.tonnage_trucks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage tonnage trucks"
ON public.tonnage_trucks FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE TRIGGER update_tonnage_trucks_updated_at
BEFORE UPDATE ON public.tonnage_trucks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.tonnage_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id UUID NOT NULL REFERENCES public.tonnage_trucks(id) ON DELETE CASCADE,
  trip_date DATE NOT NULL,
  trip_time TIME,
  weight_kg NUMERIC(10, 2) NOT NULL CHECK (weight_kg >= 0),
  material_snapshot TEXT CHECK (material_snapshot IN ('arenas', 'tortas', 'sulfatos')),
  notes TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tonnage_trips_truck_date ON public.tonnage_trips (truck_id, trip_date);
CREATE INDEX IF NOT EXISTS idx_tonnage_trips_date ON public.tonnage_trips (trip_date DESC);

ALTER TABLE public.tonnage_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view tonnage trips"
ON public.tonnage_trips FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can insert tonnage trips"
ON public.tonnage_trips FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Admins update tonnage trips"
ON public.tonnage_trips FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE POLICY "Admins delete tonnage trips"
ON public.tonnage_trips FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE TRIGGER update_tonnage_trips_updated_at
BEFORE UPDATE ON public.tonnage_trips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE OR REPLACE FUNCTION public.tonnage_trip_snapshot_material()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.material_snapshot IS NULL OR NEW.material_snapshot = '' THEN
    SELECT material INTO NEW.material_snapshot FROM public.tonnage_trucks WHERE id = NEW.truck_id;
  END IF;
  IF NEW.material_snapshot IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar el material para el viaje (truck_id=%)', NEW.truck_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_tonnage_trip_snapshot ON public.tonnage_trips;
CREATE TRIGGER tr_tonnage_trip_snapshot
BEFORE INSERT ON public.tonnage_trips
FOR EACH ROW EXECUTE FUNCTION public.tonnage_trip_snapshot_material();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tonnage_trips;