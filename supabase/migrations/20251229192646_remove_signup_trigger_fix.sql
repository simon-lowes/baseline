-- Remove the failing trigger and wrapper function that attempted to create a tracker during auth.user creation
DROP TRIGGER IF EXISTS on_auth_user_created_tracker ON auth.users;

DROP FUNCTION IF EXISTS create_default_tracker_for_new_user();
;
