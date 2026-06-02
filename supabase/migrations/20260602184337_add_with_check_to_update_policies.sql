-- Add WITH CHECK to UPDATE RLS policies
--
-- The UPDATE policies on tracker_entries and profiles were defined with only a
-- USING clause. In PostgreSQL RLS, USING controls which existing rows may be
-- updated, but WITH CHECK validates the NEW row values after the update. Without
-- WITH CHECK, an authenticated user could UPDATE one of their own rows and set
-- user_id (tracker_entries) to another user's UUID, silently transferring/planting
-- records into another account. tracker_entries has no UNIQUE constraint on
-- user_id, so this succeeds.
--
-- Recreate the UPDATE policies with a matching WITH CHECK so the post-update row
-- is validated to still belong to the caller. Uses the (select auth.uid()) form
-- to remain consistent with the earlier RLS initplan optimization.

-- tracker_entries
DROP POLICY IF EXISTS "Users can update own tracker entries" ON public.tracker_entries;
CREATE POLICY "Users can update own tracker entries"
  ON public.tracker_entries FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);
