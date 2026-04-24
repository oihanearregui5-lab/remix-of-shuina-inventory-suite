-- 1. Tasks: add scope (personal/general)
DO $$ BEGIN
  CREATE TYPE public.task_scope AS ENUM ('personal', 'general');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS scope public.task_scope NOT NULL DEFAULT 'personal';

-- Update RLS: workers see general tasks too
DROP POLICY IF EXISTS "Users can view accessible tasks" ON public.tasks;
CREATE POLICY "Users can view accessible tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR scope = 'general'
  OR created_by_user_id = auth.uid()
  OR (assigned_staff_id IS NOT NULL AND can_access_staff_member(assigned_staff_id))
);

-- Only admins can create general-scope tasks
DROP POLICY IF EXISTS "Users can create accessible tasks" ON public.tasks;
CREATE POLICY "Users can create accessible tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND (
    scope = 'personal'
    OR (scope = 'general' AND has_role(auth.uid(), 'admin'::app_role))
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR assigned_staff_id IS NULL
    OR can_access_staff_member(assigned_staff_id)
  )
);

-- 2. Staff directory: add contract fields
ALTER TABLE public.staff_directory
  ADD COLUMN IF NOT EXISTS contract_type text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS weekly_hours numeric,
  ADD COLUMN IF NOT EXISTS position text;

-- 3. Machine attachments table for multiple photos per machine
CREATE TABLE IF NOT EXISTS public.machine_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL,
  storage_path text NOT NULL,
  caption text,
  uploaded_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machine_attachments_machine_id ON public.machine_attachments(machine_id);

ALTER TABLE public.machine_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view machine attachments" ON public.machine_attachments;
CREATE POLICY "Authenticated can view machine attachments"
ON public.machine_attachments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can create machine attachments" ON public.machine_attachments;
CREATE POLICY "Authenticated can create machine attachments"
ON public.machine_attachments FOR INSERT TO authenticated
WITH CHECK (uploaded_by_user_id = auth.uid());

DROP POLICY IF EXISTS "Uploader or admin can delete machine attachments" ON public.machine_attachments;
CREATE POLICY "Uploader or admin can delete machine attachments"
ON public.machine_attachments FOR DELETE TO authenticated
USING (uploaded_by_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));