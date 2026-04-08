-- CRITICAL DATABASE FIX SCRIPT
-- Run this in your Supabase SQL Editor to fix Guest Persistence

-- 1. Add missing columns to 'players' table
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_checked_in BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'member';

-- 2. Update existing rows to have default values (prevents null issues)
UPDATE players SET is_checked_in = FALSE WHERE is_checked_in IS NULL;
UPDATE players SET type = 'member' WHERE type IS NULL;

-- 3. Ensure 'casual_matches' supports text IDs (for guest compatibility)
ALTER TABLE casual_matches ALTER COLUMN logged_by_user_id TYPE TEXT;
ALTER TABLE casual_matches ALTER COLUMN team_a_player1_id TYPE TEXT;
ALTER TABLE casual_matches ALTER COLUMN team_a_player2_id TYPE TEXT;
ALTER TABLE casual_matches ALTER COLUMN team_b_player1_id TYPE TEXT;
ALTER TABLE casual_matches ALTER COLUMN team_b_player2_id TYPE TEXT;

-- 4. Enable efficient querying
CREATE INDEX IF NOT EXISTS idx_players_type ON players(type);
