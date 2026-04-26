
-- ============================================================
-- 1) PROFILES: añadir avatar_url y phone
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS phone text;

-- ============================================================
-- 2) CONSUMIBLES (aceites, anticongelante, filtros, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consumables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'otros',
  unit text NOT NULL DEFAULT 'L',
  current_stock numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consumables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view consumables"
  ON public.consumables FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage consumables"
  ON public.consumables FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE TRIGGER consumables_updated_at
  BEFORE UPDATE ON public.consumables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) MOVIMIENTOS DE CONSUMIBLES (consumos / entradas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consumable_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumable_id uuid NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('in','out')),
  quantity numeric NOT NULL CHECK (quantity > 0),
  machine_id uuid,
  reason text,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consumable_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view consumable movements"
  ON public.consumable_movements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can insert consumable movements"
  ON public.consumable_movements FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Owner or admin delete consumable movements"
  ON public.consumable_movements FOR DELETE TO authenticated
  USING (created_by_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary'));

-- Trigger: actualizar stock automáticamente
CREATE OR REPLACE FUNCTION public.apply_consumable_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.movement_type = 'in' THEN
      UPDATE public.consumables SET current_stock = current_stock + NEW.quantity WHERE id = NEW.consumable_id;
    ELSE
      UPDATE public.consumables SET current_stock = current_stock - NEW.quantity WHERE id = NEW.consumable_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.movement_type = 'in' THEN
      UPDATE public.consumables SET current_stock = current_stock - OLD.quantity WHERE id = OLD.consumable_id;
    ELSE
      UPDATE public.consumables SET current_stock = current_stock + OLD.quantity WHERE id = OLD.consumable_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER consumable_movements_apply
  AFTER INSERT OR DELETE ON public.consumable_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_consumable_movement();

-- ============================================================
-- 4) ADJUNTOS DE CHAT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  channel_id uuid NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size integer,
  uploaded_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_message_attachments_message_idx ON public.chat_message_attachments(message_id);
CREATE INDEX IF NOT EXISTS chat_message_attachments_channel_idx ON public.chat_message_attachments(channel_id);

ALTER TABLE public.chat_message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view chat attachments"
  ON public.chat_message_attachments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.can_access_chat_channel(channel_id));

CREATE POLICY "Members can insert chat attachments"
  ON public.chat_message_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by_user_id = auth.uid() AND public.can_access_chat_channel(channel_id));

CREATE POLICY "Authors or admins can delete chat attachments"
  ON public.chat_message_attachments FOR DELETE TO authenticated
  USING (uploaded_by_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============================================================
-- 5) STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas avatares
CREATE POLICY "Avatars publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas chat-attachments
CREATE POLICY "Auth users can view chat attachments storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');

CREATE POLICY "Auth users can upload chat attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners delete own chat attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
