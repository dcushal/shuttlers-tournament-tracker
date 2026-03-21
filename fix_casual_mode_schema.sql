-- FIX SCRIPT FOR CASUAL MATCHES
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Change logged_by_user_id to TEXT to match app usage (username strings)
ALTER TABLE casual_matches 
ALTER COLUMN logged_by_user_id TYPE TEXT;

-- 2. Drop Foreign Key constraints if they are causing issues with guest players
-- It's safer for this app to not strictly enforce FKs if sync is not perfect
ALTER TABLE casual_matches DROP CONSTRAINT IF EXISTS casual_matches_team_a_player1_id_fkey;
ALTER TABLE casual_matches DROP CONSTRAINT IF EXISTS casual_matches_team_a_player2_id_fkey;
ALTER TABLE casual_matches DROP CONSTRAINT IF EXISTS casual_matches_team_b_player1_id_fkey;
ALTER TABLE casual_matches DROP CONSTRAINT IF EXISTS casual_matches_team_b_player2_id_fkey;

-- 3. Ensure RLS is disabled or allows everything (Open Access)
ALTER TABLE casual_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for now" ON casual_matches;

CREATE POLICY "Enable all access for now" ON casual_matches
FOR ALL USING (true) WITH CHECK (true);

-- 4. Verify existing data (Optional)
-- SELECT * FROM casual_matches;
