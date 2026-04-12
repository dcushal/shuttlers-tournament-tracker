import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nlbkaepsgsrxcmfdtqah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmthZXBzZ3NyeGNtZmR0cWFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDc1NDksImV4cCI6MjA4NTQyMzU0OX0.UktgZy1WjbrE-_ZY_gxWVnIIWoAkPY2BIsR6MTbLydc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Hard-reset baseline: verified post-March-Slam points for all 16 members.
// These values are written to starting_points in Supabase and become the
// permanent baseline from which future tournaments are calculated.
const POST_MARCH_SLAM_BASELINE = [
    { name: 'viru',        points: 117   },
    { name: 'saptarishi',  points: 84    },
    { name: 'aldrich',     points: 80    },
    { name: 'hritik',      points: 80    },
    { name: 'zaheer',      points: 77.5  },
    { name: 'dev',         points: 75.5  },
    { name: 'kushal',      points: 65    },
    { name: 'sam',         points: 53.5  },
    { name: 'sarvesh',     points: 46.5  },
    { name: 'sagar',       points: 30    },
    { name: 'dinesh',      points: 27    },
    { name: 'rohan',       points: 18    },
    { name: 'naveen',      points: 10    },
    { name: 'prashant',    points: 10    },
    { name: 'prasad',      points: 10    },
    { name: 'sanjay',      points: 7     },
];

// Only tournaments on/after this date are replayed on top of the baseline.
// This matches BASELINE_DATE in src/utils/rankingSystem.ts
// (used in the Supabase .gte() filter below)

// V3 scoring: top ceil(N/2) teams earn, formula scales with field size, no negatives.
function getPlacementPoints(rank, numTeams) {
    const numEarners = Math.ceil(numTeams / 2);
    if (rank > numEarners) return 0;
    return Math.round((numTeams * 2) * (numEarners + 1 - rank) / numEarners);
}

async function main() {
    // 1. Fetch all member players
    console.log('Fetching players...');
    const { data: players, error: pErr } = await supabase
        .from('players')
        .select('id, name, rank, type')
        .order('rank');
    if (pErr) { console.error(pErr); process.exit(1); }
    console.log(`Found ${players.length} players.`);

    // 2. Initialise stats from POST_MARCH_SLAM_BASELINE
    const stats = {};
    for (const p of players) {
        if (p.type === 'guest') continue;
        const baseline = POST_MARCH_SLAM_BASELINE.find(
            b => b.name === p.name.toLowerCase().trim()
        );
        const startingPts = baseline ? baseline.points : 10;
        stats[p.id] = {
            name: p.name,
            points: startingPts,
            startingPoints: startingPts,
            oldRank: p.rank,
        };
    }

    // 3. Fetch completed tournaments on/after BASELINE_DATE (oldest first)
    console.log('\nFetching tournaments from baseline date...');
    const { data: tournaments, error: tErr } = await supabase
        .from('tournaments')
        .select('id, name, date, status')
        .eq('status', 'completed')
        .gte('date', '2026-04-12')
        .order('date', { ascending: true });
    if (tErr) { console.error(tErr); process.exit(1); }
    console.log(`Found ${tournaments.length} tournament(s) to replay.`);

    // 4. Replay each tournament (V3 only)
    for (const tournament of tournaments) {
        console.log(`\n→ ${tournament.name} (${tournament.date}) [V3]`);

        const { data: teams, error: teErr } = await supabase
            .from('teams')
            .select('id, player1_id, player2_id')
            .eq('tournament_id', tournament.id);
        if (teErr) { console.error(teErr); continue; }

        const { data: matches, error: mErr } = await supabase
            .from('matches')
            .select('id, team_a_id, team_b_id, score_a, score_b, is_completed')
            .eq('tournament_id', tournament.id)
            .eq('is_completed', true);
        if (mErr) { console.error(mErr); continue; }

        // Calculate team standings
        const teamStats = {};
        for (const team of teams) {
            teamStats[team.id] = { won: 0, pointDiff: 0, player1_id: team.player1_id, player2_id: team.player2_id };
        }

        for (const match of matches) {
            const aWon = match.score_a > match.score_b;
            teamStats[match.team_a_id].won       += aWon ? 1 : 0;
            teamStats[match.team_b_id].won       += aWon ? 0 : 1;
            teamStats[match.team_a_id].pointDiff += match.score_a - match.score_b;
            teamStats[match.team_b_id].pointDiff += match.score_b - match.score_a;
        }

        const standings = Object.entries(teamStats)
            .map(([id, s]) => ({ id, ...s }))
            .sort((a, b) => b.won !== a.won ? b.won - a.won : b.pointDiff - a.pointDiff);

        const numTeams = standings.length;

        standings.forEach((standing, index) => {
            const rank = index + 1;
            const placement   = getPlacementPoints(rank, numTeams);
            const perfBonus   = standing.pointDiff > 0 ? standing.pointDiff / 2 : 0;
            const winBonus    = standing.won * 2; // V3 still has match win bonus
            const total       = placement + perfBonus + winBonus;

            const p1 = standing.player1_id;
            const p2 = standing.player2_id;

            console.log(`  #${rank}: team ${standing.id.slice(-6)} | placement=${placement} perf=+${perfBonus} wins=+${winBonus} → +${total}`);

            for (const pid of [p1, p2]) {
                if (stats[pid]) stats[pid].points += total;
            }
        });
    }

    // 5. Sort by points and assign ranks
    const sorted = Object.entries(stats)
        .map(([id, s]) => ({ id, ...s }))
        .sort((a, b) => b.points - a.points);

    console.log('\n--- NEW RANKINGS ---');
    sorted.forEach((p, i) => {
        const arrow = p.oldRank < i + 1 ? '↓' : p.oldRank > i + 1 ? '↑' : '=';
        console.log(`  #${i + 1} ${p.name.padEnd(14)} ${p.points.toFixed(1).padStart(7)} pts  (starting: ${p.startingPoints})  [was #${p.oldRank}] ${arrow}`);
    });

    // 6. Write back points, rank, previous_rank (always safe — these columns exist)
    console.log('\nUpdating Supabase (points + ranks)...');
    for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        const newRank = i + 1;
        const { error } = await supabase
            .from('players')
            .update({
                points: p.points,
                rank: newRank,
                previous_rank: p.oldRank,
            })
            .eq('id', p.id);

        if (error) {
            console.error(`  ✗ ${p.name}: ${error.message}`);
        } else {
            console.log(`  ✓ ${p.name}: ${p.points.toFixed(1)} pts → rank #${newRank}`);
        }
    }

    // 7. Try to write starting_points (requires migration to have been run first)
    console.log('\nUpdating starting_points...');
    for (const p of sorted) {
        const { error } = await supabase
            .from('players')
            .update({ starting_points: p.startingPoints })
            .eq('id', p.id);

        if (error) {
            if (error.message.includes('starting_points')) {
                console.warn(`  ⚠ starting_points column not found — run migrations/add_starting_points.sql in Supabase SQL editor first.`);
                break;
            }
            console.error(`  ✗ ${p.name}: ${error.message}`);
        } else {
            console.log(`  ✓ ${p.name}: starting_points = ${p.startingPoints}`);
        }
    }

    console.log('\n✅ Done. All clients will auto-refresh via Realtime.');
}

main().catch(err => { console.error(err); process.exit(1); });
