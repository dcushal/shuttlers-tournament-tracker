-- Add starting_points column to players table
-- This stores each player's fixed baseline so recalculation is always idempotent.
ALTER TABLE players ADD COLUMN IF NOT EXISTS starting_points NUMERIC DEFAULT 10;
UPDATE players SET starting_points = 10 WHERE starting_points IS NULL;
