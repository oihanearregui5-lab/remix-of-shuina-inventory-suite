DROP POLICY IF EXISTS "Users can update own pending vacation requests or admins" ON public.vacation_requests;
CREATE POLICY "Authenticated users can update vacation requests during rollout"
ON public.vacation_requests
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);