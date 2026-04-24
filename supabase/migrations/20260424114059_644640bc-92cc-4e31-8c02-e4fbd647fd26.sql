-- Estado de albarán
DO $$ BEGIN
  CREATE TYPE public.delivery_note_status AS ENUM ('pending', 'validated', 'incident', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tabla principal
CREATE TABLE IF NOT EXISTS public.delivery_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_number TEXT NOT NULL,
  customer TEXT NOT NULL,
  route TEXT,
  driver_staff_id UUID REFERENCES public.staff_directory(id) ON DELETE SET NULL,
  driver_name TEXT,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC,
  status public.delivery_note_status NOT NULL DEFAULT 'pending',
  observations TEXT,
  pdf_storage_path TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON public.delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_delivery_date ON public.delivery_notes(delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_customer ON public.delivery_notes(customer);

ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;

-- Solo admin y secretary
CREATE POLICY "Admin/secretary can view delivery notes"
  ON public.delivery_notes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE POLICY "Admin/secretary can create delivery notes"
  ON public.delivery_notes FOR INSERT TO authenticated
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
  );

CREATE POLICY "Admin/secretary can update delivery notes"
  ON public.delivery_notes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE POLICY "Admin/secretary can delete delivery notes"
  ON public.delivery_notes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE TRIGGER update_delivery_notes_updated_at
  BEFORE UPDATE ON public.delivery_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket privado para PDFs de albaranes
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-notes', 'delivery-notes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: solo admin/secretary
CREATE POLICY "Admin/secretary can read delivery note files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'delivery-notes'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
  );

CREATE POLICY "Admin/secretary can upload delivery note files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'delivery-notes'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
  );

CREATE POLICY "Admin/secretary can update delivery note files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'delivery-notes'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
  );

CREATE POLICY "Admin/secretary can delete delivery note files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'delivery-notes'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
  );