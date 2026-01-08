-- Add field_values column to tracker_entries table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tracker_entries' AND column_name = 'field_values'
    ) THEN
        ALTER TABLE tracker_entries ADD COLUMN field_values JSONB DEFAULT '{}';

        COMMENT ON COLUMN tracker_entries.field_values IS 'Custom field values for schema_version 2 trackers, stored as key-value pairs';

        CREATE INDEX idx_tracker_entries_field_values ON tracker_entries USING GIN (field_values);
    END IF;
END $$;
