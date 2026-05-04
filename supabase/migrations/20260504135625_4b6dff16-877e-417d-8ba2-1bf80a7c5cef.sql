-- Quitar policies actuales de tasks (basadas en rol admin)
DROP POLICY IF EXISTS "Users can view accessible tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update accessible tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete created tasks or admins" ON public.tasks;
DROP POLICY IF EXISTS "Users can create accessible tasks" ON public.tasks;

-- Helper: ¿el auth.uid() actual está vinculado a este staff_directory.id?
-- Usamos comparación directa contra staff_directory.linked_user_id
-- (assigned_staff_id en tasks referencia public.staff_directory.id).

-- SELECT: solo creador o asignado
CREATE POLICY "Tasks: creator or assignee can view"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  created_by_user_id = auth.uid()
  OR (
    assigned_staff_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.staff_directory sd
      WHERE sd.id = tasks.assigned_staff_id
        AND sd.linked_user_id = auth.uid()
    )
  )
);

-- INSERT: cualquier usuario autenticado puede crear su propia tarea.
-- El creador debe ser el propio usuario. Si asigna a otra persona,
-- debe ser él mismo (se autoasigna) o dejarlo sin asignar.
CREATE POLICY "Tasks: users can create own tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
);

-- UPDATE: solo creador o asignado
CREATE POLICY "Tasks: creator or assignee can update"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  created_by_user_id = auth.uid()
  OR (
    assigned_staff_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.staff_directory sd
      WHERE sd.id = tasks.assigned_staff_id
        AND sd.linked_user_id = auth.uid()
    )
  )
)
WITH CHECK (
  created_by_user_id = auth.uid()
  OR (
    assigned_staff_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.staff_directory sd
      WHERE sd.id = tasks.assigned_staff_id
        AND sd.linked_user_id = auth.uid()
    )
  )
);

-- DELETE: solo creador o asignado
CREATE POLICY "Tasks: creator or assignee can delete"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  created_by_user_id = auth.uid()
  OR (
    assigned_staff_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.staff_directory sd
      WHERE sd.id = tasks.assigned_staff_id
        AND sd.linked_user_id = auth.uid()
    )
  )
);