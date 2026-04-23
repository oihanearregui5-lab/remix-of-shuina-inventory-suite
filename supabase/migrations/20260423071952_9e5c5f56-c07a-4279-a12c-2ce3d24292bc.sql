CREATE TABLE public.staff_allowances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_member_id UUID NOT NULL UNIQUE,
  vacation_days_base NUMERIC(5,2) NOT NULL DEFAULT 30,
  personal_days_base NUMERIC(5,2) NOT NULL DEFAULT 2,
  vacation_adjustment_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  personal_adjustment_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_allowances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own staff allowances or admins"
ON public.staff_allowances
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR can_access_staff_member(staff_member_id)
);

CREATE POLICY "Admins can create staff allowances"
ON public.staff_allowances
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update staff allowances"
ON public.staff_allowances
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete staff allowances"
ON public.staff_allowances
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE INDEX idx_staff_allowances_staff_member_id ON public.staff_allowances (staff_member_id);

CREATE TRIGGER update_staff_allowances_updated_at
BEFORE UPDATE ON public.staff_allowances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();