-- Hacer público el bucket machine-photos para servir fotos sin signed URL
UPDATE storage.buckets SET public = true WHERE id = 'machine-photos';

-- Política pública de lectura para machine-photos
DROP POLICY IF EXISTS "Public read machine-photos" ON storage.objects;
CREATE POLICY "Public read machine-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'machine-photos');

-- Limpiar flota actual (cascada: machine_incidents, service_records; SET NULL en tasks/calendar/delivery_notes/tonnage_trucks)
DELETE FROM public.machine_assets;