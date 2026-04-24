-- Tabla de auditoría
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_name text,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  entity_table text NOT NULL,
  entity_id text,
  summary text,
  changed_fields text[],
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_table, entity_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs (actor_user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo admin/secretary pueden leer. Nadie puede escribir/modificar desde la app.
CREATE POLICY "Admin and secretary can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));

-- Función genérica de auditoría
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_name text;
  v_entity_id text;
  v_old jsonb;
  v_new jsonb;
  v_changed text[] := ARRAY[]::text[];
  v_summary text;
  v_key text;
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE user_id = v_actor;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_entity_id := COALESCE((v_old->>'id'), '');
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_entity_id := COALESCE((v_new->>'id'), '');
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_entity_id := COALESCE((v_new->>'id'), (v_old->>'id'), '');
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_key NOT IN ('updated_at') AND (v_old->v_key) IS DISTINCT FROM (v_new->v_key) THEN
        v_changed := array_append(v_changed, v_key);
      END IF;
    END LOOP;
    -- Si solo cambió updated_at, no registramos
    IF array_length(v_changed, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  v_summary := CASE TG_OP
    WHEN 'INSERT' THEN 'Creó registro en ' || TG_TABLE_NAME
    WHEN 'UPDATE' THEN 'Editó ' || TG_TABLE_NAME || COALESCE(' (' || array_to_string(v_changed, ', ') || ')', '')
    WHEN 'DELETE' THEN 'Eliminó registro de ' || TG_TABLE_NAME
  END;

  INSERT INTO public.audit_logs
    (actor_user_id, actor_name, action, entity_table, entity_id, summary, changed_fields, old_data, new_data)
  VALUES
    (v_actor, v_actor_name, lower(TG_OP), TG_TABLE_NAME, v_entity_id, v_summary, v_changed, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers en tablas sensibles (UPDATE/DELETE para datos operativos, ALL para roles)
CREATE TRIGGER audit_time_entries
AFTER UPDATE OR DELETE ON public.time_entries
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_work_reports
AFTER UPDATE OR DELETE ON public.work_reports
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_tonnage_trips
AFTER UPDATE OR DELETE ON public.tonnage_trips
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_delivery_notes
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_notes
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();