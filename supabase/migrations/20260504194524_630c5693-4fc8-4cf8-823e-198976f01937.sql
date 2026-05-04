ALTER TABLE public.tonnage_trips DROP CONSTRAINT IF EXISTS tonnage_trips_material_snapshot_check;
ALTER TABLE public.tonnage_trips ADD CONSTRAINT tonnage_trips_material_snapshot_check
  CHECK (material_snapshot = ANY (ARRAY['arenas'::text, 'tortas'::text, 'sulfatos'::text, 'general'::text]));