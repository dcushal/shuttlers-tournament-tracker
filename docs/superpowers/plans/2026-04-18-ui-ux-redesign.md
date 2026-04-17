# UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate Shuttlers to a premium Strava-tier UI with a personalized member dashboard, expandable roster stat pills, podium rankings, and purposeful GSAP animations — while removing the unused Casual mode entirely.

**Architecture:** Tournament-only single-mode app. Dashboard is role-aware: members see a "Your Season" hero card with animated counters; admins see the club overview. Rankings gains a podium strip and visual stat bars. Roster becomes a GSAP-powered accordion. GSAP handles all motion; all animations respect `prefers-reduced-motion`.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, GSAP + @gsap/react, Lucide React, Supabase.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/playerStats.ts` | **Create** | Shared `computePlayerPerformanceStats()` used by Dashboard + Rankings |
| `src/components/DashboardHeroCard.tsx` | **Create** | Personalized hero card with GSAP counters (member-only) |
| `src/index.css` | **Modify** | Add `.stat-hero`, `.pill-expand`, `.rank-delta-up`, `.rank-delta-down` |
| `src/App.tsx` | **Modify** | Remove casual mode, add GSAP tab transitions + nav micro-interactions |
| `src/components/Dashboard.tsx` | **Modify** | Import DashboardHeroCard, show it for members |
| `src/components/Rankings.tsx` | **Modify** | Podium strip, delta pill badges, win rate bar, personal highlight, GSAP stagger |
| `src/components/PlayersList.tsx` | **Modify** | Expandable accordion pills with GSAP spring |
| `src/components/Header.tsx` | **Modify** | Remove `mode` prop (no longer needed) |
| `src/components/ModeSelector.tsx` | **Delete** | No longer needed — single mode |
| `src/components/CasualHome.tsx` | **Delete** | Casual mode removed |
| `src/components/CasualStats.tsx` | **Delete** | Casual mode removed |
| `src/components/CasualLeaderboard.tsx` | **Delete** | Casual mode removed |
| `src/components/MatchHistory.tsx` | **Delete** | Casual mode removed |
| `src/components/LogMatch.tsx` | **Delete** | Casual mode removed |
| `src/components/ScrollPicker.tsx` | **Delete** | Used only by LogMatch |
| `src/components/AddGuestModal.tsx` | **Delete** | Used only by LogMatch |

---

## Task 1: Install GSAP

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install packages**

```bash
cd "/Users/home/Public/WORKSPACE/shuttlers-tournament-tracker "
npm install gsap @gsap/react
```

Expected output: `added 2 packages` (or similar), no errors.

- [ ] **Step 2: Verify TypeScript can see types**

```bash
npm run build 2>&1 | head -20
```

Expected: build succeeds (GSAP ships its own `.d.ts` files). If you see `Cannot find module 'gsap'`, run `npm install gsap@3 @gsap/react` explicitly.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install gsap and @gsap/react"
```

---

## Task 2: Extract Player Performance Stats Utility

**Files:**
- Create: `src/utils/playerStats.ts`
- Modify: `src/components/Rankings.tsx` (swap inline useMemo for utility)

The `playerPerformanceStats` logic currently lives inline in Rankings.tsx. Dashboard needs the same data. Extract it to a shared utility.

- [ ] **Step 1: Create `src/utils/playerStats.ts`**

```typescript
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
```

- [ ] **Step 2: Update Rankings.tsx to use the utility**

In `src/components/Rankings.tsx`, replace the inline `playerPerformanceStats` useMemo:

```tsx
// Add import at top:
import { computePlayerPerformanceStats } from '../utils/playerStats';

// Replace the useMemo block (around line 65-90) with:
const playerPerformanceStats = useMemo(
  () => computePlayerPerformanceStats(players, tournaments),
  [players, tournaments]
);
```

Remove the old inline stats computation block entirely.

- [ ] **Step 3: Verify build passes**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ built in` with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/playerStats.ts src/components/Rankings.tsx
git commit -m "refactor: extract computePlayerPerformanceStats to shared utility"
```

---

## Task 3: Remove Casual Mode

**Files:**
- Delete: 7 component files (listed below)
- Modify: `src/App.tsx`
- Delete: `src/components/ModeSelector.tsx`

- [ ] **Step 1: Delete casual component files**

```bash
cd "/Users/home/Public/WORKSPACE/shuttlers-tournament-tracker "
rm src/components/CasualHome.tsx
rm src/components/CasualStats.tsx
rm src/components/CasualLeaderboard.tsx
rm src/components/MatchHistory.tsx
rm src/components/LogMatch.tsx
rm src/components/ScrollPicker.tsx
rm src/components/AddGuestModal.tsx
rm src/components/ModeSelector.tsx
```

- [ ] **Step 2: Replace App.tsx with the cleaned version**

Replace the entire contents of `src/App.tsx` with the following. Key changes from the original: removed `mode` state, `casualTab` state, all casual imports, `renderCasualContent()`, casual bottom nav block, `ModeSelector` import, and the `if (!mode)` branch. The app now renders tournament mode directly after login.

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Player, Tournament, Match, Transaction, HallOfFameEntry } from './types';
import { usePlayers, useTournaments, useTransactions, useHallOfFame } from './hooks/useSupabase';
import { supabase } from './lib/supabase';
import Dashboard from './components/Dashboard';
import PlayersList from './components/PlayersList';
import TournamentManager from './components/TournamentManager';
import History from './components/History';
import Insights from './components/Insights';
import ProfileModal from './components/ProfileModal';
import Header from './components/Header';
import Rankings from './components/Rankings';
import Login from './components/Login';
import { Trophy, Users, LayoutDashboard, Crown, Lightbulb } from 'lucide-react';
import { recalculatePlayerStats } from './utils/rankingSystem';

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

const INITIAL_HALL_OF_FAME: HallOfFameEntry[] = [
  { id: '1', teamName: 'Rohan & Hritik', date: '2026-01-18' },
  { id: '2', teamName: 'Aldrich & Sam', date: '2025-12-20' },
  { id: '3', teamName: 'Kushal & Hritik', date: '2025-11-09' },
  { id: '4', teamName: 'Viru & Sam', date: '2025-05-10' },
  { id: '5', teamName: 'Viru & Sarvesh', date: '2025-04-27' },
  { id: '6', teamName: 'Kushal & Hritik', date: '2025-04-20' }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rankings' | 'history' | 'treasury' | 'tournament' | 'players' | 'insights'>('dashboard');
  const [profileModalPlayer, setProfileModalPlayer] = useState<Player | null>(null);

  const [user, setUser] = useState<{ role: 'admin' | 'member'; name: string } | null>(() => {
    const saved = localStorage.getItem('shuttlers_user');
    return saved ? JSON.parse(saved) : null;
  });

  const {
    players,
    setPlayers,
    addPlayer,
    deletePlayer,
    toggleCheckIn,
    updatePlayerAvatar,
    loading: playersLoading,
    refetch: refreshPlayers
  } = usePlayers(() => {
    const saved = localStorage.getItem('shuttlers_players');
    let loadedPlayers: Player[] = [];

    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) {
        const validPlayers = parsed.filter((p: any) => typeof p === 'object' && p !== null && p.name && p.id);
        const seen = new Set<string>();
        const uniquePlayers: Player[] = [];
        validPlayers.forEach((p: any) => {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            uniquePlayers.push(p);
          }
        });
        loadedPlayers = uniquePlayers.map((p: any) => {
          const initial = INITIAL_RANKINGS.find(ir => ir.name.toLowerCase() === p.name.toLowerCase());
          const hasPoints = typeof p.points === 'number' && !isNaN(p.points);
          const points = hasPoints ? p.points : (initial ? initial.points : 0);
          return { ...p, points, rank: p.rank || 11, previousRank: p.previousRank || p.rank || 11 };
        });
      }
    }

    if (loadedPlayers.length === 0) {
      loadedPlayers = INITIAL_RANKINGS.map((p, index) => ({
        id: Math.random().toString(36).substring(2, 11),
        name: p.name,
        points: p.points,
        rank: index + 1,
        previousRank: index + 1
      }));
    }

    return [...loadedPlayers]
      .sort((a, b) => b.points - a.points)
      .map((p, index) => ({ ...p, rank: index + 1 }));
  });

  const { tournaments, setTournaments, createTournament, updateTournament, deleteTournament } = useTournaments(() => {
    const saved = localStorage.getItem('shuttlers_tournaments');
    return saved ? JSON.parse(saved) : [];
  });

  const { transactions, setTransactions } = useTransactions(() => {
    const saved = localStorage.getItem('shuttlers_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const { hallOfFame, setHallOfFame, loading: hofLoading } = useHallOfFame(() => {
    const saved = localStorage.getItem('shuttlers_hof');
    return saved ? JSON.parse(saved) : INITIAL_HALL_OF_FAME;
  });

  useEffect(() => { localStorage.setItem('shuttlers_players', JSON.stringify(players)); }, [players]);
  useEffect(() => { localStorage.setItem('shuttlers_tournaments', JSON.stringify(tournaments)); }, [tournaments]);
  useEffect(() => { localStorage.setItem('shuttlers_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('shuttlers_hof', JSON.stringify(hallOfFame)); }, [hallOfFame]);
  useEffect(() => { if (user) localStorage.setItem('shuttlers_user', JSON.stringify(user)); }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('shuttlers_user');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={(role, name) => setUser({ role, name })} players={players} />;
  }

  const currentPlayer = players.find(p => p.name.toLowerCase() === user.name.toLowerCase());
  const checkedInIds = players.filter(p => p.isCheckedIn).map(p => p.id);
  const tournamentPlayers = players.filter(p => p.type !== 'guest');
  const activeTournament = tournaments.find(t => t.status === 'active');

  const handleToggleCheckIn = (id: string) => {
    const player = players.find(p => p.id === id);
    if (player) toggleCheckIn(id, !player.isCheckedIn);
  };

  const handleUpdateTournament = (updatedTournament: Tournament) => {
    updateTournament(updatedTournament);
  };

  const createNewTournament = (newTournament: Tournament) => {
    createTournament(newTournament);
  };

  const handleCompleteTournament = async (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;
    const updatedTournament = { ...tournament, status: 'completed' as const };
    const updatedTournaments = tournaments.map(t => t.id === tournamentId ? updatedTournament : t);
    const reRankedPlayers = recalculatePlayerStats(players, updatedTournaments);
    setPlayers(reRankedPlayers);
    const finalMatch = tournament.matches.find(m => m.phase === 'finals' && m.isCompleted);
    if (finalMatch) {
      const winnerId = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamAId : finalMatch.teamBId;
      const winnerTeam = tournament.teams.find(t => t.id === winnerId);
      if (winnerTeam) {
        const entry: HallOfFameEntry = {
          id: Math.random().toString(36).substring(2, 11),
          teamName: `${winnerTeam.player1.name} & ${winnerTeam.player2.name}`,
          date: new Date().toISOString().split('T')[0]
        };
        setHallOfFame([entry, ...hallOfFame]);
      }
    }
    setTournaments(updatedTournaments);
    updateTournament(updatedTournament);
  };

  const handleSyncRankings = async (): Promise<boolean> => {
    try { await refreshPlayers(); return true; } catch { return false; }
  };

  const handleDeleteTournament = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tournament entry? This will permanently affect rankings and stats.")) return;
    const tournamentToDelete = tournaments.find(t => t.id === id);
    const remainingTournaments = tournaments.filter(t => t.id !== id);
    const reRankedPlayers = recalculatePlayerStats(players, remainingTournaments);
    setPlayers(reRankedPlayers);
    setTournaments(remainingTournaments);
    if (tournamentToDelete?.status === 'completed') {
      const finalMatch = tournamentToDelete.matches.find(m => m.phase === 'finals' && m.isCompleted);
      if (finalMatch) {
        const winnerId = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamAId : finalMatch.teamBId;
        const winnerTeam = tournamentToDelete.teams.find(t => t.id === winnerId);
        if (winnerTeam) {
          const winnerTeamName = `${winnerTeam.player1.name} & ${winnerTeam.player2.name}`;
          const tournamentDate = new Date(tournamentToDelete.date).toISOString().split('T')[0];
          const hofEntryToDelete = hallOfFame.find(h => h.date === tournamentDate && h.teamName === winnerTeamName);
          if (hofEntryToDelete) {
            setHallOfFame(prev => prev.filter(h => h.id !== hofEntryToDelete.id));
            if (supabase) {
              supabase.from('hall_of_fame').delete().eq('id', hofEntryToDelete.id).then(({ error }) => {
                if (error) console.error("Failed to delete HOF entry", error);
              });
            }
          }
        }
      }
    }
    deleteTournament(id);
  };

  const resetData = () => {
    if (!confirm("Are you sure you want to RESET all data? This cannot be undone.")) return;
    setTournaments([]);
    setTransactions([]);
    setPlayers(recalculatePlayerStats(players, []));
    alert("System Data & Global Rankings have been reset successfully.");
  };

  const deleteHOF = (id: string) => {
    if (confirm("Are you sure you want to remove this legend from the Hall of Fame?")) {
      setHallOfFame(hallOfFame.filter(entry => entry.id !== id));
    }
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-green-500/30">
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative px-4 pt-6">
        <Header
          onLogout={handleLogout}
          user={user}
          currentPlayer={currentPlayer}
          onOpenProfile={currentPlayer ? () => setProfileModalPlayer(currentPlayer) : undefined}
        />

        <main className="flex-1 mt-6 mb-[100px]" id="tab-content">
          {activeTab === 'dashboard' && (
            <Dashboard
              players={tournamentPlayers}
              tournaments={tournaments}
              activeTournament={activeTournament}
              transactions={transactions}
              hallOfFame={hallOfFame}
              user={user}
              currentPlayer={currentPlayer}
              onNavigate={setActiveTab}
              onResetData={resetData}
              onDeleteHOF={deleteHOF}
            />
          )}
          {activeTab === 'rankings' && (
            <Rankings
              players={tournamentPlayers}
              tournaments={tournaments}
              isAdmin={user.role === 'admin'}
              onSyncRankings={handleSyncRankings}
              currentPlayerId={currentPlayer?.id}
            />
          )}
          {activeTab === 'history' && (
            <History tournaments={tournaments} onDelete={handleDeleteTournament} players={players} />
          )}
          {activeTab === 'tournament' && (
            <TournamentManager
              players={tournamentPlayers}
              checkedInIds={checkedInIds}
              tournaments={tournaments}
              activeTournament={activeTournament}
              onCreate={createNewTournament}
              onUpdate={handleUpdateTournament}
              onComplete={handleCompleteTournament}
              onEndSession={() => setActiveTab('rankings')}
              user={user}
            />
          )}
          {activeTab === 'players' && (
            <PlayersList
              players={tournamentPlayers}
              setPlayers={setPlayers}
              addPlayer={addPlayer}
              deletePlayer={deletePlayer}
              tournaments={tournaments}
              user={user}
              checkedInIds={checkedInIds}
              onToggleCheckIn={handleToggleCheckIn}
              onOpenProfile={(player) => setProfileModalPlayer(player)}
              currentPlayerId={currentPlayer?.id}
            />
          )}
          {activeTab === 'insights' && (
            <Insights
              tournaments={tournaments}
              hallOfFame={hallOfFame}
              onDeleteTournament={handleDeleteTournament}
              isAdmin={user.role === 'admin'}
            />
          )}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 liquid-bottom-nav">
          <div className="max-w-md mx-auto flex items-center justify-between gap-2">
            {([
              { tab: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
              { tab: 'players',   icon: Users,           label: 'Roster' },
              { tab: 'rankings',  icon: Crown,           label: 'Ranks' },
              { tab: 'insights',  icon: Lightbulb,       label: 'Stats' },
            ] as const).map(({ tab, icon: Icon, label }) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`liquid-nav-item flex flex-col items-center gap-1.5 py-3 px-4 rounded-2xl transition-all ${activeTab === tab ? 'active' : ''}`}
              >
                <Icon size={20} strokeWidth={activeTab === tab ? 2.5 : 1.5} />
                <span className="text-[8px] font-bold uppercase tracking-widest">{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {profileModalPlayer && (
          <ProfileModal
            player={profileModalPlayer}
            onClose={() => setProfileModalPlayer(null)}
            onUpload={updatePlayerAvatar}
          />
        )}
      </div>
    </div>
  );
};

export default App;
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build 2>&1 | tail -15
```

Expected: clean build, no TypeScript errors. If you see errors about missing `useCasualMatches`, confirm the import was removed. If you see errors about `currentPlayer` prop on Dashboard, that's expected — we'll add it in Task 5.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/ModeSelector.tsx src/components/CasualHome.tsx src/components/CasualStats.tsx src/components/CasualLeaderboard.tsx src/components/MatchHistory.tsx src/components/LogMatch.tsx src/components/ScrollPicker.tsx src/components/AddGuestModal.tsx
git commit -m "feat: remove casual mode, app is now tournament-only"
```

---

## Task 4: Design System Tokens

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add new tokens to `src/index.css`**

Append the following block at the end of `src/index.css`:

```css
/* ---------- New Design Tokens — UI/UX Redesign ---------- */

/* Hero stat number — big animated rank/points on dashboard */
.stat-hero {
    font-size: 3.75rem;
    font-weight: 900;
    line-height: 1;
    color: #9ee312;
    text-shadow: 0 0 24px rgba(158, 227, 18, 0.35);
    letter-spacing: -0.03em;
}

/* Rank improvement badge */
.rank-delta-up {
    background: rgba(158, 227, 18, 0.15);
    color: #9ee312;
    border: 1px solid rgba(158, 227, 18, 0.25);
    border-radius: 999px;
    font-size: 9px;
    font-weight: 900;
    padding: 2px 6px;
    letter-spacing: 0.03em;
}

/* Rank drop badge */
.rank-delta-down {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 999px;
    font-size: 9px;
    font-weight: 900;
    padding: 2px 6px;
    letter-spacing: 0.03em;
}

/* Expandable pill base — overflow hidden, GSAP handles motion */
.pill-expand {
    border-radius: 2rem;
    overflow: hidden;
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add stat-hero, rank-delta, pill-expand design tokens"
```

---

## Task 5: Dashboard Hero Card

**Files:**
- Create: `src/components/DashboardHeroCard.tsx`
- Modify: `src/components/Dashboard.tsx`

The hero card shows for members only. It uses `computePlayerPerformanceStats` and animates rank + points with GSAP counters on mount.

- [ ] **Step 1: Create `src/components/DashboardHeroCard.tsx`**

```tsx
import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Player, Tournament } from '../types';
import { computePlayerPerformanceStats } from '../utils/playerStats';

gsap.registerPlugin(useGSAP);

interface Props {
  player: Player;
  tournaments: Tournament[];
}

function getLastResult(player: Player, tournaments: Tournament[]): { place: string; date: string } | null {
  const completed = [...tournaments]
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const t of completed) {
    const playerTeam = t.teams.find(
      tm => tm.player1.id === player.id || tm.player2.id === player.id
    );
    if (!playerTeam) continue;

    const finalMatch = t.matches.find(m => m.phase === 'finals' && m.isCompleted);
    if (finalMatch) {
      const winnerId = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamAId : finalMatch.teamBId;
      if (playerTeam.id === winnerId) return { place: '1st', date: t.date };
      if (playerTeam.id === (winnerId === finalMatch.teamAId ? finalMatch.teamBId : finalMatch.teamAId)) {
        return { place: '2nd', date: t.date };
      }
    }

    const semis = t.matches.filter(m => m.phase === 'semi-finals' && m.isCompleted);
    for (const semi of semis) {
      const semiWinner = semi.scoreA > semi.scoreB ? semi.teamAId : semi.teamBId;
      const semiLoser = semiWinner === semi.teamAId ? semi.teamBId : semi.teamAId;
      if (playerTeam.id === semiLoser) return { place: '3rd', date: t.date };
    }

    return { place: 'Participated', date: t.date };
  }
  return null;
}

const DashboardHeroCard: React.FC<Props> = ({ player, tournaments }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const counter = useRef({ rank: 0, pts: 0 });
  const [displayRank, setDisplayRank] = useState(0);
  const [displayPts, setDisplayPts] = useState(0);
  const [avatarError, setAvatarError] = useState(false);

  const allPlayers = React.useMemo(() => [player], [player]);
  const stats = React.useMemo(
    () => computePlayerPerformanceStats(allPlayers, tournaments),
    [allPlayers, tournaments]
  );
  const perf = stats[player.id] ?? { wins: 0, matches: 0, totalDiff: 0 };
  const winRate = perf.matches > 0 ? Math.round((perf.wins / perf.matches) * 100) : 0;
  const lastResult = React.useMemo(() => getLastResult(player, tournaments), [player, tournaments]);

  useGSAP(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDisplayRank(player.rank);
      setDisplayPts(Math.round(player.points));
      return;
    }
    gsap.from(cardRef.current, { opacity: 0, y: 20, duration: 0.5, ease: 'power3.out' });
    counter.current.rank = 0;
    counter.current.pts = 0;
    gsap.to(counter.current, {
      rank: player.rank,
      pts: player.points,
      duration: 0.8,
      ease: 'power3.out',
      delay: 0.15,
      onUpdate() {
        setDisplayRank(Math.round(counter.current.rank));
        setDisplayPts(Math.round(counter.current.pts));
      },
    });
  }, { scope: cardRef, dependencies: [player.rank, player.points] });

  return (
    <div ref={cardRef} className="liquid-card-elevated rounded-[2.5rem] p-6 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-36 h-36 bg-green-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Your Rank</p>
          <div className="flex items-end gap-3">
            <span className="stat-hero">#{displayRank || player.rank}</span>
          </div>
        </div>

        <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
          {player.avatarUrl && !avatarError ? (
            <img
              src={player.avatarUrl}
              alt={player.name}
              className="w-full h-full object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <span className="text-2xl font-black text-green-500">
              {player.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-4 mt-5 pt-4 border-t border-zinc-800/60">
        <div className="flex-1 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Points</p>
          <p className="text-xl font-black text-white">{displayPts || Math.round(player.points)}</p>
        </div>
        <div className="w-px bg-zinc-800" />
        <div className="flex-1 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Win Rate</p>
          <p className="text-xl font-black text-white">{winRate}%</p>
        </div>
        <div className="w-px bg-zinc-800" />
        <div className="flex-1 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Matches</p>
          <p className="text-xl font-black text-white">{perf.matches}</p>
        </div>
      </div>

      {lastResult && (
        <p className="text-[10px] text-zinc-500 font-bold mt-3">
          Last:{' '}
          <span className="text-zinc-300">{lastResult.place}</span>
          {' '}·{' '}
          {new Date(lastResult.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>
      )}
    </div>
  );
};

export default DashboardHeroCard;
```

- [ ] **Step 2: Update `src/components/Dashboard.tsx` to accept `currentPlayer` and show hero card**

Add `currentPlayer?: Player` to the Props interface and import `DashboardHeroCard`. The member hero card renders at the top; admin skips it.

Replace the full `src/components/Dashboard.tsx` with:

```tsx
import React from 'react';
import { Tournament, Player, Transaction, HallOfFameEntry } from '../types';
import { Play, Trophy, ChevronRight, Lightbulb, Clock, RotateCcw, Crown, Trash2, Award } from 'lucide-react';
import Logo from './Logo';
import DashboardHeroCard from './DashboardHeroCard';
import confetti from 'canvas-confetti';

interface Props {
  activeTournament?: Tournament;
  tournaments: Tournament[];
  players: Player[];
  transactions: Transaction[];
  hallOfFame: HallOfFameEntry[];
  currentPlayer?: Player;
  onNavigate: (tab: 'dashboard' | 'players' | 'tournament' | 'rankings' | 'insights' | 'treasury') => void;
  onResetData: () => void;
  onDeleteHOF: (id: string) => void;
  user: { role: 'admin' | 'member'; name: string };
}

const Dashboard: React.FC<Props> = ({
  activeTournament, tournaments, players, transactions, hallOfFame,
  currentPlayer, onNavigate, onResetData, onDeleteHOF, user
}) => {
  const mvp = React.useMemo(() => [...players].sort((a, b) => b.points - a.points)[0] || null, [players]);

  const topDog = React.useMemo(() => {
    const winCounts: Record<string, number> = {};
    hallOfFame.forEach(entry => {
      entry.teamName.split(' & ').forEach(name => {
        const n = name.trim();
        winCounts[n] = (winCounts[n] || 0) + 1;
      });
    });
    return Object.entries(winCounts).map(([name, wins]) => ({ name, wins })).sort((a, b) => b.wins - a.wins)[0] || null;
  }, [hallOfFame]);

  const playBoomSFX = () => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const handleMVPCelebration = () => {
    playBoomSFX();
    const end = Date.now() + 1000;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#EAB308', '#FDE047', '#FFFFFF'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#EAB308', '#FDE047', '#FFFFFF'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Member hero card — admins skip this */}
      {user.role === 'member' && currentPlayer && (
        <DashboardHeroCard player={currentPlayer} tournaments={tournaments} />
      )}

      {/* Club header card — shown to all */}
      <div className="liquid-card card-hover p-6 relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-colors" />
        <div className="flex items-start justify-between mb-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">8:30 <span className="text-green-500">Shuttlers</span></h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-1.5">
              <Clock size={12} className="text-green-500" /> 20:30 - 22:30 DAILY
            </p>
          </div>
          <Logo className="w-16 h-16" />
        </div>
        <div className="flex gap-3">
          {activeTournament ? (
            <button
              onClick={() => onNavigate('tournament')}
              className="flex-1 bg-green-500 text-zinc-950 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-green-500/20"
            >
              {user.role === 'admin' ? 'RESUME GAME' : 'WATCH GAME'} <Play size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate('tournament')}
              className="flex-1 bg-white text-zinc-950 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-500 active:scale-95 transition-all shadow-xl"
            >
              START TOURNAMENT <Play size={16} fill="currentColor" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleMVPCelebration}
          className="liquid-card-elevated p-5 rounded-3xl group hover:border-yellow-500/30 transition-colors relative overflow-hidden text-left active:scale-95 duration-200"
        >
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3">CURRENT MVP</p>
          <div className="flex items-end justify-between">
            <span className={`text-xl font-black uppercase truncate max-w-[100px] ${mvp ? 'bg-gradient-to-r from-yellow-400 via-yellow-100 to-yellow-400 bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent' : 'text-white'}`}>
              {mvp ? mvp.name : '...'}
            </span>
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl"><Trophy size={20} /></div>
          </div>
        </button>
        <button
          onClick={() => onNavigate('insights')}
          className="liquid-card-elevated p-5 rounded-3xl group hover:border-yellow-500/30 transition-all text-left active:scale-95 duration-200 relative overflow-hidden"
        >
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3">
            <span className="text-sweep">TOP DOG</span>
          </p>
          <div className="flex items-end justify-between">
            <span className="text-xl font-black text-white uppercase truncate max-w-[100px]">
              {topDog ? topDog.name : '...'}
            </span>
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl"><Award size={20} /></div>
          </div>
        </button>
      </div>

      {activeTournament && (
        <div className="liquid-card card-hover overflow-hidden shadow-2xl">
          <div className="bg-green-500/10 px-6 py-4 border-b border-green-500/10 flex justify-between items-center">
            <h3 className="font-black text-green-500 text-xs uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_10px_#9ee312]" /> LIVE: {activeTournament.name}
            </h3>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{activeTournament.currentPhase.replace('-', ' ')}</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
              <span>LIMIT: {activeTournament.pointLimit}</span>
              <span className="text-green-500">PROGRESS: {Math.round((activeTournament.matches.filter(m => m.isCompleted).length / activeTournament.matches.length) * 100)}%</span>
            </div>
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="bg-green-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                style={{ width: `${(activeTournament.matches.filter(m => m.isCompleted).length / activeTournament.matches.length) * 100}%` }}
              />
            </div>
            <button
              onClick={() => onNavigate('tournament')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              {user.role === 'admin' ? 'UPDATE SCORES' : 'LIVE SCORE'} <ChevronRight size={14} className="text-green-500" />
            </button>
          </div>
        </div>
      )}

      <div className="liquid-card border-yellow-500/10 rounded-3xl p-5 space-y-5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <Trophy size={14} className="text-yellow-500" />
            <span className="text-sweep">CHAMPIONS HALL OF FAME</span>
          </h3>
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Legends Recorded</span>
        </div>
        <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
          {hallOfFame.map((entry, idx) => (
            <div key={entry.id} className={`flex items-center justify-between p-4 rounded-2xl border ${idx === 0 ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-white/5 border-white/10'}`}>
              <div className="space-y-1">
                <p className="text-xs font-black text-white uppercase tracking-tight">{entry.teamName}</p>
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{new Date(entry.date).toLocaleDateString('en-GB')}</p>
              </div>
              <div className="flex items-center gap-2">
                {idx === 0 && <div className="p-1.5 bg-yellow-500/10 text-yellow-500 rounded-lg"><Crown size={14} /></div>}
                {user.role === 'admin' && (
                  <button onClick={() => onDeleteHOF(entry.id)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {user.role === 'admin' && (
        <button
          onClick={onResetData}
          className="w-full mt-4 bg-red-500/10 backdrop-blur-xl border border-red-500/20 text-red-500 p-4 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 group"
        >
          <RotateCcw size={16} className="group-hover:-rotate-180 transition-transform duration-500" /> Reset System Data
        </button>
      )}
    </div>
  );
};

export default Dashboard;
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 4: Run dev server and visually verify**

```bash
npm run dev
```

Open the app, log in as a member. Dashboard should show the hero card at top with big green rank number, 3-stat row, and last result strip. Log in as admin — hero card should not appear.

- [ ] **Step 5: Commit**

```bash
git add src/components/DashboardHeroCard.tsx src/components/Dashboard.tsx
git commit -m "feat: personalized dashboard hero card for members with GSAP counters"
```

---

## Task 6: Rankings Redesign

**Files:**
- Modify: `src/components/Rankings.tsx`

Changes: Top 3 podium strip, `.rank-delta-up/.rank-delta-down` pill badges, win rate progress bar, personal card highlight, GSAP stagger on mount.

- [ ] **Step 1: Replace `src/components/Rankings.tsx` with redesigned version**

```tsx
import React, { useMemo, useState, useRef } from 'react';
import { Trophy, Crown, Info, Zap, Target, Star, RefreshCw, Share2 } from 'lucide-react';
import { Player, Tournament } from '../types';
import { computePlayerPerformanceStats } from '../utils/playerStats';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const AvatarImg: React.FC<{ url?: string; initial: React.ReactNode; name?: string; overlay?: React.ReactNode }> = ({ url, initial, name, overlay }) => {
  const [error, setError] = React.useState(false);
  React.useEffect(() => { setError(false); }, [url]);
  if (!url || error) return <>{initial}</>;
  return (
    <>
      <img src={url} alt={name ?? ''} className="w-full h-full object-cover" onError={() => setError(true)} />
      {overlay}
    </>
  );
};

interface RankingsProps {
  players: Player[];
  tournaments: Tournament[];
  isAdmin?: boolean;
  onSyncRankings?: () => Promise<boolean>;
  currentPlayerId?: string;
}

const Rankings: React.FC<RankingsProps> = ({ players, tournaments, isAdmin, onSyncRankings, currentPlayerId }) => {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const listRef = useRef<HTMLDivElement>(null);
  const syncIconRef = useRef<SVGSVGElement>(null);

  const shareRankings = () => {
    const captainCount = Math.floor(sortedPlayers.length / 2);
    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    let text = `🏸 8:30 SHUTTLERS — LATEST RANKINGS\n📅 ${date}  •  SEASON 2026\n\n`;
    sortedPlayers.forEach((player, i) => {
      const pts = player.points % 1 === 0 ? player.points : player.points.toFixed(1);
      const crown = i === 0 ? '👑 ' : '    ';
      text += `${String(i + 1).padStart(2)}. ${crown}${player.name.padEnd(12)}${pts} pts\n`;
      if (i === captainCount - 1) text += `${'─'.repeat(28)}\n`;
    });
    text += `\nTracked via 8:30 Shuttlers 🏸`;
    if (navigator.share) {
      navigator.share({ title: '8:30 Shuttlers Rankings', text }).catch(() => {
        navigator.clipboard.writeText(text);
        alert('Rankings copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(text);
      alert('Rankings copied to clipboard!');
    }
  };

  const handleSync = async () => {
    if (!onSyncRankings || syncing) return;
    setSyncing(true);
    setSyncStatus('idle');
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.to(syncIconRef.current, { rotation: 360, duration: 1, repeat: -1, ease: 'none' });
    }
    const ok = await onSyncRankings();
    gsap.killTweensOf(syncIconRef.current);
    gsap.set(syncIconRef.current, { rotation: 0 });
    setSyncing(false);
    setSyncStatus(ok ? 'success' : 'error');
    setTimeout(() => setSyncStatus('idle'), 3000);
  };

  const playerPerformanceStats = useMemo(
    () => computePlayerPerformanceStats(players, tournaments),
    [players, tournaments]
  );

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const sa = playerPerformanceStats[a.id];
      const sb = playerPerformanceStats[b.id];
      const wrA = sa?.matches > 0 ? sa.wins / sa.matches : 0;
      const wrB = sb?.matches > 0 ? sb.wins / sb.matches : 0;
      if (wrB !== wrA) return wrB - wrA;
      return (sb?.totalDiff ?? 0) - (sa?.totalDiff ?? 0);
    });
  }, [players, playerPerformanceStats]);

  // GSAP: stagger list + punch delta badges on mount
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo('.rank-card',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: 'power2.out', delay: 0.1 }
    );
    gsap.fromTo('.rank-delta-up, .rank-delta-down',
      { scale: 0 },
      { scale: 1, duration: 0.25, stagger: 0.03, ease: 'back.out(1.7)', delay: 0.5 }
    );
  }, { scope: listRef, dependencies: [sortedPlayers] });

  const top3 = sortedPlayers.slice(0, 3);
  const captainCount = Math.floor(sortedPlayers.length / 2);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
          <Trophy className="text-green-500" /> Global Rankings
        </h2>
        <div className="flex items-center gap-2">
          {isAdmin && onSyncRankings && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${
                syncStatus === 'success' ? 'bg-green-500/20 border-green-500/40 text-green-400'
                : syncStatus === 'error' ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:border-green-500/30 hover:text-green-400'
              }`}
            >
              <RefreshCw ref={syncIconRef} size={10} />
              {syncing ? 'Syncing…' : syncStatus === 'success' ? 'Synced!' : syncStatus === 'error' ? 'Failed' : 'Sync'}
            </button>
          )}
          <button
            onClick={shareRankings}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border bg-white/5 border-white/10 text-zinc-400 hover:border-green-500/30 hover:text-green-400 transition-all"
          >
            <Share2 size={10} /> Share
          </button>
        </div>
      </div>

      {/* Podium — top 3 */}
      {top3.length === 3 && (
        <div className="flex items-end justify-center gap-3 px-2">
          {/* #2 left */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="w-14 h-14 rounded-[1.5rem] overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center font-black text-base text-white">
              <AvatarImg url={top3[1]?.avatarUrl} initial={top3[1]?.name.charAt(0).toUpperCase()} name={top3[1]?.name} />
            </div>
            <p className="text-[10px] font-black text-white uppercase truncate max-w-[70px] text-center">{top3[1]?.name}</p>
            <p className="text-[9px] font-black text-zinc-400">{top3[1]?.points % 1 === 0 ? top3[1]?.points : top3[1]?.points.toFixed(1)} pts</p>
            <div className="w-full bg-zinc-800/60 rounded-t-xl py-3 text-center">
              <span className="text-[9px] font-black text-zinc-400">#2</span>
            </div>
          </div>

          {/* #1 center — taller pedestal */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <Crown size={14} className="text-green-500" />
            <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden bg-green-500 flex items-center justify-center font-black text-xl text-zinc-950">
              <AvatarImg url={top3[0]?.avatarUrl} initial={top3[0]?.name.charAt(0).toUpperCase()} name={top3[0]?.name} />
            </div>
            <p className="text-[11px] font-black text-white uppercase truncate max-w-[70px] text-center">{top3[0]?.name}</p>
            <p className="text-[9px] font-black text-green-400">{top3[0]?.points % 1 === 0 ? top3[0]?.points : top3[0]?.points.toFixed(1)} pts</p>
            <div className="w-full bg-green-500/20 rounded-t-xl py-5 text-center border-t-2 border-green-500/30">
              <span className="text-[9px] font-black text-green-400">#1</span>
            </div>
          </div>

          {/* #3 right */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="w-14 h-14 rounded-[1.5rem] overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center font-black text-base text-white">
              <AvatarImg url={top3[2]?.avatarUrl} initial={top3[2]?.name.charAt(0).toUpperCase()} name={top3[2]?.name} />
            </div>
            <p className="text-[10px] font-black text-white uppercase truncate max-w-[70px] text-center">{top3[2]?.name}</p>
            <p className="text-[9px] font-black text-zinc-400">{top3[2]?.points % 1 === 0 ? top3[2]?.points : top3[2]?.points.toFixed(1)} pts</p>
            <div className="w-full bg-zinc-800/60 rounded-t-xl py-2 text-center">
              <span className="text-[9px] font-black text-zinc-400">#3</span>
            </div>
          </div>
        </div>
      )}

      {/* Full ranked list */}
      <div ref={listRef} className="grid grid-cols-1 gap-3">
        {sortedPlayers.map((player, index) => {
          const displayRank = index + 1;
          const rankDiff = player.previousRank - displayRank;
          const isPromotionZone = index === captainCount - 1;
          const stats = playerPerformanceStats[player.id];
          const wr = stats?.matches > 0 ? (stats.wins / stats.matches) * 100 : 0;
          const isCurrentPlayer = player.id === currentPlayerId;

          return (
            <React.Fragment key={player.id}>
              <div
                className={`rank-card relative overflow-hidden rounded-[2rem] p-5 transition-all liquid-card-elevated ${
                  index < captainCount ? 'border-green-500/20' : 'border-white/5'
                } ${isCurrentPlayer ? '!border-green-500/40 shadow-[0_0_20px_rgba(158,227,18,0.1)]' : ''}`}
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-7xl text-white pointer-events-none">#{displayRank}</div>

                <div className="flex items-center gap-5 relative z-10">
                  <div className={`relative w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center text-xl font-black shadow-lg ${
                    index === 0 ? 'bg-green-500 text-zinc-950' :
                    index < captainCount ? 'bg-zinc-800 text-white' : 'bg-zinc-800/60 text-white'
                  }`}>
                    <AvatarImg
                      url={player.avatarUrl}
                      initial={index === 0 ? <Crown size={28} strokeWidth={3} /> : displayRank}
                      name={player.name}
                      overlay={index === 0 ? (
                        <div className="absolute bottom-0.5 right-0.5 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center shadow">
                          <Crown size={10} strokeWidth={3} className="text-zinc-950" />
                        </div>
                      ) : (
                        <div className="absolute bottom-0.5 right-0.5 bg-zinc-900/80 rounded-full w-6 h-6 flex items-center justify-center shadow">
                          <span className="text-[11px] font-black text-white">{displayRank}</span>
                        </div>
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">{player.name}</h3>
                      {rankDiff > 0 && <span className="rank-delta-up">▲{rankDiff}</span>}
                      {rankDiff < 0 && <span className="rank-delta-down">▼{Math.abs(rankDiff)}</span>}
                      {rankDiff === 0 && <span className="text-[9px] font-black text-zinc-700 px-1.5">—</span>}
                      {stats?.matches > 0 && (
                        <span className="text-[10px] font-bold text-zinc-600">{stats.matches} matches</span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                      {index < captainCount ? 'CAPTAIN' : 'CHALLENGER'}
                    </p>
                    {/* Win rate bar */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1 rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-green-500/70 transition-all duration-500"
                          style={{ width: `${wr}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-black text-zinc-500 w-8 text-right">{wr.toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className={`text-2xl font-black ${index === 0 ? 'text-green-500' : 'text-white'}`}>
                      {player.points % 1 === 0 ? player.points : player.points.toFixed(1)}
                    </div>
                    <div className="text-[10px] uppercase font-black text-zinc-600 tracking-widest">pts</div>
                  </div>
                </div>
              </div>

              {isPromotionZone && (
                <div className="py-2 flex items-center gap-4 px-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
                  <span className="text-[9px] font-black text-green-500/50 uppercase tracking-[0.4em]">Promotion Zone</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Scoring Rules — unchanged */}
      <div className="mt-8 space-y-4 px-1 pb-12">
        <div className="flex items-center gap-2 text-zinc-500 mb-2 px-1">
          <Info size={14} />
          <h3 className="text-[10px] font-black uppercase tracking-widest">How Points Work</h3>
        </div>
        <div className="liquid-card-elevated rounded-[2rem] p-6 space-y-6 shadow-2xl">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <span className="text-[9px] font-black text-yellow-400">1</span>
              </div>
              <h4 className="text-[11px] font-black text-white uppercase tracking-tight">Placement Points</h4>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Only the <span className="text-white font-black">top half</span> of teams earn placement points. Bottom half gets nothing.
            </p>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-center">
                <thead>
                  <tr className="bg-white/5">
                    <td className="text-[8px] font-black text-zinc-500 uppercase py-2 px-2">Place</td>
                    {[4,5,6,7,8,10].map(n => <td key={n} className="text-[8px] font-black text-zinc-500 uppercase py-2">{n}T</td>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { rank: '1st', vals: [8, 10, 12, 14, 16, 20] },
                    { rank: '2nd', vals: [4, 7, 8, 11, 12, 16] },
                    { rank: '3rd', vals: [0, 3, 4, 7, 8, 12] },
                    { rank: '4th', vals: [0, 0, 0, 4, 4, 8] },
                    { rank: '5th', vals: ['-', 0, 0, 0, 0, 4] },
                    { rank: '6th+', vals: ['-', '-', 0, 0, 0, 0] },
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-black/20' : ''}>
                      <td className="text-[8px] font-black text-zinc-400 py-1.5 px-2">{row.rank}</td>
                      {row.vals.map((v, j) => (
                        <td key={j} className={`text-[9px] font-black py-1.5 ${v === 0 || v === '-' ? 'text-zinc-600' : 'text-green-400'}`}>
                          {v === 0 ? '0' : v === '-' ? '—' : `+${v}`}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-zinc-600 italic">T = number of teams in that tournament</p>
          </div>
          <div className="h-px bg-zinc-800" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                <span className="text-[9px] font-black text-orange-400">2</span>
              </div>
              <h4 className="text-[11px] font-black text-white uppercase tracking-tight">Match Wins</h4>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">Every match win gives <span className="text-white font-black">+2 points</span>.</p>
            <div className="flex gap-2 pt-1">
              {[1,2,3,4].map(w => (
                <div key={w} className="flex-1 bg-orange-500/10 border border-orange-500/20 rounded-xl py-1.5 text-center">
                  <p className="text-[8px] text-zinc-500">{w}W</p>
                  <p className="text-[10px] font-black text-orange-400">+{w*2}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="h-px bg-zinc-800" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-[9px] font-black text-blue-400">3</span>
              </div>
              <h4 className="text-[11px] font-black text-white uppercase tracking-tight">Performance Bonus</h4>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Total <span className="text-white font-black">positive point difference ÷ 2</span> added as bonus.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center justify-between">
              <span className="text-[9px] text-zinc-400">+30 point diff</span>
              <span className="text-[10px] font-black text-blue-400">+15 bonus pts</span>
            </div>
          </div>
          <div className="h-px bg-zinc-800" />
          <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-4 space-y-3">
            <p className="text-[9px] font-black text-green-500 uppercase tracking-widest">Example — 6 Team Tournament</p>
            <div className="space-y-1.5">
              {[
                { label: '1st place (6 teams)', val: '+12', color: 'text-yellow-400' },
                { label: '3 match wins', val: '+6', color: 'text-orange-400' },
                { label: '+24 point diff bonus', val: '+12', color: 'text-blue-400' },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">{row.label}</span>
                  <span className={`text-[10px] font-black ${row.color}`}>{row.val}</span>
                </div>
              ))}
              <div className="h-px bg-zinc-700 my-1" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-white uppercase">Total earned</span>
                <span className="text-[12px] font-black text-green-400">+30 pts</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-600">
            <Star size={10} strokeWidth={3} />
            <p className="text-[8px] font-black uppercase tracking-widest">Tiebreaker: Win Rate → Point Difference</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rankings;
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 3: Run dev server and visually verify**

```bash
npm run dev
```

Navigate to Rankings tab. Verify:
- Top 3 podium appears with #1 center/taller, #2 left, #3 right
- All list cards have win rate progress bar
- Rank change badges are styled pills (not emoji)
- Your own player card has green glow border
- Cards stagger in on tab load

- [ ] **Step 4: Commit**

```bash
git add src/components/Rankings.tsx
git commit -m "feat: rankings redesign — podium strip, delta pill badges, win rate bar, personal highlight, GSAP stagger"
```

---

## Task 7: Roster Expandable Pills

**Files:**
- Modify: `src/components/PlayersList.tsx`

Rewrite the player list to use expandable accordion pills. Primary click = expand/collapse. Admin check-in button is a separate small icon in the pill. GSAP handles expand/collapse spring.

- [ ] **Step 1: Replace `src/components/PlayersList.tsx` with accordion version**

```tsx
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Player, Tournament } from '../types';
import { Plus, Trash2, UserPlus, Trophy, ChevronDown, Camera, CheckCircle2 } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { computePlayerPerformanceStats } from '../utils/playerStats';

gsap.registerPlugin(useGSAP);

interface Props {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  addPlayer: (player: Player) => Promise<void>;
  deletePlayer: (playerId: string) => Promise<void>;
  tournaments: Tournament[];
  user: { role: 'admin' | 'member'; name: string };
  checkedInIds: string[];
  onToggleCheckIn: (id: string) => void;
  onOpenProfile: (player: Player) => void;
  currentPlayerId?: string;
}

const AvatarImg: React.FC<{ url?: string; initial: string; name?: string }> = ({ url, initial, name }) => {
  const [error, setError] = React.useState(false);
  React.useEffect(() => { setError(false); }, [url]);
  if (!url || error) return <span>{initial}</span>;
  return <img src={url} alt={name ?? initial} className="w-full h-full object-cover" onError={() => setError(true)} />;
};

interface PillProps {
  player: Player;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
  stats: { form: ('W' | 'L')[]; titles: number };
  perfStats: { wins: number; matches: number; totalDiff: number };
  user: { role: 'admin' | 'member'; name: string };
  checkedInIds: string[];
  onToggleCheckIn: (id: string) => void;
  onOpenProfile: (player: Player) => void;
  onDelete: (id: string) => void;
  currentPlayerId?: string;
}

const PlayerPill: React.FC<PillProps> = ({
  player, isOpen, onToggle, stats, perfStats,
  user, checkedInIds, onToggleCheckIn, onOpenProfile, onDelete, currentPlayerId
}) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<SVGSVGElement>(null);
  const isCheckedIn = checkedInIds.includes(player.id);
  const wr = perfStats.matches > 0 ? Math.round((perfStats.wins / perfStats.matches) * 100) : 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Animate on isOpen change
  React.useEffect(() => {
    const body = bodyRef.current;
    const chevron = chevronRef.current;
    if (!body) return;

    if (isOpen) {
      body.style.display = 'block';
      body.style.overflow = 'hidden';
      const fullHeight = body.scrollHeight;
      body.style.maxHeight = '0px';
      body.style.paddingTop = '0';
      body.style.paddingBottom = '0';

      if (reduced) {
        body.style.maxHeight = 'none';
        body.style.paddingTop = '16px';
        body.style.paddingBottom = '16px';
      } else {
        gsap.to(body, {
          maxHeight: fullHeight,
          paddingTop: 16,
          paddingBottom: 16,
          duration: 0.4,
          ease: 'elastic.out(1, 0.5)',
          onComplete: () => { body.style.maxHeight = 'none'; body.style.overflow = 'visible'; }
        });
        gsap.to(chevron, { rotation: 180, duration: 0.25, ease: 'power2.inOut' });
      }
    } else {
      body.style.overflow = 'hidden';
      if (reduced) {
        body.style.maxHeight = '0';
        body.style.paddingTop = '0';
        body.style.paddingBottom = '0';
        body.style.display = 'none';
      } else {
        const currentHeight = body.scrollHeight;
        body.style.maxHeight = `${currentHeight}px`;
        gsap.to(body, {
          maxHeight: 0,
          paddingTop: 0,
          paddingBottom: 0,
          duration: 0.25,
          ease: 'power2.inOut',
          onComplete: () => { body.style.display = 'none'; }
        });
        gsap.to(chevron, { rotation: 0, duration: 0.25, ease: 'power2.inOut' });
      }
    }
  }, [isOpen, reduced]);

  return (
    <div className="pill-expand liquid-card-elevated border border-zinc-800/60">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => onToggle(player.id)}
        className="w-full flex items-center gap-4 p-4 text-left"
      >
        <div className={`relative w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center font-black text-sm flex-shrink-0 ${
          isCheckedIn ? 'bg-green-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-700 text-green-500'
        }`}>
          <AvatarImg url={player.avatarUrl} initial={player.name.charAt(0).toUpperCase()} name={player.name} />
          {stats.titles > 0 && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 text-zinc-950 w-4 h-4 rounded-full flex items-center justify-center border border-zinc-900">
              <Trophy size={8} strokeWidth={3} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white uppercase tracking-tight truncate">{player.name}</p>
          <p className="text-[10px] text-zinc-500 font-bold">#{player.rank} · {player.points % 1 === 0 ? player.points : player.points.toFixed(1)} pts</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {user.role === 'admin' && (
            <button
              onClick={e => { e.stopPropagation(); onToggleCheckIn(player.id); }}
              className={`p-1.5 rounded-lg transition-colors ${isCheckedIn ? 'text-green-500' : 'text-zinc-600 hover:text-green-500'}`}
              title={isCheckedIn ? 'Checked in' : 'Check in'}
            >
              <CheckCircle2 size={16} strokeWidth={2.5} />
            </button>
          )}
          {user.role === 'admin' && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(player.id); }}
              className="p-1.5 rounded-lg text-zinc-700 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
          <ChevronDown ref={chevronRef} size={16} className="text-zinc-600" />
        </div>
      </button>

      {/* Expanded body — hidden by default, GSAP animates open/close */}
      <div
        ref={bodyRef}
        style={{ display: 'none', maxHeight: 0, overflow: 'hidden', paddingTop: 0, paddingBottom: 0 }}
      >
        <div className="px-4 border-t border-zinc-800/60">
          {/* 3-stat row */}
          <div className="flex gap-3 py-1">
            <div className="flex-1 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Matches</p>
              <p className="text-base font-black text-white">{perfStats.matches}</p>
            </div>
            <div className="w-px bg-zinc-800" />
            <div className="flex-1 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Win Rate</p>
              <p className="text-base font-black text-white">{wr}%</p>
            </div>
            <div className="w-px bg-zinc-800" />
            <div className="flex-1 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Points</p>
              <p className="text-base font-black text-white">{player.points % 1 === 0 ? player.points : player.points.toFixed(1)}</p>
            </div>
          </div>

          {/* Rank history */}
          <div className="flex items-center gap-2 mt-3 mb-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Rank</p>
            <div className="flex items-center gap-1">
              {player.previousRank !== player.rank ? (
                <>
                  <span className="text-[10px] font-black text-zinc-400">#{player.previousRank}</span>
                  <span className="text-[10px] text-zinc-600">→</span>
                  <span className={`text-[10px] font-black ${player.rank < player.previousRank ? 'text-green-400' : 'text-red-400'}`}>#{player.rank}</span>
                </>
              ) : (
                <span className="text-[10px] font-black text-zinc-400">#{player.rank} (unchanged)</span>
              )}
            </div>
          </div>

          {/* Recent form dots */}
          {stats.form.length > 0 && (
            <div className="flex items-center gap-2 mt-2 mb-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Form</p>
              <div className="flex gap-1.5">
                {stats.form.map((res, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${res === 'W' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500/40'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Own card: upload photo button */}
          {(user.role === 'admin' || player.id === currentPlayerId) && (
            <button
              onClick={e => { e.stopPropagation(); onOpenProfile(player); }}
              className="w-full flex items-center justify-center gap-2 mt-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 font-black uppercase text-[10px] tracking-widest py-2.5 rounded-2xl transition-all active:scale-[0.98]"
            >
              <Camera size={13} /> {player.avatarUrl ? 'Change Photo' : 'Upload Photo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const PlayersList: React.FC<Props> = ({
  players, setPlayers, addPlayer: hookAddPlayer, deletePlayer: hookDeletePlayer,
  tournaments, user, checkedInIds, onToggleCheckIn, onOpenProfile, currentPlayerId
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPoints, setNewPlayerPoints] = useState(10);
  const [openPillId, setOpenPillId] = useState<string | null>(null);

  const playerStats = useMemo(() => {
    const stats: Record<string, { form: ('W' | 'L')[]; titles: number }> = {};

    tournaments.filter(t => t.status === 'completed').forEach(t => {
      const finalMatch = t.matches.find(m => m.phase === 'finals' && m.isCompleted);
      if (finalMatch) {
        const winnerId = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamAId : finalMatch.teamBId;
        const winnerTeam = t.teams.find(tm => tm.id === winnerId);
        if (winnerTeam) {
          [winnerTeam.player1.id, winnerTeam.player2.id].forEach(pid => {
            if (!stats[pid]) stats[pid] = { form: [], titles: 0 };
            stats[pid].titles++;
          });
        }
      }
    });

    const sorted = [...tournaments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    players.forEach(player => {
      if (!stats[player.id]) stats[player.id] = { form: [], titles: 0 };
      const form: ('W' | 'L')[] = [];
      for (const t of sorted) {
        if (form.length >= 5) break;
        const playerMatches = t.matches.filter(m => m.isCompleted && (
          t.teams.find(tm => tm.id === m.teamAId)?.player1.id === player.id ||
          t.teams.find(tm => tm.id === m.teamAId)?.player2.id === player.id ||
          t.teams.find(tm => tm.id === m.teamBId)?.player1.id === player.id ||
          t.teams.find(tm => tm.id === m.teamBId)?.player2.id === player.id
        ));
        playerMatches.reverse().forEach(m => {
          if (form.length >= 5) return;
          const teamA = t.teams.find(tm => tm.id === m.teamAId);
          const isTeamA = teamA?.player1.id === player.id || teamA?.player2.id === player.id;
          const won = isTeamA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
          form.push(won ? 'W' : 'L');
        });
      }
      stats[player.id].form = form.reverse();
    });

    return stats;
  }, [players, tournaments]);

  const perfStats = useMemo(
    () => computePlayerPerformanceStats(players, tournaments),
    [players, tournaments]
  );

  const handleToggle = useCallback((id: string) => {
    setOpenPillId(prev => prev === id ? null : id);
  }, []);

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const player: Player = {
      id: crypto.randomUUID(),
      name: newPlayerName.trim(),
      points: newPlayerPoints,
      rank: players.length + 1,
      previousRank: players.length + 1,
      startingPoints: newPlayerPoints,
      type: 'member',
      isCheckedIn: false
    };
    hookAddPlayer(player);
    setNewPlayerName('');
    setNewPlayerPoints(10);
  };

  const removePlayer = (id: string) => {
    const player = players.find(p => p.id === id);
    if (!player) return;
    if (!confirm(`Delete "${player.name}"? This affects rankings.`)) return;
    hookDeletePlayer(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-black text-white uppercase tracking-tighter">PLAYER ROSTER</h2>
        <span className="bg-white/5 text-zinc-300 text-[10px] px-3 py-1 rounded-full border border-white/10 font-black uppercase tracking-widest">
          {players.length} Active
        </span>
      </div>

      {user.role === 'admin' && (
        <div className="liquid-card-elevated p-4 rounded-3xl shadow-xl space-y-3">
          <div className="relative">
            <input
              type="text"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              placeholder="Registration Name..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 font-bold transition-all"
              onKeyDown={e => e.key === 'Enter' && addPlayer()}
            />
            <button
              onClick={addPlayer}
              className="absolute right-2 top-2 bg-green-500 text-zinc-950 p-3 rounded-xl hover:bg-green-400 transition-all active:scale-95 shadow-lg shadow-green-500/20"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>
          <div className="flex items-center gap-3 px-1">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">Starting Pts</label>
            <input
              type="number"
              value={newPlayerPoints}
              onChange={e => setNewPlayerPoints(Math.max(0, parseInt(e.target.value) || 0))}
              min={0}
              className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-center font-black text-sm focus:outline-none focus:border-green-500 transition-all"
            />
            <span className="text-[9px] text-zinc-600">Default: 10</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {players.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-[2rem]">
            <UserPlus size={48} className="mx-auto text-zinc-800 mb-3" />
            <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">No players registered</p>
          </div>
        ) : (
          players.map(player => (
            <PlayerPill
              key={player.id}
              player={player}
              isOpen={openPillId === player.id}
              onToggle={handleToggle}
              onClose={() => setOpenPillId(null)}
              stats={playerStats[player.id] ?? { form: [], titles: 0 }}
              perfStats={perfStats[player.id] ?? { wins: 0, matches: 0, totalDiff: 0 }}
              user={user}
              checkedInIds={checkedInIds}
              onToggleCheckIn={onToggleCheckIn}
              onOpenProfile={onOpenProfile}
              onDelete={removePlayer}
              currentPlayerId={currentPlayerId}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default PlayersList;
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 3: Run dev server and visually verify**

```bash
npm run dev
```

Navigate to Roster tab. Verify:
- Players appear as compact capsule pills
- Tapping a pill springs it open with elastic ease
- Tapping again collapses it smoothly
- Only one pill open at a time
- Own card shows "Upload Photo" button in expanded state
- Admin sees check-in toggle + trash icon in collapsed header
- Members only see chevron

- [ ] **Step 4: Commit**

```bash
git add src/components/PlayersList.tsx
git commit -m "feat: roster expandable accordion pills with GSAP spring animation"
```

---

## Task 8: Tab Transitions + Nav Micro-interactions

**Files:**
- Modify: `src/App.tsx`

Add GSAP tab transitions (fade + slide-up on content mount) and spring micro-interactions on nav button press.

- [ ] **Step 1: Add GSAP imports and tab transition to App.tsx**

At the top of `src/App.tsx`, add imports (already has `useRef`):

```tsx
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);
```

Inside the `App` component, add this effect after the existing `useEffect` blocks (before the `if (!user)` guard):

```tsx
// Tab transition — fade + slide-up when activeTab changes
const prevTabRef = useRef(activeTab);
useEffect(() => {
  if (prevTabRef.current === activeTab) return;
  prevTabRef.current = activeTab;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const content = document.getElementById('tab-content');
  if (!content) return;
  gsap.fromTo(content,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
  );
}, [activeTab]);
```

- [ ] **Step 2: Add nav micro-interactions to the nav buttons**

In the nav map inside the `return` JSX, update the nav `<button>` to include pointer handlers:

```tsx
<button
  key={tab}
  onClick={() => setActiveTab(tab)}
  onPointerDown={e => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.to(e.currentTarget, { scale: 0.92, duration: 0.1 });
  }}
  onPointerUp={e => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.4)' });
  }}
  onPointerLeave={e => {
    gsap.to(e.currentTarget, { scale: 1, duration: 0.15 });
  }}
  className={`liquid-nav-item flex flex-col items-center gap-1.5 py-3 px-4 rounded-2xl transition-colors ${activeTab === tab ? 'active' : ''}`}
>
  <Icon size={20} strokeWidth={activeTab === tab ? 2.5 : 1.5} />
  <span className="text-[8px] font-bold uppercase tracking-widest">{label}</span>
</button>
```

Note: removed `transition-all` from className since GSAP controls scale. `transition-colors` is kept for the active state color change.

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 4: Run dev server and verify all animations**

```bash
npm run dev
```

Verify the complete experience end-to-end:
1. Login as a member → dashboard shows hero card with animated rank/points counters
2. Switch to Rankings → cards stagger in, delta badges punch in
3. Switch to Roster → pills are compact, tap to expand with spring, tap again to collapse
4. Tap nav buttons — each press gives a springy scale micro-interaction
5. Switching any tab → content fades + slides up
6. Log in as admin → no hero card, operational dashboard shown

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: GSAP tab transitions and nav spring micro-interactions"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Design tokens (stat-hero, pill-expand, rank-delta-up/down) | Task 4 ✓ |
| Casual mode removal | Task 3 ✓ |
| ModeSelector removal | Task 3 ✓ |
| Member dashboard hero card | Task 5 ✓ |
| Admin dashboard — no hero card | Task 5 ✓ |
| Hero card: rank counter, points, win rate, matches, last result | Task 5 ✓ |
| Rankings podium strip | Task 6 ✓ |
| Rankings delta pill badges | Task 6 ✓ |
| Rankings win rate bar | Task 6 ✓ |
| Rankings personal card highlight | Task 6 ✓ |
| Roster expandable pills | Task 7 ✓ |
| Roster: only one pill open at a time | Task 7 ✓ |
| Roster: own card shows upload button | Task 7 ✓ |
| Roster: admin check-in + delete in collapsed header | Task 7 ✓ |
| GSAP hero counter animations | Task 5 ✓ |
| GSAP rankings stagger + delta punch | Task 6 ✓ |
| GSAP pill expand elastic + collapse | Task 7 ✓ |
| GSAP sync button rotation | Task 6 ✓ |
| GSAP tab transitions | Task 8 ✓ |
| GSAP nav micro-interactions | Task 8 ✓ |
| prefers-reduced-motion respected | All animation tasks ✓ |
| rounded-[2rem] roster pills | Task 7 ✓ |
| rounded-[2.5rem] hero card | Task 5 ✓ |

All spec requirements covered.
