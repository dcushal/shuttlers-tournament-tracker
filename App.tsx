import React, { useState, useEffect } from 'react';
import { Player, Tournament, Team, Match, Transaction, HallOfFameEntry } from './types';
import { usePlayers, useTournaments, useTransactions, useHallOfFame } from './hooks/useSupabase';
import Dashboard from './components/Dashboard';
import PlayersList from './components/PlayersList';
import TournamentManager from './components/TournamentManager';
import History from './components/History';
import Insights from './components/Insights';
import Treasury from './components/Treasury';
import Header from './components/Header';
import Rankings from './components/Rankings';
import Login from './components/Login';
import { Trophy, Users, LayoutDashboard, Crown, Lightbulb, Wallet } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'tournament' | 'rankings' | 'insights' | 'treasury'>('dashboard');

  // Auth State
  const [user, setUser] = useState<{ role: 'admin' | 'member'; name: string } | null>(() => {
    const saved = localStorage.getItem('shuttlers_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Supabase Hooks
  const {
    players,
    setPlayers,
    loading: playersLoading
  } = usePlayers(() => {
    const saved = localStorage.getItem('shuttlers_players');
    let loadedPlayers: Player[] = [];

    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) {
        loadedPlayers = parsed.map((p: any) => {
          const initial = INITIAL_RANKINGS.find(ir => ir.name.toLowerCase() === p.name.toLowerCase());
          const hasPoints = typeof p.points === 'number' && !isNaN(p.points);
          const points = hasPoints ? p.points : (initial ? initial.points : 0);

          return {
            ...p,
            points,
            rank: p.rank || 11,
            previousRank: p.previousRank || p.rank || 11
          };
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
      .map((p, index) => ({
        ...p,
        rank: index + 1
      }));
  });

  const {
    tournaments,
    setTournaments,
    createTournament: hookCreateTournament,
    updateTournament: hookUpdateTournament,
    deleteTournament: supabaseDeleteTournament
  } = useTournaments(() => {
    const saved = localStorage.getItem('shuttlers_tournaments');
    return saved ? JSON.parse(saved) : [];
  });

  const {
    transactions,
    setTransactions
  } = useTransactions(() => {
    const saved = localStorage.getItem('shuttlers_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const {
    hallOfFame,
    setHallOfFame
  } = useHallOfFame(() => {
    const saved = localStorage.getItem('shuttlers_hof');
    return saved ? JSON.parse(saved) : INITIAL_HALL_OF_FAME;
  });

  const [checkedInIds, setCheckedInIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('shuttlers_attendance');
    return saved ? JSON.parse(saved) : [];
  });



  useEffect(() => {
    localStorage.setItem('shuttlers_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('shuttlers_tournaments', JSON.stringify(tournaments));
  }, [tournaments]);

  useEffect(() => {
    localStorage.setItem('shuttlers_attendance', JSON.stringify(checkedInIds));
  }, [checkedInIds]);

  useEffect(() => {
    localStorage.setItem('shuttlers_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('shuttlers_hof', JSON.stringify(hallOfFame));
  }, [hallOfFame]);



  useEffect(() => {
    if (user) {
      localStorage.setItem('shuttlers_user', JSON.stringify(user));
    }
  }, [user]);

  const toggleCheckIn = (id: string) => {
    setCheckedInIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const activeTournament = tournaments.find(t => t.status === 'active');

  const updateActiveTournament = (updated: Tournament) => {
    hookUpdateTournament(updated);
  };

  const createTournament = (newTournament: Tournament) => {
    hookCreateTournament(newTournament);
  };

  const completeTournament = (id: string) => {
    const tournament = tournaments.find(t => t.id === id);
    if (!tournament) return;

    // 1. Calculate Standings
    const stats: Record<string, { won: number; pointDiff: number; teamId: string }> = {};
    tournament.teams.forEach(team => {
      stats[team.id] = { teamId: team.id, won: 0, pointDiff: 0 };
    });

    tournament.matches.filter(m => m.isCompleted).forEach(match => {
      const isA = match.scoreA > match.scoreB;
      stats[match.teamAId].won += isA ? 1 : 0;
      stats[match.teamBId].won += isA ? 0 : 1;
      stats[match.teamAId].pointDiff += (match.scoreA - match.scoreB);
      stats[match.teamBId].pointDiff += (match.scoreB - match.scoreA);
    });

    const sortedStandings = Object.values(stats).sort((a, b) =>
      b.won !== a.won ? b.won - a.won : b.pointDiff - a.pointDiff
    );

    // 2. Award Points
    const pointRewards = [10, 5, 0, -5, -10];
    const updatedPlayers = [...players];

    sortedStandings.forEach((standing, index) => {
      const reward = pointRewards[index] || 0;
      const performanceBonus = standing.pointDiff > 0 ? standing.pointDiff / 2 : 0;
      const totalPointsAwarded = reward + performanceBonus;

      const team = tournament.teams.find(t => t.id === standing.teamId);
      if (team) {
        [team.player1.id, team.player2.id].forEach(pid => {
          const pIdx = updatedPlayers.findIndex(p => p.id === pid);
          if (pIdx !== -1) {
            updatedPlayers[pIdx].points += totalPointsAwarded;
          }
        });
      }
    });

    // 3. Re-rank Players
    const playerPerformanceStats: Record<string, { wins: number; matches: number; totalDiff: number }> = {};
    players.forEach(p => playerPerformanceStats[p.id] = { wins: 0, matches: 0, totalDiff: 0 });

    tournaments.concat(tournament).forEach(t => {
      t.matches.filter(m => m.isCompleted).forEach(m => {
        const teamA = t.teams.find(tm => tm.id === m.teamAId);
        const teamB = t.teams.find(tm => tm.id === m.teamBId);
        if (teamA && teamB) {
          const winnerId = m.scoreA > m.scoreB ? m.teamAId : m.teamBId;
          [teamA, teamB].forEach(team => {
            const teamDiff = team.id === m.teamAId ? (m.scoreA - m.scoreB) : (m.scoreB - m.scoreA);
            [team.player1.id, team.player2.id].forEach(pid => {
              if (playerPerformanceStats[pid]) {
                playerPerformanceStats[pid].matches++;
                playerPerformanceStats[pid].totalDiff += teamDiff;
                if (team.id === winnerId) playerPerformanceStats[pid].wins++;
              }
            });
          });
        }
      });
    });

    const reRanked = [...updatedPlayers]
      .sort((a, b) => {
        // 1. Points
        if (b.points !== a.points) return b.points - a.points;

        // 2. Win Rate
        const wrA = playerPerformanceStats[a.id].matches > 0 ? playerPerformanceStats[a.id].wins / playerPerformanceStats[a.id].matches : 0;
        const wrB = playerPerformanceStats[b.id].matches > 0 ? playerPerformanceStats[b.id].wins / playerPerformanceStats[b.id].matches : 0;
        if (wrB !== wrA) return wrB - wrA;

        // 3. Total Point Difference / 2
        return (playerPerformanceStats[b.id].totalDiff / 2) - (playerPerformanceStats[a.id].totalDiff / 2);
      })
      .map((p, index) => ({
        ...p,
        previousRank: p.rank,
        rank: index + 1
      }));

    setPlayers(reRanked);

    // 4. Update Hall of Fame
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
        setHallOfFame(prev => [entry, ...prev]);
      }
    }

    setTournaments(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' } : t));
    hookUpdateTournament({ ...tournament, status: 'completed' });
  };

  const deleteTournament = (id: string) => {
    if (confirm("Are you sure you want to delete this tournament entry? This will permanently affect rankings and stats.")) {
      supabaseDeleteTournament(id);
    }
  };

  const resetData = () => {
    if (confirm("Are you sure you want to RESET all data? This cannot be undone.")) {
      setTournaments([]);
      setTransactions([]);

      const resetPlayers = players.map(p => {
        const initial = INITIAL_RANKINGS.find(ir => ir.name.toLowerCase() === p.name.toLowerCase());
        const rankIdx = INITIAL_RANKINGS.findIndex(ir => ir.name.toLowerCase() === p.name.toLowerCase());

        return {
          ...p,
          points: initial ? initial.points : 0,
          rank: rankIdx !== -1 ? rankIdx + 1 : 11,
          previousRank: rankIdx !== -1 ? rankIdx + 1 : 11
        };
      }).sort((a, b) => a.rank - b.rank);

      setPlayers(resetPlayers);
      alert("System Data & Global Rankings have been reset successfully.");
    }
  };

  const deleteHOF = (id: string) => {
    if (confirm("Are you sure you want to remove this legend from the Hall of Fame?")) {
      setHallOfFame(prev => prev.filter(entry => entry.id !== id));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('shuttlers_user');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={(role, name) => setUser({ role, name })} players={players} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-32">
      <Header onLogout={handleLogout} user={user} />

      <main className="container mx-auto px-4 pt-4 max-w-lg">
        {activeTab === 'dashboard' && (
          <Dashboard
            activeTournament={activeTournament}
            tournaments={tournaments}
            players={players}
            checkedInIds={checkedInIds}
            transactions={transactions}
            onToggleCheckIn={toggleCheckIn}
            onNavigate={(tab) => setActiveTab(tab)}
            onResetData={resetData}
            user={user}
            hallOfFame={hallOfFame}
            onDeleteHOF={deleteHOF}
          />
        )}

        {activeTab === 'players' && (
          <PlayersList players={players} setPlayers={setPlayers} tournaments={tournaments} user={user} />
        )}

        {activeTab === 'tournament' && (
          <TournamentManager
            players={players}
            checkedInIds={checkedInIds}
            tournaments={tournaments}
            activeTournament={activeTournament}
            onCreate={createTournament}
            onUpdate={updateActiveTournament}
            onComplete={completeTournament}
            onEndSession={() => setActiveTab('rankings')}
            user={user}
          />
        )}

        {activeTab === 'rankings' && (
          <Rankings players={players} tournaments={tournaments} />
        )}

        {activeTab === 'insights' && (
          <Insights
            tournaments={tournaments.filter(t => t.status === 'completed')}
            hallOfFame={hallOfFame}
            onDeleteTournament={deleteTournament}
            isAdmin={user?.role === 'admin'}
          />
        )}

        {activeTab === 'treasury' && (
          <Treasury
            players={players}
            checkedInIds={checkedInIds}
            transactions={transactions}
            setTransactions={setTransactions}
            user={user}
          />
        )}
        <div className="pb-32 text-center">
          <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.3em] opacity-50">mini stadium, Thane</p>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800 px-4 pt-3 pb-8 z-50">
        <div className="grid grid-cols-6 gap-1 max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 py-1 ${activeTab === 'dashboard' ? 'text-green-500' : 'text-zinc-500'}`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`flex flex-col items-center gap-1 py-1 ${activeTab === 'players' ? 'text-green-500' : 'text-zinc-500'}`}
          >
            <Users size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Roster</span>
          </button>
          <button
            onClick={() => setActiveTab('tournament')}
            className={`flex flex-col items-center gap-1 py-1 ${activeTab === 'tournament' ? 'text-green-500' : 'text-zinc-500'}`}
          >
            <Trophy size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Play</span>
          </button>
          <button
            onClick={() => setActiveTab('treasury')}
            className={`flex flex-col items-center gap-1 py-1 ${activeTab === 'treasury' ? 'text-green-500' : 'text-zinc-500'}`}
          >
            <Wallet size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Funds</span>
          </button>
          <button
            onClick={() => setActiveTab('rankings')}
            className={`flex flex-col items-center gap-1 py-1 ${activeTab === 'rankings' ? 'text-green-500' : 'text-zinc-500'}`}
          >
            <Crown size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Rank</span>
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex flex-col items-center gap-1 py-1 ${activeTab === 'insights' ? 'text-green-500' : 'text-zinc-500'}`}
          >
            <Lightbulb size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Stats</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
