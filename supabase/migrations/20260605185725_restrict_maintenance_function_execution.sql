-- Lock down SECURITY DEFINER maintenance/internal functions from public/anon/authenticated.
-- These were callable unauthenticated via PostgREST RPC (security advisors 0028/0029) — an
-- attacker could have wiped audit/security logs (cleanup_*) or triggered maintenance with no login.
-- service_role keeps its explicit EXECUTE grant (edge functions use the service key) and the owner
-- (postgres) is unaffected, so all server-side use continues to work.
-- Loop-guarded so a from-scratch rebuild simply skips any function that doesn't exist yet.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.proname in (
        'audit_trigger_fn','auto_index_rls_predicates','check_rate_limit',
        'claim_ambiguous_terms_null_rows','cleanup_audit_logs','cleanup_rate_limits',
        'cleanup_security_events','fix_rls_policies','get_maintenance_cron_jobs','is_tracker_owner',
        'log_security_event','maintenance_fix_duplicate_policies','maintenance_fix_function_search_path',
        'maintenance_fix_unindexed_fks','maintenance_fix_unused_indexes','maintenance_log_action',
        'run_database_maintenance','run_performance_maintenance','run_rls_fix_sweep'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.fn);
  end loop;
end $$;

-- refresh_schema_cache is called by the browser app as an authenticated user: keep authenticated, drop anon.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'refresh_schema_cache') then
    execute 'revoke execute on function public.refresh_schema_cache() from anon';
  end if;
end $$;
