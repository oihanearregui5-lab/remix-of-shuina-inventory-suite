-- Allow admins to insert/update/delete any time_entries from the admin panel
DROP POLICY IF EXISTS "Admins can insert any time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can update any time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can delete time entries" ON public.time_entries;

CREATE POLICY "Admins can insert any time entries"
ON public.time_entries
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any time entries"
ON public.time_entries
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete time entries"
ON public.time_entries
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));