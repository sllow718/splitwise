-- Migration: Add image_url column to groups table for profile pictures
-- run this after deploying the schema from supabase/schema.sql

ALTER TABLE IF EXISTS groups
ADD COLUMN IF NOT EXISTS image_url TEXT;
