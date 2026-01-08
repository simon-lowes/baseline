-- Add color validation constraint to trackers table
-- Ensures color values are valid hex color codes (#RRGGBB format)

DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'trackers_color_format_check'
    ) THEN
        ALTER TABLE trackers DROP CONSTRAINT trackers_color_format_check;
    END IF;

    -- Add new constraint to validate hex color format
    ALTER TABLE trackers ADD CONSTRAINT trackers_color_format_check
        CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

    RAISE NOTICE 'Color validation constraint added successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding color validation: %', SQLERRM;
END $$;

COMMENT ON CONSTRAINT trackers_color_format_check ON trackers IS
    'Validates that color is a valid hex color code in #RRGGBB format';
