-- Fix ambiguous_terms RLS policies
--
-- The previous policies referenced a non-existent user_id column, making them
-- accidentally secure (all user queries denied). Replace with intentional
-- read-only access for authenticated users. Service role bypasses RLS by default.

DROP POLICY IF EXISTS "ambiguous_terms_delete_owner" ON public.ambiguous_terms;
DROP POLICY IF EXISTS "ambiguous_terms_update_owner" ON public.ambiguous_terms;
DROP POLICY IF EXISTS "ambiguous_terms_select_owner" ON public.ambiguous_terms;
DROP POLICY IF EXISTS "ambiguous_terms_insert_owner" ON public.ambiguous_terms;
DROP POLICY IF EXISTS "ambiguous_terms_write_service" ON public.ambiguous_terms;

CREATE POLICY "Authenticated users can read ambiguous terms"
  ON public.ambiguous_terms FOR SELECT
  TO authenticated
  USING (true);
