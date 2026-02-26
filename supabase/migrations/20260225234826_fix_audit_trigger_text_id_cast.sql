-- Fix: audit_trigger_fn() crashed on tracker_entries with non-UUID text IDs
-- The trigger cast COALESCE(NEW.id, OLD.id)::uuid, but tracker_entries.id is TEXT
-- containing values like "1766962472812-0.5593980265988024".
-- On cascade delete of tracker_entries, this crashed the entire transaction,
-- preventing tracker deletion.

-- Step 1: Change audit_log.record_id from uuid to text
ALTER TABLE public.audit_log ALTER COLUMN record_id TYPE text USING record_id::text;

-- Step 2: Replace the trigger function with ::text cast instead of ::uuid
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  changed_fields_arr TEXT[] := '{}';
  old_json JSONB;
  new_json JSONB;
  key TEXT;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    old_json := row_to_json(OLD)::JSONB;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    new_json := row_to_json(NEW)::JSONB;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    FOR key IN SELECT jsonb_object_keys(old_json)
    LOOP
      IF old_json->key IS DISTINCT FROM new_json->key THEN
        changed_fields_arr := array_append(changed_fields_arr, key);
      END IF;
    END LOOP;

    IF array_length(changed_fields_arr, 1) IS NULL THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;

  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    changed_by
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::text,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN old_json END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN new_json END,
    CASE WHEN TG_OP = 'UPDATE' THEN changed_fields_arr END,
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;
