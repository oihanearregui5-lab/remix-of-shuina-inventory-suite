-- ============================================================
-- VIAJES (toneladas) — ampliación: multi-material por viaje + zonas
-- Esta migración EXTIENDE lo creado en 20260424094000_tonnage.sql
-- sin romper datos existentes.
-- ============================================================

-- 1) CATÁLOGO DE ZONAS (para Carga y Descarga)
CREATE TABLE IF NOT EXISTS public.tonnage_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  zone_type TEXT NOT NULL CHECK (zone_type IN ('carga', 'descarga', 'ambas')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tonnage_zones_active ON public.tonnage_zones (is_active, sort_order);

ALTER TABLE public.tonnage_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users can view tonnage zones" ON public.tonnage_zones;
CREATE POLICY "Auth users can view tonnage zones"
ON public.tonnage_zones FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage tonnage zones" ON public.tonnage_zones;
CREATE POLICY "Admins manage tonnage zones"
ON public.tonnage_zones FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

-- Seed inicial: zonas vistas en el sistema actual de Power BI
INSERT INTO public.tonnage_zones (label, zone_type, sort_order) VALUES
  ('Acopio', 'ambas', 10),
  ('Zona 1', 'carga', 20),
  ('Zona B', 'carga', 30),
  ('Zona C', 'carga', 40),
  ('Zona 3', 'carga', 50),
  ('Zona 4', 'carga', 60),
  ('Pozo A', 'carga', 70),
  ('Pozo B', 'carga', 80),
  ('Pozo C', 'carga', 90),
  ('Pozo D', 'carga', 100),
  ('Tolva', 'descarga', 200),
  ('Salinas', 'descarga', 210)
ON CONFLICT (label) DO NOTHING;


-- 2) AMPLIACIÓN DE tonnage_trips
ALTER TABLE public.tonnage_trips
  ADD COLUMN IF NOT EXISTS qty_tortas NUMERIC(10, 2) DEFAULT 0 CHECK (qty_tortas >= 0),
  ADD COLUMN IF NOT EXISTS qty_arenas_a NUMERIC(10, 2) DEFAULT 0 CHECK (qty_arenas_a >= 0),
  ADD COLUMN IF NOT EXISTS qty_arenas_b NUMERIC(10, 2) DEFAULT 0 CHECK (qty_arenas_b >= 0),
  ADD COLUMN IF NOT EXISTS qty_sulfatos NUMERIC(10, 2) DEFAULT 0 CHECK (qty_sulfatos >= 0),
  ADD COLUMN IF NOT EXISTS load_zone_id UUID REFERENCES public.tonnage_zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unload_zone_id UUID REFERENCES public.tonnage_zones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tonnage_trips_load_zone ON public.tonnage_trips (load_zone_id);
CREATE INDEX IF NOT EXISTS idx_tonnage_trips_unload_zone ON public.tonnage_trips (unload_zone_id);


-- 3) Migrar registros existentes
UPDATE public.tonnage_trips
SET
  qty_tortas = CASE WHEN material_snapshot = 'tortas' THEN 1 ELSE qty_tortas END,
  qty_arenas_a = CASE WHEN material_snapshot = 'arenas' THEN 1 ELSE qty_arenas_a END,
  qty_sulfatos = CASE WHEN material_snapshot = 'sulfatos' THEN 1 ELSE qty_sulfatos END
WHERE COALESCE(qty_tortas, 0) = 0
  AND COALESCE(qty_arenas_a, 0) = 0
  AND COALESCE(qty_arenas_b, 0) = 0
  AND COALESCE(qty_sulfatos, 0) = 0;