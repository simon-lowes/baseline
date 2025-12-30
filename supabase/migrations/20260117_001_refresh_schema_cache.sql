-- Add a helper to refresh PostgREST schema cache
-- This allows clients to recover from stale schema cache after migrations.

CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_schema_cache() TO anon, authenticated;
