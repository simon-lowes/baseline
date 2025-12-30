-- Cache for dictionary lookups to avoid repeated API calls
CREATE TABLE IF NOT EXISTS dictionary_cache (
  word TEXT PRIMARY KEY,
  definition TEXT NOT NULL,
  part_of_speech TEXT,
  examples TEXT[] DEFAULT '{}',
  synonyms TEXT[] DEFAULT '{}',
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for dictionary cache - readable by anyone, writable by authenticated users
ALTER TABLE dictionary_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read dictionary cache" ON dictionary_cache FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert cache" ON dictionary_cache FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add generated_config to trackers table for AI-generated configurations
ALTER TABLE trackers 
ADD COLUMN IF NOT EXISTS generated_config JSONB DEFAULT NULL;

-- Add user_description for when dictionary lookup fails
ALTER TABLE trackers
ADD COLUMN IF NOT EXISTS user_description TEXT DEFAULT NULL;;
