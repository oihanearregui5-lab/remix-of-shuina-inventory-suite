-- ============================================================
-- Bloque 11: Módulo Gasolina en base de datos
-- ============================================================

-- Tabla: fuel_cards (tarjetas de combustible)
CREATE TABLE public.fuel_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alias TEXT NOT NULL,
  masked_number TEXT,
  assigned_vehicle TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_cards_active ON public.fuel_cards(is_active, sort_order);

ALTER TABLE public.fuel_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view fuel cards"
  ON public.fuel_cards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/secretary can manage fuel cards"
  ON public.fuel_cards FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE TRIGGER update_fuel_cards_updated_at
  BEFORE UPDATE ON public.fuel_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_fuel_cards
  AFTER INSERT OR UPDATE OR DELETE ON public.fuel_cards
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Tabla: fuel_records (repostajes)
CREATE TABLE public.fuel_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.fuel_cards(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  station TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  liters NUMERIC(10,2),
  vehicle TEXT,
  observations TEXT,
  receipt_photo_path TEXT,
  receipt_photo_name TEXT,
  extra_info TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_records_card_date ON public.fuel_records(card_id, record_date DESC);
CREATE INDEX idx_fuel_records_date ON public.fuel_records(record_date DESC);

ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view fuel records"
  ON public.fuel_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Auth users can create fuel records"
  ON public.fuel_records FOR INSERT
  TO authenticated
  WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Owner or admin/secretary can update fuel records"
  ON public.fuel_records FOR UPDATE
  TO authenticated
  USING (created_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
  WITH CHECK (created_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE POLICY "Owner or admin/secretary can delete fuel records"
  ON public.fuel_records FOR DELETE
  TO authenticated
  USING (created_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE TRIGGER update_fuel_records_updated_at
  BEFORE UPDATE ON public.fuel_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_fuel_records
  AFTER INSERT OR UPDATE OR DELETE ON public.fuel_records
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Storage bucket para tickets de combustible (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fuel-receipts', 'fuel-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users can view fuel receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'fuel-receipts');

CREATE POLICY "Auth users can upload fuel receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fuel-receipts');

CREATE POLICY "Auth users can delete own fuel receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'fuel-receipts' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

-- Seed: 14 tarjetas iniciales
INSERT INTO public.fuel_cards (alias, masked_number, sort_order)
SELECT
  'Tarjeta ' || lpad(i::text, 2, '0'),
  '.... .... .... ' || lpad((1000 + i)::text, 4, '0'),
  i
FROM generate_series(1, 14) AS i;
