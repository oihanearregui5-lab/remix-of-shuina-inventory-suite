-- WORK_REPORT_PHOTOS
CREATE TABLE IF NOT EXISTS public.work_report_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_report_id UUID NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by_user_id UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_report_photos_report ON public.work_report_photos (work_report_id);
CREATE INDEX IF NOT EXISTS idx_work_report_photos_uploader ON public.work_report_photos (uploaded_by_user_id);

ALTER TABLE public.work_report_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View report photos"
ON public.work_report_photos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_reports wr
    WHERE wr.id = work_report_id
      AND (wr.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'admin')
           OR public.has_role(auth.uid(), 'secretary'))
  )
);

CREATE POLICY "Insert own report photos"
ON public.work_report_photos FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.work_reports wr
    WHERE wr.id = work_report_id
      AND (wr.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'admin')
           OR public.has_role(auth.uid(), 'secretary'))
  )
);

CREATE POLICY "Delete own report photos"
ON public.work_report_photos FOR DELETE
TO authenticated
USING (
  uploaded_by_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.work_reports wr
    WHERE wr.id = work_report_id
      AND (wr.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'admin')
           OR public.has_role(auth.uid(), 'secretary'))
  )
);

-- STORAGE bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-report-photos', 'work-report-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users read work-report-photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'work-report-photos');

CREATE POLICY "Auth users upload work-report-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'work-report-photos');

CREATE POLICY "Auth users delete work-report-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'work-report-photos');