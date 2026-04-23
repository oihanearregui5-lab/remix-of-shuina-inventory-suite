CREATE TABLE public.work_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  worker_name TEXT NOT NULL DEFAULT '',
  action TEXT,
  description TEXT NOT NULL DEFAULT '',
  machine TEXT,
  observations TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  started_latitude DOUBLE PRECISION,
  started_longitude DOUBLE PRECISION,
  ended_latitude DOUBLE PRECISION,
  ended_longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own work reports and admins"
ON public.work_reports
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE POLICY "Users can create own work reports"
ON public.work_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own work reports and admins"
ON public.work_reports
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE POLICY "Users can delete own work reports and admins"
ON public.work_reports
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

CREATE UNIQUE INDEX idx_work_reports_single_open_per_user
ON public.work_reports (user_id)
WHERE ended_at IS NULL;

CREATE INDEX idx_work_reports_user_sort
ON public.work_reports (user_id, started_at DESC, updated_at DESC);

CREATE INDEX idx_work_reports_open_sort
ON public.work_reports (ended_at, started_at DESC);

CREATE OR REPLACE FUNCTION public.validate_work_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.worker_name := btrim(COALESCE(NEW.worker_name, ''));
  NEW.description := btrim(COALESCE(NEW.description, ''));
  NEW.action := NULLIF(btrim(COALESCE(NEW.action, '')), '');
  NEW.machine := NULLIF(btrim(COALESCE(NEW.machine, '')), '');
  NEW.observations := NULLIF(btrim(COALESCE(NEW.observations, '')), '');

  IF NEW.worker_name = '' THEN
    RAISE EXCEPTION 'worker_name is required';
  END IF;

  IF NEW.description = '' THEN
    RAISE EXCEPTION 'description is required';
  END IF;

  IF NEW.ended_at IS NOT NULL AND NEW.ended_at < NEW.started_at THEN
    RAISE EXCEPTION 'ended_at cannot be earlier than started_at';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_work_report_before_write
BEFORE INSERT OR UPDATE ON public.work_reports
FOR EACH ROW
EXECUTE FUNCTION public.validate_work_report();

CREATE TRIGGER update_work_reports_updated_at
BEFORE UPDATE ON public.work_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();