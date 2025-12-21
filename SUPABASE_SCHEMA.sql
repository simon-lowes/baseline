-- =============================================================================
-- Chronic Pain Diary - Supabase Schema
-- =============================================================================
-- Run this in your Supabase SQL Editor to set up the database schema.
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- =============================================================================
-- 1. PROFILES TABLE
-- =============================================================================
-- Stores additional user profile data beyond what auth.users provides

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 2. PAIN ENTRIES TABLE
-- =============================================================================
-- Main application data - each entry belongs to a user

CREATE TABLE IF NOT EXISTS pain_entries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp BIGINT NOT NULL,
  intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 10),
  locations TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT DEFAULT '',
  triggers TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user-scoped queries
CREATE INDEX IF NOT EXISTS pain_entries_user_id_idx ON pain_entries(user_id);
CREATE INDEX IF NOT EXISTS pain_entries_timestamp_idx ON pain_entries(timestamp DESC);

-- =============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Users can only access their own data

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_entries ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PROFILES POLICIES
-- -----------------------------------------------------------------------------

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- PAIN ENTRIES POLICIES
-- -----------------------------------------------------------------------------

-- Users can read their own entries
CREATE POLICY "Users can read own pain entries"
  ON pain_entries FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own entries
CREATE POLICY "Users can insert own pain entries"
  ON pain_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries
CREATE POLICY "Users can update own pain entries"
  ON pain_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own entries
CREATE POLICY "Users can delete own pain entries"
  ON pain_entries FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 4. UPDATED_AT TRIGGER
-- =============================================================================
-- Automatically update the updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pain_entries_updated_at
  BEFORE UPDATE ON pain_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- MIGRATION NOTE
-- =============================================================================
-- If you have existing pain_entries without user_id, you'll need to either:
-- 1. Delete them: DELETE FROM pain_entries WHERE user_id IS NULL;
-- 2. Assign to a user: UPDATE pain_entries SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
-- 
-- The user_id column is NOT NULL, so existing rows without it will cause issues.
-- =============================================================================
