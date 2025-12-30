-- Create trigger to auto-create default tracker for new users
CREATE OR REPLACE FUNCTION create_default_tracker_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO trackers (user_id, name, type, preset_id, icon, color, is_default)
  VALUES (
    NEW.id, 
    'Chronic Pain', 
    'preset', 
    'chronic_pain',
    'activity',
    '#ef4444',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_tracker'
  ) THEN
    CREATE TRIGGER on_auth_user_created_tracker
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_default_tracker_for_new_user();
  END IF;
END $$;

-- Add updated_at trigger for trackers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_trackers_updated_at ON trackers;
CREATE TRIGGER set_trackers_updated_at
  BEFORE UPDATE ON trackers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();;
