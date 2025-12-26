-- Add image-related fields to trackers table
-- Migration: Add tracker image fields

ALTER TABLE trackers 
ADD COLUMN image_url TEXT,
ADD COLUMN image_generated_at TIMESTAMPTZ,
ADD COLUMN image_model_name TEXT;