CREATE TABLE IF NOT EXISTS public.machine_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL,
  author_user_id UUID NOT NULL,
  note TEXT NOT NULL,
  is_highlight BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.machine_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view machine notes"
ON public.machine_notes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create machine notes"
ON public.machine_notes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_user_id);

CREATE POLICY "Authors or admins can update machine notes"
ON public.machine_notes
FOR UPDATE
TO authenticated
USING (auth.uid() = author_user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = author_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authors or admins can delete machine notes"
ON public.machine_notes
FOR DELETE
TO authenticated
USING (auth.uid() = author_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_machine_notes_updated_at
BEFORE UPDATE ON public.machine_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.vacation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID NOT NULL,
  staff_member_id UUID,
  request_type TEXT NOT NULL DEFAULT 'vacation',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  admin_response TEXT,
  reviewed_by_user_id UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vacation requests or admins"
ON public.vacation_requests
FOR SELECT
TO authenticated
USING (
  requester_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR (staff_member_id IS NOT NULL AND public.can_access_staff_member(staff_member_id))
);

CREATE POLICY "Users can create own vacation requests"
ON public.vacation_requests
FOR INSERT
TO authenticated
WITH CHECK (
  requester_user_id = auth.uid()
  AND (
    staff_member_id IS NULL
    OR public.can_access_staff_member(staff_member_id)
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can update own pending vacation requests or admins"
ON public.vacation_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (requester_user_id = auth.uid() AND status = 'pending')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (requester_user_id = auth.uid() AND status = 'pending')
);

CREATE POLICY "Users can delete own pending vacation requests or admins"
ON public.vacation_requests
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (requester_user_id = auth.uid() AND status = 'pending')
);

CREATE TRIGGER update_vacation_requests_updated_at
BEFORE UPDATE ON public.vacation_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id UUID NOT NULL,
  shift_date DATE NOT NULL,
  shift_label TEXT NOT NULL,
  starts_at TIME,
  ends_at TIME,
  location TEXT,
  notes TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_member_id, shift_date)
);

ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shifts or admins"
ON public.staff_shifts
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.can_access_staff_member(staff_member_id)
);

CREATE POLICY "Admins can create staff shifts"
ON public.staff_shifts
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by_user_id = auth.uid());

CREATE POLICY "Admins can update staff shifts"
ON public.staff_shifts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete staff shifts"
ON public.staff_shifts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_staff_shifts_updated_at
BEFORE UPDATE ON public.staff_shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view chat channels"
ON public.chat_channels
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage chat channels"
ON public.chat_channels
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_chat_channels_updated_at
BEFORE UPDATE ON public.chat_channels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  author_user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create chat messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (author_user_id = auth.uid());

CREATE POLICY "Authors or admins can update chat messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authors or admins can delete chat messages"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.daily_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  highlight_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'general',
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view daily highlights"
ON public.daily_highlights
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage daily highlights"
ON public.daily_highlights
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_daily_highlights_updated_at
BEFORE UPDATE ON public.daily_highlights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

INSERT INTO public.chat_channels (slug, name, description, created_by_user_id)
SELECT 'general', 'General', 'Avisos y coordinación general de la empresa', user_id
FROM public.profiles
ORDER BY created_at
LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.chat_channels (slug, name, description, created_by_user_id)
SELECT 'obras', 'Obras', 'Coordinación operativa y trabajos en curso', user_id
FROM public.profiles
ORDER BY created_at
LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.chat_channels (slug, name, description, created_by_user_id)
SELECT 'maquinaria', 'Maquinaria', 'Incidencias, mantenimientos y observaciones de equipos', user_id
FROM public.profiles
ORDER BY created_at
LIMIT 1
ON CONFLICT (slug) DO NOTHING;