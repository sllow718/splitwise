-- Migration: Add settlement_date column to settlements table
-- Description: Add settlement_date column to track when settlement occurred

-- Add settlement_date column to settlements table
ALTER TABLE settlements 
ADD COLUMN IF NOT EXISTS settlement_date DATE DEFAULT CURRENT_DATE;
