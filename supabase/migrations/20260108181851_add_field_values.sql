-- Add field_values column to tracker_entries table
-- Stores custom field data as JSONB for schema_version = 2 trackers

ALTER TABLE tracker_entries ADD COLUMN IF NOT EXISTS field_values JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN tracker_entries.field_values IS 'Custom field values for schema_version 2 trackers, stored as key-value pairs';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_tracker_entries_field_values ON tracker_entries USING GIN (field_values);

-- Update RLS policies to include new column (recreate for completeness)
DROP POLICY IF EXISTS "Users can read own tracker entries" ON tracker_entries;
DROP POLICY IF EXISTS "Users can insert own tracker entries" ON tracker_entries;
DROP POLICY IF EXISTS "Users can update own tracker entries" ON tracker_entries;
DROP POLICY IF EXISTS "Users can delete own tracker entries" ON tracker_entries;

CREATE POLICY "Users can read own tracker entries"
  ON tracker_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracker entries"
  ON tracker_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracker entries"
  ON tracker_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tracker entries"
  ON tracker_entries FOR DELETE
  USING (auth.uid() = user_id);
