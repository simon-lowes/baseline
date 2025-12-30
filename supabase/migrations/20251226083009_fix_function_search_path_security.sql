-- Fix search_path security warning for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix search_path security warning for create_default_tracker_for_new_user
CREATE OR REPLACE FUNCTION public.create_default_tracker_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.trackers (user_id, name, type, preset_id, icon, color, is_default)
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
$$;

-- Fix search_path security warning for migrate_user_to_trackers
CREATE OR REPLACE FUNCTION public.migrate_user_to_trackers(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_tracker_id UUID;
BEGIN
  -- Check if user already has a default tracker
  SELECT id INTO v_tracker_id 
  FROM public.trackers 
  WHERE user_id = p_user_id AND is_default = true
  LIMIT 1;
  
  -- If no default tracker exists, create one
  IF v_tracker_id IS NULL THEN
    INSERT INTO public.trackers (user_id, name, type, preset_id, icon, color, is_default)
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
  UPDATE public.pain_entries 
  SET tracker_id = v_tracker_id 
  WHERE user_id = p_user_id AND tracker_id IS NULL;
  
  RETURN v_tracker_id;
END;
$$;;
