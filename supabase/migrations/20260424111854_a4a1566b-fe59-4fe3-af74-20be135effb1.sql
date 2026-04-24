-- RPC para abrir/crear canal directo 1:1 entre dos usuarios
CREATE OR REPLACE FUNCTION public.get_or_create_direct_channel(_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_a uuid;
  v_user_b uuid;
  v_key text;
  v_channel_id uuid;
  v_other_name text;
  v_self_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _other_user_id IS NULL OR _other_user_id = v_user_id THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;

  -- Canonical ordering for the direct_message_key
  IF v_user_id < _other_user_id THEN
    v_user_a := v_user_id;
    v_user_b := _other_user_id;
  ELSE
    v_user_a := _other_user_id;
    v_user_b := v_user_id;
  END IF;

  v_key := v_user_a::text || ':' || v_user_b::text;

  SELECT id INTO v_channel_id
  FROM public.chat_channels
  WHERE kind = 'direct' AND direct_message_key = v_key
  LIMIT 1;

  IF v_channel_id IS NOT NULL THEN
    RETURN v_channel_id;
  END IF;

  SELECT full_name INTO v_other_name FROM public.profiles WHERE user_id = _other_user_id LIMIT 1;
  SELECT full_name INTO v_self_name FROM public.profiles WHERE user_id = v_user_id LIMIT 1;

  v_channel_id := gen_random_uuid();

  INSERT INTO public.chat_channels (id, slug, name, description, kind, visibility, direct_message_key, created_by_user_id)
  VALUES (
    v_channel_id,
    'dm-' || replace(v_channel_id::text, '-', ''),
    COALESCE(v_other_name, 'Conversación privada'),
    NULL,
    'direct',
    'private',
    v_key,
    v_user_id
  );

  INSERT INTO public.chat_channel_members (channel_id, user_id, created_by_user_id, membership_role)
  VALUES
    (v_channel_id, v_user_id, v_user_id, 'owner'),
    (v_channel_id, _other_user_id, v_user_id, 'member');

  RETURN v_channel_id;
END;
$$;

-- RPC para crear un grupo privado con miembros iniciales
CREATE OR REPLACE FUNCTION public.create_private_group(_name text, _description text, _member_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_channel_id uuid := gen_random_uuid();
  v_member uuid;
  v_clean_name text := NULLIF(BTRIM(_name), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_clean_name IS NULL THEN
    RAISE EXCEPTION 'Group name required';
  END IF;

  INSERT INTO public.chat_channels (id, slug, name, description, kind, visibility, created_by_user_id)
  VALUES (
    v_channel_id,
    'grp-' || replace(v_channel_id::text, '-', ''),
    v_clean_name,
    NULLIF(BTRIM(_description), ''),
    'group',
    'private',
    v_user_id
  );

  INSERT INTO public.chat_channel_members (channel_id, user_id, created_by_user_id, membership_role)
  VALUES (v_channel_id, v_user_id, v_user_id, 'owner');

  IF _member_ids IS NOT NULL THEN
    FOREACH v_member IN ARRAY _member_ids LOOP
      IF v_member IS NOT NULL AND v_member <> v_user_id THEN
        INSERT INTO public.chat_channel_members (channel_id, user_id, created_by_user_id, membership_role)
        VALUES (v_channel_id, v_member, v_user_id, 'member')
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN v_channel_id;
END;
$$;

-- Allow workers to create their own private channels via RLS (groups + DMs use SECURITY DEFINER but keep policy permissive)
DROP POLICY IF EXISTS "Users can create chat channels" ON public.chat_channels;
CREATE POLICY "Users can create chat channels"
ON public.chat_channels
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR visibility <> 'public'
    OR kind <> 'channel'
  )
);
