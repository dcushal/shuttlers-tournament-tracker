-- 1. Add 'type' column to players table (default 'member')
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'member';

-- 2. Create casual_matches table
CREATE TABLE IF NOT EXISTS casual_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Team A (Logger's team)
  team_a_player1_id UUID NOT NULL,
  team_a_player2_id UUID NOT NULL,
  team_a_score INTEGER NOT NULL,
  
  -- Team B (Opponents)
  team_b_player1_id UUID NOT NULL,
  team_b_player2_id UUID NOT NULL,
  team_b_score INTEGER NOT NULL,
  
  -- Metadata
  winner_team TEXT NOT NULL CHECK (winner_team IN ('a', 'b')),
  logged_by_user_id TEXT, -- Changed to TEXT to support usernames
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_casual_matches_date ON casual_matches(date);
CREATE INDEX IF NOT EXISTS idx_casual_matches_players ON casual_matches(team_a_player1_id, team_a_player2_id, team_b_player1_id, team_b_player2_id);

-- 4. Enable RLS (Open Access)
ALTER TABLE casual_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for now" ON casual_matches;

CREATE POLICY "Enable all access for now" ON casual_matches
FOR ALL USING (true) WITH CHECK (true);
