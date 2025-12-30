-- =============================================================================
-- Migration: Add user_id column and RLS to existing pain_entries table
-- =============================================================================

-- 1. PROFILES TABLE (new)
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

-- 2. ADD user_id COLUMN TO EXISTING pain_entries TABLE
-- First add as nullable, then we'll handle existing data
ALTER TABLE pain_entries 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add other columns that might be missing
ALTER TABLE pain_entries
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE pain_entries
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS pain_entries_user_id_idx ON pain_entries(user_id);
CREATE INDEX IF NOT EXISTS pain_entries_timestamp_idx ON pain_entries(timestamp DESC);

-- 3. ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_entries ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- PAIN ENTRIES POLICIES
DROP POLICY IF EXISTS "Users can read own pain entries" ON pain_entries;
CREATE POLICY "Users can read own pain entries"
  ON pain_entries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own pain entries" ON pain_entries;
CREATE POLICY "Users can insert own pain entries"
  ON pain_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pain entries" ON pain_entries;
CREATE POLICY "Users can update own pain entries"
  ON pain_entries FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own pain entries" ON pain_entries;
CREATE POLICY "Users can delete own pain entries"
  ON pain_entries FOR DELETE
  USING (auth.uid() = user_id);

-- 4. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pain_entries_updated_at ON pain_entries;
CREATE TRIGGER update_pain_entries_updated_at
  BEFORE UPDATE ON pain_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;
