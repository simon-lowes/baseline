-- Migration: Add ambiguous terms table, confirmed_interpretation column, and enforcement trigger

-- 1. Create ambiguous_terms lookup table
CREATE TABLE IF NOT EXISTS ambiguous_terms (
  word TEXT PRIMARY KEY
);

-- 2. Populate with known ambiguous terms
INSERT INTO ambiguous_terms (word)
VALUES
  ('flying'),
  ('hockey'),
  ('curling'),
  ('reading'),
  ('drinking'),
  ('smoking'),
  ('shooting'),
  ('chilling'),
  ('running'),
  ('driving'),
  ('lifting'),
  ('bowling'),
  ('batting'),
  ('pressing'),
  ('cycling'),
  ('boxing'),
  ('climbing'),
  ('dancing'),
  ('walking'),
  ('fasting'),
  ('gaming'),
  ('training')
ON CONFLICT DO NOTHING;

-- 3. Add confirmed_interpretation column to trackers
ALTER TABLE trackers
  ADD COLUMN IF NOT EXISTS confirmed_interpretation TEXT;

-- 4. Trigger function to prevent creation of ambiguous-named trackers without confirmation
CREATE OR REPLACE FUNCTION enforce_interpretation_on_ambiguous_names()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- if the lowercase name is in ambiguous_terms and no confirmed_interpretation provided, reject
    IF EXISTS (SELECT 1 FROM ambiguous_terms WHERE word = lower(NEW.name)) AND NEW.confirmed_interpretation IS NULL THEN
      RAISE EXCEPTION 'Tracker name "%" is ambiguous and requires a confirmed interpretation before creation', NEW.name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger
DROP TRIGGER IF EXISTS trg_enforce_interpretation_on_ambiguous_names ON trackers;
CREATE TRIGGER trg_enforce_interpretation_on_ambiguous_names
  BEFORE INSERT ON trackers
  FOR EACH ROW
  EXECUTE FUNCTION enforce_interpretation_on_ambiguous_names();
