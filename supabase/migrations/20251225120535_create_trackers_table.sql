-- Create trackers table
CREATE TABLE IF NOT EXISTS trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  preset_id TEXT,
  icon TEXT NOT NULL DEFAULT 'activity',
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on trackers
ALTER TABLE trackers ENABLE ROW LEVEL SECURITY;

-- Users can only see their own trackers
CREATE POLICY "Users can view own trackers" ON trackers
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own trackers
CREATE POLICY "Users can insert own trackers" ON trackers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own trackers
CREATE POLICY "Users can update own trackers" ON trackers
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own trackers
CREATE POLICY "Users can delete own trackers" ON trackers
  FOR DELETE USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_trackers_user_id ON trackers(user_id);;
