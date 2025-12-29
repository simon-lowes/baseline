-- Migration: Remove on_auth_user_created_tracker trigger and wrapper function
-- Reason: trigger attempted to create a tracker inside auth.user transaction and failed due to RLS, aborting signups.

DROP TRIGGER IF EXISTS on_auth_user_created_tracker ON auth.users;

DROP FUNCTION IF EXISTS create_default_tracker_for_new_user();

-- Note: Default tracker creation is now handled by a secure service-role callable function and Edge Function.