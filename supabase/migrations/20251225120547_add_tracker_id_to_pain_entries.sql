-- Add tracker_id to pain_entries
ALTER TABLE pain_entries 
  ADD COLUMN IF NOT EXISTS tracker_id UUID REFERENCES trackers(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_pain_entries_tracker_id ON pain_entries(tracker_id);;
