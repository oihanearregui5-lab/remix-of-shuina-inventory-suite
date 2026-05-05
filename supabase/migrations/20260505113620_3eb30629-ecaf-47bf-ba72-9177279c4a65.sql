-- Normalizar empresas existentes a las 4 permitidas (las que no estén se reasignan a 'acedesa')
UPDATE public.delivery_notes
  SET company = 'acedesa'
  WHERE company IS NULL OR company NOT IN ('sirek', 'wurth', 'mainate', 'acedesa');

-- Default 'acedesa' para nuevos albaranes
ALTER TABLE public.delivery_notes
  ALTER COLUMN company SET DEFAULT 'acedesa';

-- Constraint para limitar a las 4 empresas válidas
ALTER TABLE public.delivery_notes
  DROP CONSTRAINT IF EXISTS delivery_notes_company_check;

ALTER TABLE public.delivery_notes
  ADD CONSTRAINT delivery_notes_company_check
  CHECK (company IN ('sirek', 'wurth', 'mainate', 'acedesa'));

COMMENT ON COLUMN public.delivery_notes.company IS 'Empresa cliente del albarán. Valores permitidos: sirek, wurth, mainate, acedesa.';