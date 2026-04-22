CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique_idx ON public.profiles (user_id);

CREATE OR REPLACE FUNCTION public.ensure_current_user_setup(_full_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_name text := NULLIF(BTRIM(_full_name), '');
  v_default_name text := COALESCE(v_name, SPLIT_PART(COALESCE(auth.jwt() ->> 'email', 'Usuario'), '@', 1), 'Usuario');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (v_user_id, v_default_name)
  ON CONFLICT (user_id)
  DO UPDATE SET
    full_name = CASE
      WHEN EXCLUDED.full_name IS NOT NULL AND EXCLUDED.full_name <> '' THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    updated_at = now();

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'worker'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'worker');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'admin'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin');
  END IF;
END;
$$;

CREATE TYPE public.staff_kind AS ENUM ('worker', 'manager', 'admin_support');
CREATE TYPE public.task_status AS ENUM ('planned', 'in_progress', 'blocked', 'completed', 'cancelled');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.calendar_event_type AS ENUM ('task_deadline', 'workday', 'leave', 'training', 'medical_review', 'course', 'meeting', 'itv', 'maintenance', 'personal');
CREATE TYPE public.machine_status AS ENUM ('active', 'maintenance', 'repair', 'inspection', 'inactive');
CREATE TYPE public.machine_service_type AS ENUM ('maintenance', 'inspection', 'itv', 'oil_hydraulic', 'oil_engine', 'coolant', 'general_check');
CREATE TYPE public.machine_issue_horizon AS ENUM ('short_term', 'medium_term', 'long_term');
CREATE TYPE public.machine_issue_status AS ENUM ('open', 'monitoring', 'resolved');
CREATE TYPE public.staff_event_type AS ENUM ('completed_work', 'pending_work', 'leave', 'work_calendar', 'medical_review', 'training', 'course', 'note');
CREATE TYPE public.staff_event_status AS ENUM ('planned', 'active', 'completed', 'cancelled');

CREATE TABLE public.staff_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  staff_kind public.staff_kind NOT NULL DEFAULT 'worker',
  linked_user_id uuid UNIQUE,
  active boolean NOT NULL DEFAULT true,
  phone text,
  notes text,
  color_tag text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.machine_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  asset_code text,
  license_plate text,
  asset_family text NOT NULL,
  status public.machine_status NOT NULL DEFAULT 'active',
  photo_url text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status public.task_status NOT NULL DEFAULT 'planned',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  category text,
  start_date date,
  due_date date,
  reminder_at timestamp with time zone,
  completed_at timestamp with time zone,
  is_all_day boolean NOT NULL DEFAULT true,
  created_by_user_id uuid NOT NULL,
  assigned_staff_id uuid REFERENCES public.staff_directory(id) ON DELETE SET NULL,
  related_machine_id uuid REFERENCES public.machine_assets(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.task_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type public.calendar_event_type NOT NULL DEFAULT 'meeting',
  start_at timestamp with time zone NOT NULL,
  end_at timestamp with time zone,
  all_day boolean NOT NULL DEFAULT true,
  staff_member_id uuid REFERENCES public.staff_directory(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  machine_id uuid REFERENCES public.machine_assets(id) ON DELETE SET NULL,
  created_by_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.machine_service_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machine_assets(id) ON DELETE CASCADE,
  service_type public.machine_service_type NOT NULL,
  title text NOT NULL,
  notes text,
  due_date date,
  completed_at timestamp with time zone,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'planned',
  meter_hours numeric,
  assigned_staff_id uuid REFERENCES public.staff_directory(id) ON DELETE SET NULL,
  created_by_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.machine_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machine_assets(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  horizon public.machine_issue_horizon NOT NULL DEFAULT 'short_term',
  status public.machine_issue_status NOT NULL DEFAULT 'open',
  reported_by_user_id uuid NOT NULL,
  assigned_staff_id uuid REFERENCES public.staff_directory(id) ON DELETE SET NULL,
  due_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.staff_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid NOT NULL REFERENCES public.staff_directory(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type public.staff_event_type NOT NULL,
  status public.staff_event_status NOT NULL DEFAULT 'planned',
  start_date date,
  end_date date,
  created_by_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_directory_linked_user_id ON public.staff_directory(linked_user_id);
CREATE INDEX idx_staff_directory_staff_kind ON public.staff_directory(staff_kind);
CREATE INDEX idx_machine_assets_status ON public.machine_assets(status);
CREATE INDEX idx_tasks_assigned_staff_id ON public.tasks(assigned_staff_id);
CREATE INDEX idx_tasks_related_machine_id ON public.tasks(related_machine_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_status_priority ON public.tasks(status, priority);
CREATE INDEX idx_task_checklists_task_id ON public.task_checklists(task_id);
CREATE INDEX idx_calendar_events_staff_member_id ON public.calendar_events(staff_member_id);
CREATE INDEX idx_calendar_events_machine_id ON public.calendar_events(machine_id);
CREATE INDEX idx_calendar_events_start_at ON public.calendar_events(start_at);
CREATE INDEX idx_machine_service_records_machine_id ON public.machine_service_records(machine_id);
CREATE INDEX idx_machine_service_records_due_date ON public.machine_service_records(due_date);
CREATE INDEX idx_machine_incidents_machine_id ON public.machine_incidents(machine_id);
CREATE INDEX idx_machine_incidents_status ON public.machine_incidents(status);
CREATE INDEX idx_staff_events_staff_member_id ON public.staff_events(staff_member_id);
CREATE INDEX idx_staff_events_event_type ON public.staff_events(event_type);

CREATE OR REPLACE FUNCTION public.can_access_staff_member(_staff_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_directory sd
    WHERE sd.id = _staff_member_id
      AND (sd.linked_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_task(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    LEFT JOIN public.staff_directory sd ON sd.id = t.assigned_staff_id
    WHERE t.id = _task_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR t.created_by_user_id = auth.uid()
        OR sd.linked_user_id = auth.uid()
      )
  );
$$;

ALTER TABLE public.staff_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view staff directory"
ON public.staff_directory
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage staff directory"
ON public.staff_directory
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view machine assets"
ON public.machine_assets
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage machine assets"
ON public.machine_assets
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view accessible tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by_user_id = auth.uid()
  OR (assigned_staff_id IS NOT NULL AND public.can_access_staff_member(assigned_staff_id))
);

CREATE POLICY "Users can create accessible tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR assigned_staff_id IS NULL
    OR public.can_access_staff_member(assigned_staff_id)
  )
);

CREATE POLICY "Users can update accessible tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by_user_id = auth.uid()
  OR (assigned_staff_id IS NOT NULL AND public.can_access_staff_member(assigned_staff_id))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR created_by_user_id = auth.uid()
  OR (assigned_staff_id IS NOT NULL AND public.can_access_staff_member(assigned_staff_id))
);

CREATE POLICY "Users can delete created tasks or admins"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by_user_id = auth.uid()
);

CREATE POLICY "Users can view checklists for accessible tasks"
ON public.task_checklists
FOR SELECT
TO authenticated
USING (public.can_access_task(task_id));

CREATE POLICY "Users can create checklists for accessible tasks"
ON public.task_checklists
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_task(task_id));

CREATE POLICY "Users can update checklists for accessible tasks"
ON public.task_checklists
FOR UPDATE
TO authenticated
USING (public.can_access_task(task_id))
WITH CHECK (public.can_access_task(task_id));

CREATE POLICY "Users can delete checklists for accessible tasks"
ON public.task_checklists
FOR DELETE
TO authenticated
USING (public.can_access_task(task_id));

CREATE POLICY "Users can view relevant calendar events"
ON public.calendar_events
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by_user_id = auth.uid()
  OR staff_member_id IS NULL
  OR public.can_access_staff_member(staff_member_id)
);

CREATE POLICY "Users can create relevant calendar events"
ON public.calendar_events
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR staff_member_id IS NULL
    OR public.can_access_staff_member(staff_member_id)
  )
);

CREATE POLICY "Users can update relevant calendar events"
ON public.calendar_events
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by_user_id = auth.uid()
  OR (staff_member_id IS NOT NULL AND public.can_access_staff_member(staff_member_id))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR created_by_user_id = auth.uid()
  OR (staff_member_id IS NOT NULL AND public.can_access_staff_member(staff_member_id))
);

CREATE POLICY "Users can delete own calendar events or admins"
ON public.calendar_events
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by_user_id = auth.uid()
);

CREATE POLICY "Authenticated users can view machine service records"
ON public.machine_service_records
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create machine service records"
ON public.machine_service_records
FOR INSERT
TO authenticated
WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Creators or admins can update machine service records"
ON public.machine_service_records
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by_user_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR created_by_user_id = auth.uid()
);

CREATE POLICY "Admins can delete machine service records"
ON public.machine_service_records
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view machine incidents"
ON public.machine_incidents
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create machine incidents"
ON public.machine_incidents
FOR INSERT
TO authenticated
WITH CHECK (reported_by_user_id = auth.uid());

CREATE POLICY "Reporters or admins can update machine incidents"
ON public.machine_incidents
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR reported_by_user_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR reported_by_user_id = auth.uid()
);

CREATE POLICY "Admins can delete machine incidents"
ON public.machine_incidents
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own or admin staff events"
ON public.staff_events
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.can_access_staff_member(staff_member_id)
);

CREATE POLICY "Users can create own or admin staff events"
ON public.staff_events
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.can_access_staff_member(staff_member_id)
  )
);

CREATE POLICY "Users can update own or admin staff events"
ON public.staff_events
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.can_access_staff_member(staff_member_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.can_access_staff_member(staff_member_id)
);

CREATE POLICY "Admins can delete staff events"
ON public.staff_events
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_staff_directory_updated_at
BEFORE UPDATE ON public.staff_directory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machine_assets_updated_at
BEFORE UPDATE ON public.machine_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_checklists_updated_at
BEFORE UPDATE ON public.task_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machine_service_records_updated_at
BEFORE UPDATE ON public.machine_service_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machine_incidents_updated_at
BEFORE UPDATE ON public.machine_incidents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_events_updated_at
BEFORE UPDATE ON public.staff_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();