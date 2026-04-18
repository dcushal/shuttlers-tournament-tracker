import { Player, Tournament } from '../types';
import { recalculatePlayerStats } from './rankingSystem';

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

export function computeLastTournamentDelta(
  players: Player[],
  tournaments: Tournament[]
): Record<string, number> {
  const lastCompleted = [...tournaments]
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (!lastCompleted) return {};

  const withoutLast = tournaments.filter(t => t.id !== lastCompleted.id);
  const after = recalculatePlayerStats(players, tournaments);
  const before = recalculatePlayerStats(players, withoutLast);

  const beforeMap: Record<string, number> = {};
  before.forEach(p => { beforeMap[p.id] = p.points; });

  const delta: Record<string, number> = {};
  after.forEach(p => {
    const d = p.points - (beforeMap[p.id] ?? p.points);
    delta[p.id] = Math.round(d * 10) / 10;
  });
  return delta;
}
