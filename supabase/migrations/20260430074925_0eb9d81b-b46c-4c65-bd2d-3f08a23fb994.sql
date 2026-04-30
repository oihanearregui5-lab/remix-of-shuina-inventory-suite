-- Tabla de checklist diaria de mantenimiento por máquina.
-- Una fila por (máquina, fecha) con 4 ítems (hidráulico, motor, anticongelante, AdBlue) y litros.
CREATE TABLE IF NOT EXISTS public.machine_maintenance_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hydraulic_oil_done BOOLEAN NOT NULL DEFAULT false,
  hydraulic_oil_liters NUMERIC,
  engine_oil_done BOOLEAN NOT NULL DEFAULT false,
  engine_oil_liters NUMERIC,
  coolant_done BOOLEAN NOT NULL DEFAULT false,
  coolant_liters NUMERIC,
  adblue_done BOOLEAN NOT NULL DEFAULT false,
  adblue_liters NUMERIC,
  notes TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (machine_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_mm_log_machine_date ON public.machine_maintenance_log (machine_id, log_date DESC);

ALTER TABLE public.machine_maintenance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view maintenance log"
ON public.machine_maintenance_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth insert maintenance log"
ON public.machine_maintenance_log FOR INSERT TO authenticated
WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Owner or admin update maintenance log"
ON public.machine_maintenance_log FOR UPDATE TO authenticated
USING (created_by_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role))
WITH CHECK (created_by_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role));

CREATE POLICY "Owner or admin delete maintenance log"
ON public.machine_maintenance_log FOR DELETE TO authenticated
USING (created_by_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role));

CREATE TRIGGER trg_mm_log_updated_at
BEFORE UPDATE ON public.machine_maintenance_log
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();