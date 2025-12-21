# 10 Supabase Playbook (Auth + Postgres + Storage + RLS) — Copilot Prompt

Paste this into Copilot Chat once Spark Detox is complete.

---

We will integrate Supabase and keep the app backend-agnostic by implementing adapters under `src/adapters/supabase/`.

## Step 0: Install
- Add dependency: `@supabase/supabase-js` (latest v2)
- If using React: optionally add `@supabase/auth-helpers-react` ONLY if you already use Next.js and want helpers. Otherwise keep it simple.

## Step 1: Env
Add to `.env.example` (match your framework prefix):
- `VITE_SUPABASE_URL=`
- `VITE_SUPABASE_ANON_KEY=`
(or `NEXT_PUBLIC_...` in Next.js)

Create `src/adapters/supabase/supabaseClient.ts`:
- `createClient(url, anonKey)`
- export singleton `supabase`

## Step 2: Auth adapter
Create `src/adapters/supabase/supabaseAuth.ts` implementing `AuthPort`:
- `signUp({ email, password })`
- `signIn({ email, password })`
- `signOut()`
- `getSession()`
- `getUser()`
- `onAuthStateChange(cb)` using `supabase.auth.onAuthStateChange`

Return a normalized user object: `{ id, email }`.

## Step 3: DB adapter
Option A (recommended): Use Supabase as a typed table gateway:
Create `src/adapters/supabase/supabaseDb.ts` implementing `DbPort`:
- `select(table, { where, limit, orderBy })`
- `insert(table, values)`
- `update(table, where, values)`
- `delete(table, where)`
Implementation can use `supabase.from(table)` and apply filters.

## Step 4: KV adapter (optional)
Prefer DB for data; KV only for UI preferences.
Create `src/adapters/supabase/supabaseKv.ts`:
- store in `user_settings` table (recommended)
- or use `localStorage` and skip remote KV
If you choose `user_settings`, require `auth.getUser()` and namespace keys by user.

## Step 5: Wire runtime
Update `src/runtime/appRuntime.ts`:
- If env vars present -> use Supabase adapters
- else -> fall back to noop/local adapters

## Step 6: Schema + RLS (BEGINNER SAFE DEFAULT)
Create `SUPABASE_SCHEMA.sql` with:
1. `profiles` table:
   - `id uuid primary key references auth.users (id)`
   - `email text`
   - timestamps
2. App tables (derive from app usage):
   - every user-owned table must include `user_id uuid not null references auth.users (id)`
3. Enable RLS:
   - `alter table <table> enable row level security;`
4. Policies (template):
   - SELECT: `using (auth.uid() = user_id)`
   - INSERT: `with check (auth.uid() = user_id)`
   - UPDATE/DELETE: `using (auth.uid() = user_id)`

Also create a **public read** example policy only if app needs public data.

## Step 7: UI wiring
- Add auth screens/components:
  - email + password sign up
  - sign in
  - sign out
- Ensure all DB calls filter by `user_id = auth.getUser().id` (even with RLS, do it for clarity).

## Acceptance tests
- Create 2 users
- Verify isolation: user A cannot read user B rows (RLS)
- Verify no secrets in frontend beyond anon key

Proceed with minimal diffs and explain each step.
