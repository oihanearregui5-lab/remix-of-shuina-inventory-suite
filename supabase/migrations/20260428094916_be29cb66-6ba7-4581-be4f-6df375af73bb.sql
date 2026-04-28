-- ============================================================
-- ALBARANES: número de pedido auto-generado
-- ============================================================
CREATE OR REPLACE FUNCTION public.next_delivery_note_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max INTEGER;
BEGIN
  SELECT COALESCE(MAX(order_number::INTEGER), 0)
  INTO v_max
  FROM public.delivery_notes
  WHERE order_number ~ '^[0-9]+$';
  RETURN (v_max + 1)::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_delivery_note_number() TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_delivery_note_autonumber()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max INTEGER;
BEGIN
  IF NEW.order_number IS NULL OR TRIM(NEW.order_number) = '' THEN
    SELECT COALESCE(MAX(order_number::INTEGER), 0)
    INTO v_max
    FROM public.delivery_notes
    WHERE order_number ~ '^[0-9]+$';
    NEW.order_number := (v_max + 1)::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_delivery_note_autonumber ON public.delivery_notes;
CREATE TRIGGER tr_delivery_note_autonumber
  BEFORE INSERT
  ON public.delivery_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_delivery_note_autonumber();

-- ============================================================
-- MÁQUINAS: campos técnicos
-- ============================================================
ALTER TABLE public.machine_assets
  ADD COLUMN IF NOT EXISTS itv_last_date DATE,
  ADD COLUMN IF NOT EXISTS itv_next_date DATE,
  ADD COLUMN IF NOT EXISTS oil_last_date DATE,
  ADD COLUMN IF NOT EXISTS oil_last_hours NUMERIC(10, 1),
  ADD COLUMN IF NOT EXISTS oil_next_hours NUMERIC(10, 1),
  ADD COLUMN IF NOT EXISTS hydraulic_oil_last_date DATE,
  ADD COLUMN IF NOT EXISTS coolant_last_date DATE,
  ADD COLUMN IF NOT EXISTS air_filter_last_date DATE,
  ADD COLUMN IF NOT EXISTS fuel_filter_last_date DATE,
  ADD COLUMN IF NOT EXISTS tires_last_check_date DATE,
  ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS technical_notes TEXT;