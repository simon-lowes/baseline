-- Add AI-generated tracker config and user description fields
-- These are required by the app when creating trackers (custom or preset)

ALTER TABLE trackers
  ADD COLUMN IF NOT EXISTS generated_config JSONB,
  ADD COLUMN IF NOT EXISTS user_description TEXT;
