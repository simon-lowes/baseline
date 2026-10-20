-- =============================================================================
-- Migration: Explicit Data API grants for every public table
-- =============================================================================
-- From 30 Oct 2026 Supabase stops auto-granting Data API access (PostgREST,
-- supabase-js, GraphQL) to new tables in the public schema. Existing tables in
-- the live project keep their grants, so this migration is a no-op there:
-- GRANT is additive and never revokes anything.
--
-- It matters when the schema is rebuilt from migrations (a new project, a
-- preview branch or `supabase db reset`), where these tables would otherwise
-- answer every request with "permission denied".
--
-- Grants follow each table's RLS policies. RLS still decides which rows a
-- role can see; the grant only lets the role reach the table at all.
--   anon           only where a policy lets unauthenticated users read
--   authenticated  the operations the app performs as a signed-in user
--   service_role   full access for edge functions (it bypasses RLS)
--
-- Any table added from now on must carry its own grants in the migration
-- that creates it (enforced by supabase/functions/__tests__/migration-grants.test.ts).
-- =============================================================================

-- profiles: users read and update their own row; rows are created by the
-- handle_new_user() trigger and deleted by the delete-account edge function.
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

-- trackers: full CRUD on the user's own trackers.
grant select, insert, update, delete on public.trackers to authenticated;
grant select, insert, update, delete on public.trackers to service_role;

-- tracker_entries (renamed from pain_entries): full CRUD on own entries.
grant select, insert, update, delete on public.tracker_entries to authenticated;
grant select, insert, update, delete on public.tracker_entries to service_role;

-- dictionary_cache: "Anyone can read dictionary cache"; signed-in users insert.
grant select on public.dictionary_cache to anon;
grant select, insert on public.dictionary_cache to authenticated;
grant select, insert, update, delete on public.dictionary_cache to service_role;

-- ambiguous_terms: read-only lookup for signed-in users; maintained by migrations.
grant select on public.ambiguous_terms to authenticated;
grant select, insert, update, delete on public.ambiguous_terms to service_role;
