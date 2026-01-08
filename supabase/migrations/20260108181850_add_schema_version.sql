-- Add schema_version column to trackers table
-- Version 1 = legacy fixed schema (intensity, locations, triggers, notes, hashtags)
-- Version 2 = new flexible fields[] array system

ALTER TABLE trackers ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN trackers.schema_version IS 'Schema version: 1 = legacy fixed fields, 2 = custom fields array';

-- Create index for efficient querying by schema version
CREATE INDEX IF NOT EXISTS idx_trackers_schema_version ON trackers(schema_version);
