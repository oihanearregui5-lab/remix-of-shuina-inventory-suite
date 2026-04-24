-- ============================================================
-- 1) RESET DE DATOS DE PRUEBA (conserva estructura)
-- ============================================================
TRUNCATE TABLE
  public.chat_messages,
  public.task_checklists,
  public.tasks,
  public.time_entries,
  public.work_reports,
  public.machine_notes,
  public.machine_incidents,
  public.machine_service_records,
  public.daily_highlights,
  public.vacation_requests,
  public.personal_notes,
  public.calendar_events,
  public.staff_events,
  public.staff_shifts
RESTART IDENTITY CASCADE;

-- ============================================================
-- 2) BUCKET DE FOTOS DE MÁQUINAS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('machine-photos', 'machine-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas (drop si existen para idempotencia)
DROP POLICY IF EXISTS "Authenticated users can view machine photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload machine photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update machine photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete machine photos" ON storage.objects;

CREATE POLICY "Authenticated users can view machine photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'machine-photos');

CREATE POLICY "Authenticated users can upload machine photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'machine-photos');

CREATE POLICY "Authenticated users can update machine photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'machine-photos')
WITH CHECK (bucket_id = 'machine-photos');

CREATE POLICY "Admins can delete machine photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'machine-photos' AND public.has_role(auth.uid(), 'admin'));