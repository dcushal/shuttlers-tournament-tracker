import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nlbkaepsgsrxcmfdtqah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmthZXBzZ3NyeGNtZmR0cWFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDc1NDksImV4cCI6MjA4NTQyMzU0OX0.UktgZy1WjbrE-_ZY_gxWVnIIWoAkPY2BIsR6MTbLydc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Starting points for original 10 members
const INITIAL_RANKINGS = [
    { name: 'viru',       points: 100 },
    { name: 'hritik',     points: 90  },
    { name: 'aldrich',    points: 80  },
    { name: 'kushal',     points: 70  },
    { name: 'dev',        points: 60  },
    { name: 'saptarishi', points: 50  },
    { name: 'sam',        points: 40  },
    { name: 'sagar',      points: 30  },
    { name: 'rohan',      points: 20  },
    { name: 'sarvesh',    points: 10  },
];

// Versioned placement points
// V1: before Feb 6 2026  — legacy fixed table, no match win bonus
// V2: Feb 6 – Apr 11 2026 — legacy fixed table + match win bonus
// V3: from Apr 12 2026   — scaled table (top half earns), no negatives
const V2_DATE = new Date('2026-02-06T19:00:00+05:30'); // 7 PM IST
const V3_DATE = new Date('2026-04-12T00:00:00+05:30'); // Shuttle Showdown

function getPlacementPoints(rank, numTeams, tDate) {
    const isV3 = tDate >= V3_DATE;
    if (isV3) {
        const numEarners = Math.ceil(numTeams / 2);
        if (rank > numEarners) return 0;
        return Math.round((numTeams * 2) * (numEarners + 1 - rank) / numEarners);
    } else {
        const legacy = [10, 5, 0, -5, -10];
        return legacy[rank - 1] ?? 0;
    }
}

async function main() {
    // 1. Fetch all players
    console.log('Fetching players...');
    const { data: players, error: pErr } = await supabase
        .from('players')
        .select('id, name, rank, type')
        .order('rank');
    if (pErr) { console.error(pErr); process.exit(1); }
    console.log(`Found ${players.length} players.`);

    // 2. Initialise stats from fixed base
    const stats = {};
    for (const p of players) {
        if (p.type === 'guest') continue;
        const initial = INITIAL_RANKINGS.find(
            ir => ir.name === p.name.toLowerCase().trim()
        );
        stats[p.id] = {
            name: p.name,
            points: initial ? initial.points : 10,
            oldRank: p.rank,
        };
    }

    // 3. Fetch completed tournaments (oldest first)
    console.log('\nFetching completed tournaments...');
    const { data: tournaments, error: tErr } = await supabase
        .from('tournaments')
        .select('id, name, date, status')
        .eq('status', 'completed')
        .order('date', { ascending: true });
    if (tErr) { console.error(tErr); process.exit(1); }
    console.log(`Found ${tournaments.length} completed tournaments.`);

    // 4. Process each tournament
    for (const tournament of tournaments) {
        const tDate = new Date(tournament.date);
        const isV2OrLater = tDate >= V2_DATE;
        const isV3 = tDate >= V3_DATE;
        console.log(`\n→ ${tournament.name} (${tournament.date}) [${isV3 ? 'V3' : isV2OrLater ? 'V2' : 'V1'}]`);

        // Fetch teams
        const { data: teams, error: teErr } = await supabase
            .from('teams')
            .select('id, player1_id, player2_id')
            .eq('tournament_id', tournament.id);
        if (teErr) { console.error(teErr); continue; }

        // Fetch completed matches
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
            teamStats[match.team_a_id].won        += aWon ? 1 : 0;
            teamStats[match.team_b_id].won        += aWon ? 0 : 1;
            teamStats[match.team_a_id].pointDiff  += match.score_a - match.score_b;
            teamStats[match.team_b_id].pointDiff  += match.score_b - match.score_a;
        }

        // Sort teams by wins then point diff
        const standings = Object.entries(teamStats)
            .map(([id, s]) => ({ id, ...s }))
            .sort((a, b) => b.won !== a.won ? b.won - a.won : b.pointDiff - a.pointDiff);

        const numTeams = standings.length;

        standings.forEach((standing, index) => {
            const rank = index + 1;
            const placement = getPlacementPoints(rank, numTeams, tDate);
            const perfBonus  = standing.pointDiff > 0 ? standing.pointDiff / 2 : 0;
            const winBonus   = isV2OrLater ? standing.won * 2 : 0;
            const total      = placement + perfBonus + winBonus;

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
        .filter(([, s]) => s !== undefined)
        .map(([id, s]) => ({ id, ...s }))
        .sort((a, b) => b.points - a.points);

    console.log('\n--- NEW RANKINGS ---');
    sorted.forEach((p, i) => {
        const arrow = p.oldRank < i + 1 ? '↓' : p.oldRank > i + 1 ? '↑' : '=';
        console.log(`  #${i + 1} ${p.name.padEnd(14)} ${p.points.toFixed(1).padStart(7)} pts  [was #${p.oldRank}] ${arrow}`);
    });

    // 6. Write back to Supabase
    console.log('\nUpdating Supabase...');
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

    console.log('\n✅ Done. All clients will auto-refresh via Realtime.');
}

main().catch(err => { console.error(err); process.exit(1); });
