-- Tabla read state para canales de chat
CREATE TABLE IF NOT EXISTS public.chat_read_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

ALTER TABLE public.chat_read_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own read state" ON public.chat_read_state;
CREATE POLICY "Users see own read state"
  ON public.chat_read_state FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Marcar canal como leído
CREATE OR REPLACE FUNCTION public.mark_channel_read(p_channel_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.chat_read_state (user_id, channel_id, last_read_at)
  VALUES (auth.uid(), p_channel_id, now())
  ON CONFLICT (user_id, channel_id) DO UPDATE SET last_read_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_channel_read(UUID) TO authenticated;

-- Contar mensajes no leídos del usuario actual
CREATE OR REPLACE FUNCTION public.count_unread_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  total INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;
  SELECT COUNT(*)::INTEGER INTO total
  FROM public.chat_messages m
  JOIN public.chat_channel_members cm
    ON cm.channel_id = m.channel_id AND cm.user_id = auth.uid()
  LEFT JOIN public.chat_read_state rs
    ON rs.channel_id = m.channel_id AND rs.user_id = auth.uid()
  WHERE m.author_user_id <> auth.uid()
    AND (rs.last_read_at IS NULL OR m.created_at > rs.last_read_at);
  RETURN COALESCE(total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_unread_messages() TO authenticated;

-- Contar tareas pendientes asignadas al usuario actual
CREATE OR REPLACE FUNCTION public.count_pending_tasks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  total INTEGER;
  v_staff_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  SELECT id INTO v_staff_id
  FROM public.staff_directory
  WHERE linked_user_id = auth.uid()
  LIMIT 1;

  IF v_staff_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::INTEGER INTO total
  FROM public.tasks
  WHERE assigned_staff_id = v_staff_id
    AND status IN ('planned', 'in_progress');

  RETURN COALESCE(total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_pending_tasks() TO authenticated;