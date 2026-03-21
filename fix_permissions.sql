-- FIX PERMISSIONS FOR PLAYERS AND RELAX CONSTRAINTS
-- 1. Enable full access to 'players' table so guests can be added
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for players" ON players;

CREATE POLICY "Enable all access for players" ON players
FOR ALL USING (true) WITH CHECK (true);

-- 2. Relax Foreign Key constraints on casual_matches
-- This prevents race conditions where match is saved before the new guest player context reaches the server
ALTER TABLE casual_matches DROP CONSTRAINT IF EXISTS casual_matches_team_a_player1_id_fkey;
ALTER TABLE casual_matches DROP CONSTRAINT IF EXISTS casual_matches_team_a_player2_id_fkey;
ALTER TABLE casual_matches DROP CONSTRAINT IF EXISTS casual_matches_team_b_player1_id_fkey;
ALTER TABLE casual_matches DROP CONSTRAINT IF EXISTS casual_matches_team_b_player2_id_fkey;

-- 3. Double check casual_matches RLS
ALTER TABLE casual_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for casual_matches" ON casual_matches;
CREATE POLICY "Enable all access for casual_matches" ON casual_matches
FOR ALL USING (true) WITH CHECK (true);
