-- Tutorial videos table
CREATE TABLE public.tutorial_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.tutorial_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tutorial videos"
  ON public.tutorial_videos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert tutorial videos"
  ON public.tutorial_videos FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND uploaded_by = auth.uid());

CREATE POLICY "Admins can update tutorial videos"
  ON public.tutorial_videos FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tutorial videos"
  ON public.tutorial_videos FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger: when a new active video is inserted, deactivate previous ones
CREATE OR REPLACE FUNCTION public.deactivate_previous_tutorial_videos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.tutorial_videos
      SET is_active = false
      WHERE id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deactivate_previous_tutorial_videos
AFTER INSERT ON public.tutorial_videos
FOR EACH ROW EXECUTE FUNCTION public.deactivate_previous_tutorial_videos();

-- Storage bucket (private, 200 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tutorial-videos',
  'tutorial-videos',
  false,
  209715200,
  ARRAY['video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  public = false;

CREATE POLICY "Authenticated can read tutorial video files"
  ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'tutorial-videos');

CREATE POLICY "Admins can upload tutorial video files"
  ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'tutorial-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tutorial video files"
  ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'tutorial-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tutorial video files"
  ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'tutorial-videos' AND has_role(auth.uid(), 'admin'::app_role));