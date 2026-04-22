ALTER TABLE public.staff_directory
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS is_supervisor boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS staff_directory_email_unique_idx
ON public.staff_directory (lower(email))
WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_current_user_staff_link(_full_name text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_name text := NULLIF(BTRIM(COALESCE(_full_name, auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() ->> 'email')), '');
  v_email text := NULLIF(lower(BTRIM(auth.jwt() ->> 'email')), '');
  v_staff_id uuid;
  v_staff_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, full_name
    INTO v_staff_id, v_staff_name
  FROM public.staff_directory
  WHERE linked_user_id = v_user_id
  LIMIT 1;

  IF v_staff_id IS NULL THEN
    SELECT id, full_name
      INTO v_staff_id, v_staff_name
    FROM public.staff_directory
    WHERE (v_email IS NOT NULL AND email IS NOT NULL AND lower(email) = v_email)
       OR (v_name IS NOT NULL AND lower(full_name) = lower(v_name))
    ORDER BY CASE WHEN linked_user_id IS NULL THEN 0 ELSE 1 END, sort_order ASC
    LIMIT 1;
  END IF;

  IF v_staff_id IS NOT NULL THEN
    UPDATE public.staff_directory
    SET linked_user_id = v_user_id,
        email = COALESCE(email, v_email),
        is_supervisor = CASE WHEN lower(full_name) IN ('david', 'abel', 'jon', 'raquel') THEN true ELSE is_supervisor END,
        updated_at = now()
    WHERE id = v_staff_id;

    IF lower(v_staff_name) IN ('david', 'abel', 'jon', 'raquel') THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_current_user_setup(_full_name text DEFAULT NULL::text)
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

  PERFORM public.sync_current_user_staff_link(v_default_name);

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

UPDATE public.staff_directory
SET is_supervisor = CASE WHEN lower(full_name) IN ('david', 'abel', 'jon', 'raquel') THEN true ELSE is_supervisor END,
    updated_at = now();

DROP POLICY IF EXISTS "Users can update own pending vacation requests or admins" ON public.vacation_requests;
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

DROP POLICY IF EXISTS "Users can view own vacation requests or admins" ON public.vacation_requests;
CREATE POLICY "Users can view own vacation requests or admins"
ON public.vacation_requests
FOR SELECT
TO authenticated
USING (
  requester_user_id = auth.uid()
  OR has_role(auth.uid(), 'admin')
  OR (
    staff_member_id IS NOT NULL
    AND can_access_staff_member(staff_member_id)
  )
);

CREATE OR REPLACE VIEW public.time_entries_with_profiles AS
SELECT
  te.id,
  te.user_id,
  te.clock_in,
  te.clock_out,
  te.latitude_in,
  te.longitude_in,
  te.latitude_out,
  te.longitude_out,
  te.notes,
  te.created_at,
  te.updated_at,
  p.full_name
FROM public.time_entries te
LEFT JOIN public.profiles p ON p.user_id = te.user_id;

ALTER VIEW public.time_entries_with_profiles SET (security_invoker = true);

GRANT SELECT ON public.time_entries_with_profiles TO authenticated;