# Supabase Security & Auth Checklist

Use this checklist to keep the project secure and aligned with best practices.

## Auth Configuration

- Email auth: Enabled (no social/phone for now)
- Email templates: Signup confirmation, Magic Link, Password reset configured
- Redirect URLs: Include dev (`http://localhost:5174`) and prod (Netlify URL)
- SMTP: Verified sending domain, DKIM/SPF set (Resend configured)

## Environment Variables

- Frontend only uses: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Never expose `service_role` key in frontend or repo
- `.gitignore` ignores `.env`, `.env.*`, and `supabase/.env`
- `.env.example` documents safe usage (no secrets committed)

## Database Security

- Row Level Security (RLS): Enabled and enforced (FORCE RLS) on `public.tracker_entries` and `public.profiles` (25 Dec 2025)
- Policies: Least-privilege, users can only access rows where `user_id = auth.uid()`
- RPC functions: Avoid generic `execute_sql`; restrict RPCs to specific tasks and secure with policies
- Public schemas: Avoid anonymous write access; review Extensions/Functions permissions

## Storage Security

- Buckets: Avoid public unless intended; prefer signed URLs
- Rules: Use policies keyed to `auth.uid()` for per-user assets

## App Runtime

- Client initialization: `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` only
- Session validation: Use `auth.getUser()` server validation (already implemented)
- Password flows: Email+Password sign-in, signup, password reset supported
- Magic link: Optional alternative (not default)

## Operational Hygiene

- Logs: Monitor Auth/Database logs for unusual activity
- Rate limits: Consider edge middleware or app-level throttling for sensitive endpoints
- Backups: Enable automated backups
- CI/CD: Inject env vars via provider secrets; do not commit

## Security Advisors (from Supabase)

- Function search_path (WARN): ✅ FIXED (9 Jan 2026)
  - `public.refresh_schema_cache` had mutable search_path
  - Fixed by adding `SET search_path = ''` to function definition
  - Migration: `fix_security_and_performance_advisors`
  - Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

## Performance Advisors (from Supabase)

- Duplicate RLS policies (WARN): ✅ FIXED (9 Jan 2026)
  - `public.tracker_entries` had 4 duplicate permissive policy pairs (SELECT, INSERT, UPDATE, DELETE)
  - Fixed by dropping redundant generic policies, keeping `authenticated` role-specific policies
  - Migration: `fix_security_and_performance_advisors`
  - Reference: https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

- Unused indexes (INFO): ✅ FIXED (9 Jan 2026)
  - Previous cleanup (25 Dec 2025): `tracker_entries_timestamp_idx`, `tracker_entries_user_id_idx`
  - Latest cleanup (9 Jan 2026): `idx_tracker_entries_user_id`, `idx_tracker_entries_user_created_at`, `idx_tracker_entries_field_values`, `idx_ambiguous_terms_user_id`, `idx_trackers_schema_version`
  - Added `idx_tracker_entries_user_id_fk` to cover foreign key constraint
  - Migration: `fix_security_and_performance_advisors`, `add_foreign_key_index`
  - Reference: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

- Auth DB connections (INFO): ⚠️ PENDING
  - Auth configured with a fixed max (10) connections.
  - Switch to percentage-based allocation for better scaling.
  - Action: Update via Supabase Dashboard → Settings → Auth → Connection Pool
  - Reference: https://supabase.com/docs/guides/deployment/going-into-prod

## Quick Verification Steps

1. Dashboard → Auth → Providers: Email enabled; social/phone disabled
2. Dashboard → Auth → Email templates: All three templates present
3. Dashboard → Auth → URL Configuration: Dev/prod URLs listed
4. Dashboard → Database → Tables: RLS enabled; review policies
5. Dashboard → Database → Functions: No generic RPCs; policies enforced
6. Dashboard → Storage: Buckets private unless required; signed URLs policy
7. Repo: No secrets tracked; `.env` ignored; build succeeds
