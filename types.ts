
export interface Player {
  id: string;
  name: string;
  points: number;
  rank: number;
  previousRank: number;
}

export interface Team {
  id: string;
  player1: Player;
  player2: Player;
}

export interface Match {
  id: string;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  isCompleted: boolean;
  phase: 'round-robin' | 'semi-finals' | 'finals';
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  pointLimit: 11 | 15 | 21;
  teams: Team[];
  matches: Match[];
  currentPhase: 'round-robin' | 'semi-finals' | 'finals' | 'completed';
  status: 'active' | 'completed';
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
}

export interface Transaction {
  id: string;
  playerId: string;
  amount: number; // Positive for debt (cost), negative for payment (settled)
  description: string;
  date: string;
  type: 'expense' | 'payment';
}

export interface CasualMatch {
  id: string;
  team1: Player[];
  team2: Player[];
  score1: number;
  score2: number;
  date: string;
}
export interface HallOfFameEntry {
  id: string;
  teamName: string;
  date: string;
}
