DROP POLICY IF EXISTS "Users can view own shifts or admins" ON public.staff_shifts;

CREATE POLICY "Authenticated users can view staff shifts"
ON public.staff_shifts
FOR SELECT
TO authenticated
USING (true);