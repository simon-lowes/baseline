-- Add user preferences columns to profiles table
-- These store theme and accessibility settings server-side for cross-device sync

-- Theme preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT 'zinc';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'light';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_accent TEXT;

-- Accessibility preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS patterns_enabled BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN profiles.theme_color IS 'Selected color theme (zinc, nature, rose, etc.)';
COMMENT ON COLUMN profiles.theme_mode IS 'Light/dark mode preference (light, dark, system)';
COMMENT ON COLUMN profiles.custom_accent IS 'Custom accent color in OKLch format';
COMMENT ON COLUMN profiles.patterns_enabled IS 'Whether colorblind-friendly chart patterns are enabled';

-- No new RLS policies needed - existing profiles policies already cover these columns
-- (Users can only read/update their own profile)
