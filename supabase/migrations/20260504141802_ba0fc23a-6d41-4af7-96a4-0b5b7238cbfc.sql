
-- =========================================================
-- TASKS: Multi-asignación (individual/grupo/all) + privacidad mixta
-- =========================================================

-- 1. Nueva columna assignment_mode en tasks
DO $$ BEGIN
  CREATE TYPE public.task_assignment_mode AS ENUM ('individual', 'group', 'all');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assignment_mode public.task_assignment_mode NOT NULL DEFAULT 'individual';

-- 2. Tabla task_assignments (asignados explícitos)
CREATE TABLE IF NOT EXISTS public.task_assignments (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_directory(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_staff ON public.task_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON public.task_assignments(task_id);

ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- 3. Migrar datos: cada tasks.assigned_staff_id => task_assignments
INSERT INTO public.task_assignments (task_id, staff_id)
SELECT t.id, t.assigned_staff_id
FROM public.tasks t
WHERE t.assigned_staff_id IS NOT NULL
ON CONFLICT (task_id, staff_id) DO NOTHING;

-- 4. Función helper de privacidad
CREATE OR REPLACE FUNCTION public.is_task_private(_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
  v_creator_is_admin boolean;
  v_assignee_count int;
  v_creator_in_assignees boolean;
  v_all_admin boolean;
BEGIN
  SELECT created_by_user_id INTO v_creator FROM public.tasks WHERE id = _task_id;
  IF v_creator IS NULL THEN RETURN false; END IF;

  SELECT public.has_role(v_creator, 'admin'::app_role) INTO v_creator_is_admin;
  IF NOT v_creator_is_admin THEN RETURN false; END IF;

  SELECT COUNT(*) INTO v_assignee_count FROM public.task_assignments WHERE task_id = _task_id;
  IF v_assignee_count = 0 THEN RETURN false; END IF;

  -- creador entre los asignados (vía staff_directory.linked_user_id)
  SELECT EXISTS (
    SELECT 1 FROM public.task_assignments ta
    JOIN public.staff_directory sd ON sd.id = ta.staff_id
    WHERE ta.task_id = _task_id AND sd.linked_user_id = v_creator
  ) INTO v_creator_in_assignees;
  IF NOT v_creator_in_assignees THEN RETURN false; END IF;

  -- todos los asignados son admin
  SELECT NOT EXISTS (
    SELECT 1 FROM public.task_assignments ta
    JOIN public.staff_directory sd ON sd.id = ta.staff_id
    WHERE ta.task_id = _task_id
      AND (sd.linked_user_id IS NULL OR NOT public.has_role(sd.linked_user_id, 'admin'::app_role))
  ) INTO v_all_admin;

  RETURN v_all_admin;
END;
$$;

-- 5. Reemplazar can_access_task con la nueva regla
CREATE OR REPLACE FUNCTION public.can_access_task(_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
  v_mode public.task_assignment_mode;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT created_by_user_id, assignment_mode INTO v_creator, v_mode FROM public.tasks WHERE id = _task_id;
  IF v_creator IS NULL THEN RETURN false; END IF;

  IF v_creator = v_uid THEN RETURN true; END IF;

  IF EXISTS (
    SELECT 1 FROM public.task_assignments ta
    JOIN public.staff_directory sd ON sd.id = ta.staff_id
    WHERE ta.task_id = _task_id AND sd.linked_user_id = v_uid
  ) THEN RETURN true; END IF;

  IF v_mode = 'all' THEN RETURN true; END IF;

  IF public.has_role(v_uid, 'admin'::app_role) AND NOT public.is_task_private(_task_id) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 6. RLS de tasks: borrar todas las policies y crear nuevas
DROP POLICY IF EXISTS "Tasks: creator or assignee can view" ON public.tasks;
DROP POLICY IF EXISTS "Tasks: creator or assignee can update" ON public.tasks;
DROP POLICY IF EXISTS "Tasks: creator or assignee can delete" ON public.tasks;
DROP POLICY IF EXISTS "Tasks: users can create own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks they have access to" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks they have access to" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks they created or admins" ON public.tasks;

CREATE POLICY "tasks_select" ON public.tasks
FOR SELECT TO authenticated
USING (
  created_by_user_id = auth.uid()
  OR assignment_mode = 'all'
  OR EXISTS (
    SELECT 1 FROM public.task_assignments ta
    JOIN public.staff_directory sd ON sd.id = ta.staff_id
    WHERE ta.task_id = tasks.id AND sd.linked_user_id = auth.uid()
  )
  OR (public.has_role(auth.uid(), 'admin'::app_role) AND NOT public.is_task_private(tasks.id))
);

CREATE POLICY "tasks_insert" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND created_by_user_id = auth.uid()
);

CREATE POLICY "tasks_update" ON public.tasks
FOR UPDATE TO authenticated
USING (
  created_by_user_id = auth.uid()
  OR (public.has_role(auth.uid(), 'admin'::app_role) AND NOT public.is_task_private(tasks.id))
)
WITH CHECK (
  created_by_user_id = auth.uid()
  OR (public.has_role(auth.uid(), 'admin'::app_role) AND NOT public.is_task_private(tasks.id))
);

CREATE POLICY "tasks_delete" ON public.tasks
FOR DELETE TO authenticated
USING (
  created_by_user_id = auth.uid()
  OR (public.has_role(auth.uid(), 'admin'::app_role) AND NOT public.is_task_private(tasks.id))
);

-- 7. RLS de task_assignments
DROP POLICY IF EXISTS "task_assignments_select" ON public.task_assignments;
DROP POLICY IF EXISTS "task_assignments_insert" ON public.task_assignments;
DROP POLICY IF EXISTS "task_assignments_update" ON public.task_assignments;
DROP POLICY IF EXISTS "task_assignments_delete" ON public.task_assignments;

CREATE POLICY "task_assignments_select" ON public.task_assignments
FOR SELECT TO authenticated
USING (public.can_access_task(task_id));

CREATE POLICY "task_assignments_insert" ON public.task_assignments
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "task_assignments_update" ON public.task_assignments
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.staff_directory sd
    WHERE sd.id = task_assignments.staff_id AND sd.linked_user_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.staff_directory sd
    WHERE sd.id = task_assignments.staff_id AND sd.linked_user_id = auth.uid()
  )
);

CREATE POLICY "task_assignments_delete" ON public.task_assignments
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 8. Backfill assignment_mode para tareas existentes con scope general
UPDATE public.tasks SET assignment_mode = 'all' WHERE scope = 'general';
