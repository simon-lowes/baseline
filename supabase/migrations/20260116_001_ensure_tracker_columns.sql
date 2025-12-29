-- Safety migration: ensure tracker columns exist in Supabase metadata
-- This guards against deployments where earlier migrations were not applied.

ALTER TABLE trackers
  ADD COLUMN IF NOT EXISTS confirmed_interpretation TEXT,
  ADD COLUMN IF NOT EXISTS generated_config JSONB,
  ADD COLUMN IF NOT EXISTS user_description TEXT;
