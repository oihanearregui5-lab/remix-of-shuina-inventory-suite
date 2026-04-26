-- ============================================================
-- ALBARANES: reemplazar esquema de delivery_notes
-- ============================================================

-- Eliminar políticas y tabla actuales (sin datos)
DROP TABLE IF EXISTS public.delivery_notes CASCADE;

CREATE TABLE public.delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL,
  company TEXT NOT NULL CHECK (company IN ('nacohi','irigaray','hermua','hergoy','cst','finanzauto','blumaq','dicona','sadar','otros')),
  expense_target TEXT NOT NULL CHECK (expense_target IN ('maquina','taller','otros')),
  machine_asset_id UUID REFERENCES public.machine_assets(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2),
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  photo_path TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_notes_date ON public.delivery_notes (delivery_date DESC);
CREATE INDEX idx_delivery_notes_company ON public.delivery_notes (company);
CREATE INDEX idx_delivery_notes_target ON public.delivery_notes (expense_target);
CREATE INDEX idx_delivery_notes_machine ON public.delivery_notes (machine_asset_id) WHERE machine_asset_id IS NOT NULL;

ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view delivery notes"
ON public.delivery_notes FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE POLICY "Admins manage delivery notes"
ON public.delivery_notes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE TRIGGER update_delivery_notes_updated_at
BEFORE UPDATE ON public.delivery_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket privado para fotos de albaranes
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-notes', 'delivery-notes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins read delivery-notes storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload delivery-notes storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete delivery-notes storage" ON storage.objects;

CREATE POLICY "Admins read delivery-notes storage"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'delivery-notes'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
);

CREATE POLICY "Admins upload delivery-notes storage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'delivery-notes'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
);

CREATE POLICY "Admins delete delivery-notes storage"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'delivery-notes'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
);


-- ============================================================
-- CHAT: RLS basado en is_chat_channel_member
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_chat_channel_member(p_channel_id UUID, p_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id
  )
$$;

-- chat_channels SELECT
DROP POLICY IF EXISTS "Users can view accessible chat channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Authenticated users can view chat channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Members can view their channels" ON public.chat_channels;

CREATE POLICY "Members can view their channels"
ON public.chat_channels
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR visibility IS NULL
  OR visibility = 'public'
  OR public.is_chat_channel_member(id, auth.uid())
);

-- chat_messages SELECT
DROP POLICY IF EXISTS "Users can view accessible chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Members can view channel messages" ON public.chat_messages;

CREATE POLICY "Members can view channel messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.chat_channels c
    WHERE c.id = chat_messages.channel_id
      AND (
        c.visibility IS NULL
        OR c.visibility = 'public'
        OR public.is_chat_channel_member(c.id, auth.uid())
      )
  )
);

-- chat_channel_members SELECT
DROP POLICY IF EXISTS "Users can view accessible chat memberships" ON public.chat_channel_members;
DROP POLICY IF EXISTS "Members can view channel memberships" ON public.chat_channel_members;

CREATE POLICY "Members can view channel memberships"
ON public.chat_channel_members
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
  OR public.is_chat_channel_member(channel_id, auth.uid())
);
