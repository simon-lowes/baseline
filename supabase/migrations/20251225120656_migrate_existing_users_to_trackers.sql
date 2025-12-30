-- Function to create default tracker and migrate entries for a user
CREATE OR REPLACE FUNCTION migrate_user_to_trackers(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_tracker_id UUID;
BEGIN
  -- Check if user already has a default tracker
  SELECT id INTO v_tracker_id 
  FROM trackers 
  WHERE user_id = p_user_id AND is_default = true
  LIMIT 1;
  
  -- If no default tracker exists, create one
  IF v_tracker_id IS NULL THEN
    INSERT INTO trackers (user_id, name, type, preset_id, icon, color, is_default)
    VALUES (
      p_user_id, 
      'Chronic Pain', 
      'preset', 
      'chronic_pain',
      'activity',
      '#ef4444',
      true
    )
    RETURNING id INTO v_tracker_id;
  END IF;
  
  -- Migrate all entries without a tracker_id to the default tracker
  UPDATE pain_entries 
  SET tracker_id = v_tracker_id 
  WHERE user_id = p_user_id AND tracker_id IS NULL;
  
  RETURN v_tracker_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate all existing users who have entries
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM pain_entries WHERE tracker_id IS NULL
  LOOP
    PERFORM migrate_user_to_trackers(r.user_id);
  END LOOP;
END $$;;
