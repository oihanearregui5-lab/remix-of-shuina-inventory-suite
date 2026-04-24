
-- ============================================================
-- 1. FUEL RECEIPTS bucket: lock down SELECT and INSERT to owner
-- ============================================================
DROP POLICY IF EXISTS "Auth users can view fuel receipts" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload fuel receipts" ON storage.objects;

CREATE POLICY "Owner or admin can view fuel receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fuel-receipts'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'secretary'::public.app_role)
    )
  );

CREATE POLICY "Owner can upload fuel receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fuel-receipts'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 2. MACHINE PHOTOS bucket: restrict INSERT/UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload machine photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update machine photos" ON storage.objects;

CREATE POLICY "Owner or admin can upload machine photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'machine-photos'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

CREATE POLICY "Owner or admin can update machine photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'machine-photos'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    bucket_id = 'machine-photos'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- ============================================================
-- 3. VACATION_SLOTS: allow workers to read their own slots
-- ============================================================
CREATE POLICY "Workers can view own vacation slots"
  ON public.vacation_slots FOR SELECT
  TO authenticated
  USING (
    public.can_manage_vacation_journeys()
    OR EXISTS (
      SELECT 1 FROM public.workers w
      WHERE w.id = vacation_slots.worker_id
        AND w.linked_user_id = auth.uid()
    )
  );
