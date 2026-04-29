
CREATE TABLE IF NOT EXISTS public.tonnage_daily_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_date date NOT NULL UNIQUE,
  qty_tortas numeric NOT NULL DEFAULT 0,
  qty_arenas_a numeric NOT NULL DEFAULT 0,
  qty_arenas_b numeric NOT NULL DEFAULT 0,
  qty_sulfatos numeric NOT NULL DEFAULT 0,
  notes text,
  updated_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tonnage_daily_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view daily materials"
  ON public.tonnage_daily_materials FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can insert daily materials"
  ON public.tonnage_daily_materials FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can update daily materials"
  ON public.tonnage_daily_materials FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete daily materials"
  ON public.tonnage_daily_materials FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tonnage_daily_materials_updated_at
  BEFORE UPDATE ON public.tonnage_daily_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
