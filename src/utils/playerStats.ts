import { Player, Tournament } from '../types';

export type PerformanceStats = Record<string, { wins: number; matches: number; totalDiff: number }>;

export function computePlayerPerformanceStats(
  players: Player[],
  tournaments: Tournament[]
): PerformanceStats {
  const stats: PerformanceStats = {};
  players.forEach(p => { stats[p.id] = { wins: 0, matches: 0, totalDiff: 0 }; });

  tournaments.forEach(t => {
    t.matches.filter(m => m.isCompleted).forEach(m => {
      const teamA = t.teams.find(tm => tm.id === m.teamAId);
      const teamB = t.teams.find(tm => tm.id === m.teamBId);
      if (!teamA || !teamB) return;
      const winnerId = m.scoreA > m.scoreB ? m.teamAId : m.teamBId;
      [teamA, teamB].forEach(team => {
        const diff = team.id === m.teamAId ? (m.scoreA - m.scoreB) : (m.scoreB - m.scoreA);
        [team.player1.id, team.player2.id].forEach(pid => {
          if (!stats[pid]) return;
          stats[pid].matches++;
          stats[pid].totalDiff += diff;
          if (team.id === winnerId) stats[pid].wins++;
        });
      });
    });
  });

  return stats;
}
