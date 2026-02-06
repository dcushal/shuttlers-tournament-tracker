-- Add is_checked_in column to players table
ALTER TABLE players 
ADD COLUMN is_checked_in BOOLEAN DEFAULT false;

-- Update existing rows to have false (handled by default, but good to be explicit if needed)
UPDATE players SET is_checked_in = false WHERE is_checked_in IS NULL;
