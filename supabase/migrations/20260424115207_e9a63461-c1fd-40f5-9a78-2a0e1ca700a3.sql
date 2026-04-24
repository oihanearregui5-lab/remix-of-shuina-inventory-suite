-- ============================================================
-- Tabla de notificaciones
-- ============================================================
CREATE TYPE public.notification_kind AS ENUM (
  'task_assigned',
  'chat_message',
  'vacation_response',
  'machine_incident',
  'work_report',
  'delivery_note'
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind public.notification_kind NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- No INSERT policy: solo los triggers (SECURITY DEFINER) crean notificaciones.

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- Helper: crear notificación
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _kind public.notification_kind,
  _title TEXT,
  _body TEXT,
  _link TEXT,
  _related_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.notifications (user_id, kind, title, body, link, related_id)
  VALUES (_user_id, _kind, _title, _body, _link, _related_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================
-- TRIGGER: tarea asignada / reasignada
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user UUID;
  v_assigner_name TEXT;
BEGIN
  IF NEW.assigned_staff_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.assigned_staff_id IS NOT DISTINCT FROM NEW.assigned_staff_id THEN
    RETURN NEW;
  END IF;

  SELECT linked_user_id INTO v_target_user
  FROM public.staff_directory
  WHERE id = NEW.assigned_staff_id;

  IF v_target_user IS NULL OR v_target_user = NEW.created_by_user_id THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_assigner_name
  FROM public.profiles
  WHERE user_id = NEW.created_by_user_id;

  PERFORM public.create_notification(
    v_target_user,
    'task_assigned',
    'Nueva tarea asignada',
    COALESCE(v_assigner_name, 'Un compañero') || ' te ha asignado: ' || NEW.title,
    'tasks',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_task_assignment
AFTER INSERT OR UPDATE OF assigned_staff_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();

-- ============================================================
-- TRIGGER: mensaje de chat
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel RECORD;
  v_author_name TEXT;
  v_member RECORD;
  v_preview TEXT;
BEGIN
  SELECT id, name, kind, visibility INTO v_channel
  FROM public.chat_channels WHERE id = NEW.channel_id;

  IF v_channel.id IS NULL THEN RETURN NEW; END IF;

  SELECT full_name INTO v_author_name
  FROM public.profiles WHERE user_id = NEW.author_user_id;

  v_preview := LEFT(NEW.message, 120);

  -- Para canales privados / DM / grupos: notificar miembros explícitos
  IF v_channel.kind IN ('direct', 'group') OR v_channel.visibility = 'private' THEN
    FOR v_member IN
      SELECT user_id FROM public.chat_channel_members
      WHERE channel_id = NEW.channel_id AND user_id <> NEW.author_user_id
    LOOP
      PERFORM public.create_notification(
        v_member.user_id,
        'chat_message',
        COALESCE(v_author_name, 'Mensaje nuevo') ||
          CASE WHEN v_channel.kind = 'direct' THEN '' ELSE ' · ' || v_channel.name END,
        v_preview,
        'chat',
        NEW.channel_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_chat_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_chat_message();

-- ============================================================
-- TRIGGER: respuesta a solicitud de vacaciones
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_vacation_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('approved', 'rejected') THEN RETURN NEW; END IF;
  IF NEW.requester_user_id IS NULL THEN RETURN NEW; END IF;

  v_title := CASE NEW.status
    WHEN 'approved' THEN 'Vacaciones aprobadas'
    WHEN 'rejected' THEN 'Vacaciones rechazadas'
  END;

  PERFORM public.create_notification(
    NEW.requester_user_id,
    'vacation_response',
    v_title,
    'Del ' || to_char(NEW.start_date, 'DD/MM/YYYY') || ' al ' || to_char(NEW.end_date, 'DD/MM/YYYY') ||
      COALESCE(' · ' || NEW.admin_response, ''),
    'staff',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_vacation_response
AFTER UPDATE OF status ON public.vacation_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_vacation_response();

-- ============================================================
-- TRIGGER: nueva incidencia de máquina → avisar a todos los admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_machine_incident()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
  v_machine_name TEXT;
BEGIN
  SELECT display_name INTO v_machine_name
  FROM public.machine_assets WHERE id = NEW.machine_id;

  FOR v_admin IN
    SELECT DISTINCT user_id FROM public.user_roles
    WHERE role IN ('admin', 'secretary')
      AND user_id <> NEW.reported_by_user_id
  LOOP
    PERFORM public.create_notification(
      v_admin.user_id,
      'machine_incident',
      'Nueva incidencia: ' || COALESCE(v_machine_name, 'máquina'),
      NEW.title,
      'machines',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_machine_incident
AFTER INSERT ON public.machine_incidents
FOR EACH ROW EXECUTE FUNCTION public.notify_machine_incident();