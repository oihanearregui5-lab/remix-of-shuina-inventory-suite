DROP POLICY IF EXISTS "Authenticated users can update vacation requests during rollout" ON public.vacation_requests;
CREATE POLICY "Users can update own pending vacation requests or admins"
ON public.vacation_requests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR (
    requester_user_id = auth.uid()
    AND status = 'pending'
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (
    requester_user_id = auth.uid()
    AND status = 'pending'
    AND reviewed_by_user_id IS NULL
    AND reviewed_at IS NULL
  )
);