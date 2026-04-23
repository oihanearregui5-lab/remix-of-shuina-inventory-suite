CREATE VIEW public.staff_directory_public
WITH (security_invoker=on) AS
SELECT id, full_name, linked_user_id, color_tag, staff_kind, is_supervisor, active, sort_order
FROM public.staff_directory
WHERE active = true;

DROP POLICY IF EXISTS "Authenticated users can view staff directory" ON public.staff_directory;
CREATE POLICY "Admins can view full staff directory"
ON public.staff_directory
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own staff record"
ON public.staff_directory
FOR SELECT
TO authenticated
USING (linked_user_id = auth.uid());

CREATE TABLE public.company_calendar_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  day_type TEXT NOT NULL DEFAULT 'workday',
  color_tag TEXT,
  notes TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_calendar_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view company calendar days"
ON public.company_calendar_days
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage company calendar days"
ON public.company_calendar_days
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_company_calendar_days_updated_at
BEFORE UPDATE ON public.company_calendar_days
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.staff_shifts
ADD COLUMN IF NOT EXISTS shift_period TEXT;

ALTER TABLE public.staff_allowances
ADD COLUMN IF NOT EXISTS annual_hours_target NUMERIC NOT NULL DEFAULT 1760;

ALTER TABLE public.machine_assets
ADD COLUMN IF NOT EXISTS provider_name TEXT,
ADD COLUMN IF NOT EXISTS provider_contact TEXT,
ADD COLUMN IF NOT EXISTS provider_notes TEXT,
ADD COLUMN IF NOT EXISTS next_itv_date DATE,
ADD COLUMN IF NOT EXISTS next_inspection_date DATE;

ALTER TABLE public.chat_channels
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'channel',
ADD COLUMN IF NOT EXISTS direct_message_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS chat_channels_direct_message_key_idx
ON public.chat_channels (direct_message_key)
WHERE direct_message_key IS NOT NULL;

CREATE TABLE public.chat_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  membership_role TEXT NOT NULL DEFAULT 'member',
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_chat_channel(_channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_channels cc
    LEFT JOIN public.chat_channel_members ccm ON ccm.channel_id = cc.id
    WHERE cc.id = _channel_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR cc.visibility = 'public'
        OR cc.created_by_user_id = auth.uid()
        OR ccm.user_id = auth.uid()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_chat_channel(_channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_channels cc
    WHERE cc.id = _channel_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR cc.created_by_user_id = auth.uid()
      )
  );
$$;

DROP POLICY IF EXISTS "Authenticated users can view chat channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Admins can manage chat channels" ON public.chat_channels;

CREATE POLICY "Users can view accessible chat channels"
ON public.chat_channels
FOR SELECT
TO authenticated
USING (public.can_access_chat_channel(id));

CREATE POLICY "Users can create chat channels"
ON public.chat_channels
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR visibility <> 'public'
  )
);

CREATE POLICY "Channel managers can update chat channels"
ON public.chat_channels
FOR UPDATE
TO authenticated
USING (public.can_manage_chat_channel(id))
WITH CHECK (public.can_manage_chat_channel(id));

CREATE POLICY "Channel managers can delete chat channels"
ON public.chat_channels
FOR DELETE
TO authenticated
USING (public.can_manage_chat_channel(id));

CREATE POLICY "Users can view accessible chat memberships"
ON public.chat_channel_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.can_manage_chat_channel(channel_id)
);

CREATE POLICY "Channel managers can create memberships"
ON public.chat_channel_members
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND public.can_manage_chat_channel(channel_id)
);

CREATE POLICY "Channel managers can delete memberships"
ON public.chat_channel_members
FOR DELETE
TO authenticated
USING (public.can_manage_chat_channel(channel_id));

DROP POLICY IF EXISTS "Authenticated users can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can create chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authors or admins can update chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authors or admins can delete chat messages" ON public.chat_messages;

CREATE POLICY "Users can view accessible chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (public.can_access_chat_channel(channel_id));

CREATE POLICY "Users can create accessible chat messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND public.can_access_chat_channel(channel_id)
);

CREATE POLICY "Authors or admins can update accessible chat messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING ((author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) AND public.can_access_chat_channel(channel_id))
WITH CHECK ((author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) AND public.can_access_chat_channel(channel_id));

CREATE POLICY "Authors or admins can delete accessible chat messages"
ON public.chat_messages
FOR DELETE
TO authenticated
USING ((author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) AND public.can_access_chat_channel(channel_id));