-- Remove the trigger that attempted to create a default tracker during auth.user creation
-- This trigger can fail due to RLS when the INSERT runs in the auth transaction.

DROP TRIGGER IF EXISTS on_auth_user_created_tracker ON auth.users;

-- Also drop the trigger wrapper function
DROP FUNCTION IF EXISTS create_default_tracker_for_new_user();;
