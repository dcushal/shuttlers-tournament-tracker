import { Player, Tournament } from '../types';

// Initial rankings as a fallback/starting point
const INITIAL_RANKINGS: { name: string; points: number }[] = [
    { name: "Viru", points: 100 },
    { name: "Hritik", points: 90 },
    { name: "Aldrich", points: 80 },
    { name: "Kushal", points: 70 },
    { name: "Dev", points: 60 },
    { name: "Saptarishi", points: 50 },
    { name: "Sam", points: 40 },
    { name: "Sagar", points: 30 },
    { name: "Rohan", points: 20 },
    { name: "Sarvesh", points: 10 }
];

export function recalculatePlayerStats(players: Player[], tournaments: Tournament[]): Player[] {
    // 1. Filter for completed tournaments and sort by date (oldest first)
    // We assume 'created_at' or 'date' can be used. using 'date' here as it's more reliable for user-set dates.
    const completedTournaments = tournaments
        .filter(t => t.status === 'completed')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Helper to calculate points for a specific set of tournaments
    const calculateState = (tourns: Tournament[]) => {
        // Start with base points
        const currentStats: Record<string, { points: number; matches: number; wins: number; totalDiff: number }> = {};

        persons.forEach(p => {
            const initial = INITIAL_RANKINGS.find(ir => ir.name.toLowerCase() === p.name.toLowerCase());
            currentStats[p.id] = {
                points: initial ? initial.points : 0,
                matches: 0,
                wins: 0,
                totalDiff: 0
            };
        });

        // Replay history
        tourns.forEach(t => {
            // 1. Calculate Standings for this tournament
            const stats: Record<string, { won: number; pointDiff: number; teamId: string }> = {};
            t.teams.forEach(team => {
                stats[team.id] = { teamId: team.id, won: 0, pointDiff: 0 };
            });

            const completedMatches = t.matches.filter(m => m.isCompleted);

            completedMatches.forEach(match => {
                const isA = match.scoreA > match.scoreB;
                stats[match.teamAId].won += isA ? 1 : 0;
                stats[match.teamBId].won += isA ? 0 : 1;
                stats[match.teamAId].pointDiff += (match.scoreA - match.scoreB);
                stats[match.teamBId].pointDiff += (match.scoreB - match.scoreA);

                // Update player performance stats (matches, wins, diff)
                const teamA = t.teams.find(tm => tm.id === match.teamAId);
                const teamB = t.teams.find(tm => tm.id === match.teamBId);

                if (teamA && teamB) {
                    const updatePlayerStats = (pid: string, isWinner: boolean, diff: number) => {
                        if (currentStats[pid]) {
                            currentStats[pid].matches++;
                            currentStats[pid].totalDiff += diff;
                            if (isWinner) currentStats[pid].wins++;
                        }
                    };

                    const diffA = match.scoreA - match.scoreB;
                    const diffB = match.scoreB - match.scoreA;

                    [teamA.player1.id, teamA.player2.id].forEach(pid => updatePlayerStats(pid, isA, diffA));
                    [teamB.player1.id, teamB.player2.id].forEach(pid => updatePlayerStats(pid, !isA, diffB));
                }
            });

            const sortedStandings = Object.values(stats).sort((a, b) =>
                b.won !== a.won ? b.won - a.won : b.pointDiff - a.pointDiff
            );

            // 2. Award Points
            const pointRewards = [10, 5, 0, -5, -10];

            sortedStandings.forEach((standing, index) => {
                const reward = pointRewards[index] || 0;
                const performanceBonus = standing.pointDiff > 0 ? standing.pointDiff / 2 : 0;

                // Ensure bonus is only added if result is positive (safety check, though logic says it is)
                const totalPointsAwarded = reward + (performanceBonus > 0 ? performanceBonus : 0);

                const team = t.teams.find(tm => tm.id === standing.teamId);
                if (team) {
                    [team.player1.id, team.player2.id].forEach(pid => {
                        if (currentStats[pid]) {
                            currentStats[pid].points += totalPointsAwarded;
                        }
                    });
                }
            });
        });

        return currentStats;
    };

    // We need a list of all players to initialize stats. 
    // Using the passed players array to ensure we capture everyone.
    const persons = players;

    // PASS 1: Calculate "Previous" state (all tournaments minus the last one)
    // If there are no completed tournaments, previous state is just initial state.
    const previousTournaments = completedTournaments.slice(0, -1);
    const previousState = calculateState(previousTournaments);

    // Calculate ranks for previous state
    const previousRankedList = persons.map(p => ({
        id: p.id,
        points: previousState[p.id]?.points || 0,
        wins: previousState[p.id]?.wins || 0,
        matches: previousState[p.id]?.matches || 0,
        totalDiff: previousState[p.id]?.totalDiff || 0
    })).sort((a, b) => {
        // Sort logic same as main app
        if (b.points !== a.points) return b.points - a.points;
        const wrA = a.matches > 0 ? a.wins / a.matches : 0;
        const wrB = b.matches > 0 ? b.wins / b.matches : 0;
        if (wrB !== wrA) return wrB - wrA;
        return (b.totalDiff / 2) - (a.totalDiff / 2);
    });

    // Create a map of ID -> Previous Rank
    const previousRankMap = new Map<string, number>();
    previousRankedList.forEach((p, idx) => previousRankMap.set(p.id, idx + 1));


    // PASS 2: Calculate "Current" state (all completed tournaments)
    const currentState = calculateState(completedTournaments);

    // Final Sort and Map
    return persons.map(p => {
        const stats = currentState[p.id];
        return {
            ...p,
            points: stats ? stats.points : 0,
            // We attach temp stats for sorting, will remove before return if strictly needed, 
            // but Player type doesn't have these fields, so we just use them for sorting below.
            _tempWins: stats ? stats.wins : 0,
            _tempMatches: stats ? stats.matches : 0,
            _tempDiff: stats ? stats.totalDiff : 0,
        };
    }).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const wrA = a._tempMatches > 0 ? a._tempWins / a._tempMatches : 0;
        const wrB = b._tempMatches > 0 ? b._tempWins / b._tempMatches : 0;
        if (wrB !== wrA) return wrB - wrA;
        return (b._tempDiff / 2) - (a._tempDiff / 2);
    }).map((p, index) => ({
        id: p.id,
        name: p.name,
        points: p.points,
        rank: index + 1,
        previousRank: previousRankMap.get(p.id) || (index + 1) // Default to current rank if not found (e.g. new player)
    }));
}
