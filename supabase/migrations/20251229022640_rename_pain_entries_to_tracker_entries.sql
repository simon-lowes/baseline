
-- Rename pain_entries table to tracker_entries
ALTER TABLE pain_entries RENAME TO tracker_entries;

-- Rename indexes to match new table name
ALTER INDEX IF EXISTS pain_entries_user_id_idx RENAME TO tracker_entries_user_id_idx;
ALTER INDEX IF EXISTS pain_entries_timestamp_idx RENAME TO tracker_entries_timestamp_idx;
ALTER INDEX IF EXISTS idx_pain_entries_tracker_id RENAME TO idx_tracker_entries_tracker_id;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can read own pain entries" ON tracker_entries;
DROP POLICY IF EXISTS "Users can insert own pain entries" ON tracker_entries;
DROP POLICY IF EXISTS "Users can update own pain entries" ON tracker_entries;
DROP POLICY IF EXISTS "Users can delete own pain entries" ON tracker_entries;

-- Recreate RLS policies with new names
CREATE POLICY "Users can read own tracker entries"
  ON tracker_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracker entries"
  ON tracker_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracker entries"
  ON tracker_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tracker entries"
  ON tracker_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Update trigger name
DROP TRIGGER IF EXISTS update_pain_entries_updated_at ON tracker_entries;
CREATE TRIGGER update_tracker_entries_updated_at
  BEFORE UPDATE ON tracker_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
;
