
CREATE POLICY "Owner or admin can update fuel receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'fuel-receipts'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'secretary'::public.app_role)
    )
  )
  WITH CHECK (
    bucket_id = 'fuel-receipts'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'secretary'::public.app_role)
    )
  );
