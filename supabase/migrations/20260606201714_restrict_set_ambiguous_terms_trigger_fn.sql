-- set_ambiguous_terms_user_id is a trigger function; it fires via its trigger with definer
-- privileges regardless of direct EXECUTE grants, so no client needs EXECUTE on it. Revoke the
-- exposed grants to clear advisor 0029 (signed-in users could call it directly via RPC).
-- Existence-guarded so a from-scratch rebuild skips it if the function isn't present yet.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'set_ambiguous_terms_user_id') then
    execute 'revoke execute on function public.set_ambiguous_terms_user_id() from public, anon, authenticated';
  end if;
end $$;
