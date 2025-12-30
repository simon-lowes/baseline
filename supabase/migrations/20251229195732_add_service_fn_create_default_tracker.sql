-- Add a SECURITY DEFINER function to create a default tracker for a user
CREATE OR REPLACE FUNCTION create_default_tracker(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_tracker_id UUID;
BEGIN
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

  RETURN v_tracker_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
