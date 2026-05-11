-- 1) Chat: ampliar chat_messages para soportar audios y otros tipos
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_type_check;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_type_check CHECK (type IN ('text','audio','image'));

-- Permitir mensajes vacíos cuando llevan audio adjunto
ALTER TABLE public.chat_messages
  ALTER COLUMN message DROP NOT NULL;
ALTER TABLE public.chat_messages
  ALTER COLUMN message SET DEFAULT '';

-- 2) Bucket privado chat-audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-audio', 'chat-audio', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload chat audio" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-audio');

DROP POLICY IF EXISTS "Authenticated users can read chat audio" ON storage.objects;
CREATE POLICY "Authenticated users can read chat audio"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-audio');

DROP POLICY IF EXISTS "Authenticated users can delete own chat audio" ON storage.objects;
CREATE POLICY "Authenticated users can delete own chat audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-audio' AND owner = auth.uid());

-- 3) Compañeros en partes
CREATE TABLE IF NOT EXISTS public.work_report_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_report_id uuid NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(work_report_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wrp_report ON public.work_report_participants(work_report_id);
CREATE INDEX IF NOT EXISTS idx_wrp_user ON public.work_report_participants(user_id);

ALTER TABLE public.work_report_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own or admin work_report_participants" ON public.work_report_participants;
CREATE POLICY "View own or admin work_report_participants"
ON public.work_report_participants FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(),'admin'::app_role)
  OR has_role(auth.uid(),'secretary'::app_role)
  OR EXISTS (SELECT 1 FROM public.work_reports wr WHERE wr.id = work_report_id AND wr.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Manage own work_report_participants" ON public.work_report_participants;
CREATE POLICY "Manage own work_report_participants"
ON public.work_report_participants FOR ALL TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role)
  OR has_role(auth.uid(),'secretary'::app_role)
  OR EXISTS (SELECT 1 FROM public.work_reports wr WHERE wr.id = work_report_id AND wr.user_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(),'admin'::app_role)
  OR has_role(auth.uid(),'secretary'::app_role)
  OR EXISTS (SELECT 1 FROM public.work_reports wr WHERE wr.id = work_report_id AND wr.user_id = auth.uid())
);

-- 4) Otros trabajos diarios (limpieza + fosos)
CREATE TABLE IF NOT EXISTS public.daily_other_work (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  work_date date NOT NULL,
  work_type text NOT NULL CHECK (work_type IN ('limpieza','foso_a','foso_b','foso_c','foso_d')),
  hours integer NOT NULL DEFAULT 0,
  minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, work_date, work_type)
);

CREATE INDEX IF NOT EXISTS idx_dow_user_date ON public.daily_other_work(user_id, work_date);

ALTER TABLE public.daily_other_work ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manage own daily_other_work" ON public.daily_other_work;
CREATE POLICY "Manage own daily_other_work"
ON public.daily_other_work FOR ALL TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'secretary'::app_role))
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'secretary'::app_role));

DROP TRIGGER IF EXISTS daily_other_work_updated_at ON public.daily_other_work;
CREATE TRIGGER daily_other_work_updated_at
  BEFORE UPDATE ON public.daily_other_work
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Auditoría de ediciones de fichaje
CREATE TABLE IF NOT EXISTS public.clock_in_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid REFERENCES public.time_entries(id) ON DELETE CASCADE,
  edited_by uuid,
  edited_at timestamptz NOT NULL DEFAULT now(),
  old_check_in timestamptz,
  new_check_in timestamptz,
  old_check_out timestamptz,
  new_check_out timestamptz,
  reason text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clock_in_edits_entry ON public.clock_in_edits(time_entry_id);

ALTER TABLE public.clock_in_edits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view clock_in_edits" ON public.clock_in_edits;
CREATE POLICY "Admins view clock_in_edits"
ON public.clock_in_edits FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'secretary'::app_role));

DROP POLICY IF EXISTS "Admins create clock_in_edits" ON public.clock_in_edits;
CREATE POLICY "Admins create clock_in_edits"
ON public.clock_in_edits FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'secretary'::app_role));