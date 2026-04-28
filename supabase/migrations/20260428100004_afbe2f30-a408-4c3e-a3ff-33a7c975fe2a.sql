-- Trigger: notify admins when ITV or insurance is close to expiry (<= 15 days)
CREATE OR REPLACE FUNCTION public.notify_machine_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
  v_days INTEGER;
  v_kind TEXT;
  v_date DATE;
BEGIN
  -- Detectar cambio en ITV próximo
  IF (TG_OP = 'INSERT' OR NEW.itv_next_date IS DISTINCT FROM OLD.itv_next_date)
     AND NEW.itv_next_date IS NOT NULL THEN
    v_days := NEW.itv_next_date - CURRENT_DATE;
    IF v_days <= 15 THEN
      v_kind := 'ITV';
      v_date := NEW.itv_next_date;
      FOR v_admin IN
        SELECT DISTINCT user_id FROM public.user_roles
        WHERE role IN ('admin','secretary')
      LOOP
        PERFORM public.create_notification(
          v_admin.user_id,
          'machine_incident',
          v_kind || ' próxima: ' || NEW.display_name,
          CASE WHEN v_days < 0
               THEN 'Vencida hace ' || abs(v_days) || ' días (' || to_char(v_date,'DD/MM/YYYY') || ')'
               ELSE 'Vence en ' || v_days || ' días (' || to_char(v_date,'DD/MM/YYYY') || ')'
          END,
          'machines',
          NEW.id
        );
      END LOOP;
    END IF;
  END IF;

  -- Detectar cambio en seguro
  IF (TG_OP = 'INSERT' OR NEW.insurance_expiry_date IS DISTINCT FROM OLD.insurance_expiry_date)
     AND NEW.insurance_expiry_date IS NOT NULL THEN
    v_days := NEW.insurance_expiry_date - CURRENT_DATE;
    IF v_days <= 15 THEN
      v_kind := 'Seguro';
      v_date := NEW.insurance_expiry_date;
      FOR v_admin IN
        SELECT DISTINCT user_id FROM public.user_roles
        WHERE role IN ('admin','secretary')
      LOOP
        PERFORM public.create_notification(
          v_admin.user_id,
          'machine_incident',
          v_kind || ' próximo: ' || NEW.display_name,
          CASE WHEN v_days < 0
               THEN 'Vencido hace ' || abs(v_days) || ' días (' || to_char(v_date,'DD/MM/YYYY') || ')'
               ELSE 'Vence en ' || v_days || ' días (' || to_char(v_date,'DD/MM/YYYY') || ')'
          END,
          'machines',
          NEW.id
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_machine_expiry_notify ON public.machine_assets;
CREATE TRIGGER tr_machine_expiry_notify
AFTER INSERT OR UPDATE OF itv_next_date, insurance_expiry_date ON public.machine_assets
FOR EACH ROW EXECUTE FUNCTION public.notify_machine_expiry();