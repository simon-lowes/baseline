-- Add hashtags column to pain_entries table
ALTER TABLE pain_entries 
ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}'::TEXT[];

-- Create index for hashtag searches
CREATE INDEX IF NOT EXISTS idx_pain_entries_hashtags ON pain_entries USING GIN (hashtags);;
