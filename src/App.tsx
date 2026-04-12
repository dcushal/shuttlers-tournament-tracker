import React, { useState, useEffect } from 'react';
import { Player, Tournament, Team, Match, Transaction, HallOfFameEntry } from './types';
import { usePlayers, useTournaments, useTransactions, useHallOfFame, useCasualMatches } from './hooks/useSupabase';
import { supabase } from './lib/supabase';
import Dashboard from './components/Dashboard';
import PlayersList from './components/PlayersList';
import TournamentManager from './components/TournamentManager';
import History from './components/History';
import Insights from './components/Insights';

import ModeSelector from './components/ModeSelector';
import Header from './components/Header';
import Rankings from './components/Rankings';
import Login from './components/Login';
import CasualHome from './components/CasualHome';
import LogMatch from './components/LogMatch';
import CasualStats from './components/CasualStats';
import CasualLeaderboard from './components/CasualLeaderboard';
import MatchHistory from './components/MatchHistory';
import { Trophy, Users, LayoutDashboard, Crown, Lightbulb, Activity, History as HistoryIcon, BarChart2, Plus } from 'lucide-react';
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
  const [casualTab, setCasualTab] = useState<'home' | 'log' | 'stats' | 'leaderboard' | 'history'>('home');
  const [mode, setMode] = useState<'casual' | 'tournament' | null>(null);

  // Load mode from localStorage if available
  useEffect(() => {
    const savedMode = localStorage.getItem('shuttlers_mode') as 'casual' | 'tournament' | null;
    if (savedMode) setMode(savedMode);
  }, []);

  const handleModeSelect = (newMode: 'casual' | 'tournament') => {
    setMode(newMode);
    localStorage.setItem('shuttlers_mode', newMode);
  };

  // Auth State
  const [user, setUser] = useState<{ role: 'admin' | 'member'; name: string } | null>(() => {
    const saved = localStorage.getItem('shuttlers_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Supabase Hooks
  const {
    players,
    setPlayers,
    addPlayer,
    deletePlayer,
    toggleCheckIn,
    loading: playersLoading,
    refetch: refreshPlayers
  } = usePlayers(() => {
    const saved = localStorage.getItem('shuttlers_players');
    let loadedPlayers: Player[] = [];

    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) {
        // Filter out corrupted data (strings or nulls) and remove duplicates by ID
        const validPlayers = parsed.filter((p: any) => typeof p === 'object' && p !== null && p.name && p.id);
        
        // Remove duplicates by ID
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
    createTournament,
    updateTournament,
    deleteTournament
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
    setHallOfFame,
    loading: hofLoading
  } = useHallOfFame(() => {
    const saved = localStorage.getItem('shuttlers_hof');
    return saved ? JSON.parse(saved) : INITIAL_HALL_OF_FAME;
  });

  const {
    matches: casualMatches,
    addMatch: addCasualMatch,
    deleteMatch: deleteCasualMatch,
    loading: casualLoading,
    refetch: refreshMatches
  } = useCasualMatches(() => {
    const saved = localStorage.getItem('shuttlers_casual_matches');
    return saved ? JSON.parse(saved) : [];
  });

  // Derived state for checked-in players (synced via Supabase)
  const checkedInIds = players.filter(p => p.isCheckedIn).map(p => p.id);

  useEffect(() => {
    localStorage.setItem('shuttlers_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('shuttlers_tournaments', JSON.stringify(tournaments));
  }, [tournaments]);

  // Removed localStorage sync for attendance as it is now in DB

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

  const handleLogout = () => {
    localStorage.removeItem('shuttlers_user');
    setUser(null);
  };

  // User check MUST come before mode check so logout always shows Login
  if (!user) {
    return <Login onLogin={(role, name) => setUser({ role, name })} players={players} />;
  }

  if (!mode) {
    return <ModeSelector onSelect={handleModeSelect} onLogout={handleLogout} userName={user?.name} />;
  }
  const handleToggleCheckIn = (id: string) => {
    const player = players.find(p => p.id === id);
    if (player) {
      toggleCheckIn(id, !player.isCheckedIn);
    }
  };

  const activeTournament = tournaments.find(t => t.status === 'active');

  const handleUpdateTournament = (updatedTournament: Tournament) => {
    updateTournament(updatedTournament);
  };

  const createNewTournament = (newTournament: Tournament) => {
    createTournament(newTournament);
  };

  const handleCompleteTournament = async (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;

    // 1. Mark tournament as completed locally first
    const updatedTournament = { ...tournament, status: 'completed' as const };
    const updatedTournaments = tournaments.map(t => t.id === tournamentId ? updatedTournament : t);

    // 2. Recalculate EVERYTHING based on history
    const reRankedPlayers = recalculatePlayerStats(players, updatedTournaments);

    // 3. Update State & Supabase
    setPlayers(reRankedPlayers);

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
        // Fix: updateHallOfFame hook expects an array, not a function updater
        setHallOfFame([entry, ...hallOfFame]);
      }
    }

    setTournaments(updatedTournaments);
    updateTournament(updatedTournament); // Using the hook's updateTournament
  };


  const handleSyncRankings = async (): Promise<boolean> => {
    const reRankedPlayers = recalculatePlayerStats(players, tournaments);
    const result = await setPlayers(reRankedPlayers);
    return result ?? false;
  };

  const handleDeleteTournament = async (id: string) => {
    if (confirm("Are you sure you want to delete this tournament entry? This will permanently affect rankings and stats.")) {
      // 1. Identify the tournament to be deleted
      const tournamentToDelete = tournaments.find(t => t.id === id);

      // 2. Remove tournament locally
      const remainingTournaments = tournaments.filter(t => t.id !== id);

      // 3. Recalculate Rankings based on remaining history
      const reRankedPlayers = recalculatePlayerStats(players, remainingTournaments);

      // 4. Update State (Rankings & Tournaments)
      setPlayers(reRankedPlayers); // Synced to DB automatically by the hook
      setTournaments(remainingTournaments); // Synced to local state

      // 5. Delete Hall of Fame Entry if applicable
      if (tournamentToDelete && tournamentToDelete.status === 'completed') {
        const finalMatch = tournamentToDelete.matches.find(m => m.phase === 'finals' && m.isCompleted);
        if (finalMatch) {
          const winnerId = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamAId : finalMatch.teamBId;
          const winnerTeam = tournamentToDelete.teams.find(t => t.id === winnerId);
          if (winnerTeam) {
            const winnerTeamName = `${winnerTeam.player1.name} & ${winnerTeam.player2.name}`;
            const tournamentDate = new Date(tournamentToDelete.date).toISOString().split('T')[0];

            // Find matching HOF entry
            const hofEntryToDelete = hallOfFame.find(
              h => h.date === tournamentDate && h.teamName === winnerTeamName
            );

            if (hofEntryToDelete) {
              setHallOfFame(prev => prev.filter(h => h.id !== hofEntryToDelete.id)); // Update local

              // Delete from Supabase
              if (supabase) {
                supabase.from('hall_of_fame').delete().eq('id', hofEntryToDelete.id).then(({ error }) => {
                  if (error) console.error("Failed to delete field from Hall of Fame", error);
                });
              }
            }
          }
        }
      }

      // 6. Delete Tournament from Supabase
      deleteTournament(id);
    }
  };

  const resetData = () => {
    if (confirm("Are you sure you want to RESET all data? This cannot be undone.")) {
      setTournaments([]);
      setTransactions([]);

      // Reset players to initial state
      // We can use the recalculate logic with empty tournaments list!
      const resetPlayers = recalculatePlayerStats(players, []);

      setPlayers(resetPlayers);
      alert("System Data & Global Rankings have been reset successfully.");
    }
  };

  const deleteHOF = (id: string) => {
    if (confirm("Are you sure you want to remove this legend from the Hall of Fame?")) {
      // Fix: updateHallOfFame hook expects an array, not a function updater
      setHallOfFame(hallOfFame.filter(entry => entry.id !== id));
    }
  };


  const renderCasualContent = () => {
    switch (casualTab) {
      case 'home':
        return <CasualHome onSetTab={setCasualTab} activeTab={casualTab} onBack={() => setMode(null)} players={players} matches={casualMatches} currentUser={user} />;
      case 'log':
        // Fix: LogMatch returns a string name, but addPlayer expects a Player object
        const handleAddGuest = (name: string) => {
          const newGuest: Player = {
            id: crypto.randomUUID(),
            name: name,
            points: 0,
            rank: 999, // Guests don't have a rank
            previousRank: 999,
            type: 'guest'
          };
          addPlayer(newGuest);
        };
        return <LogMatch players={players} onSave={addCasualMatch} onAddGuest={handleAddGuest} onCancel={() => setCasualTab('home')} currentUserId={user.name} />;
      case 'stats':
        return <CasualStats players={players} matches={casualMatches} currentUser={user} onBack={() => setCasualTab('home')} />;
      case 'leaderboard':
        return <CasualLeaderboard players={players} matches={casualMatches} onBack={() => setCasualTab('home')} />;
      case 'history':
        const handleRefresh = () => {
          refreshPlayers();
          refreshMatches();
        };
        return <MatchHistory matches={casualMatches} players={players} onDelete={deleteCasualMatch} onBack={() => setCasualTab('home')} onRefresh={handleRefresh} currentUser={user} />;
      default:
        return <CasualHome onSetTab={setCasualTab} activeTab={casualTab} onBack={() => setMode(null)} />;
    }
  };

  if (mode === 'casual') {
    const handleCasualBack = () => {
      if (casualTab === 'home') {
        setMode(null);
      } else {
        setCasualTab('home');
      }
    };

    return (
      <div className="min-h-screen text-white font-sans selection:bg-green-500/30">
        <div className="max-w-md mx-auto min-h-screen flex flex-col relative px-4 pt-6">
          <Header onBackToModes={handleCasualBack} onLogout={handleLogout} user={user} mode={mode} />
          <main className="flex-1 mt-6 mb-[100px]">
            {renderCasualContent()}
          </main>

          {/* Casual Bottom Nav */}
          <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-zinc-900 pb-8 pt-4 px-6 z-50">
            <div className="max-w-md mx-auto flex items-center justify-between gap-2">
              <button
                onClick={() => setCasualTab('home')}
                className={`flex flex-col items-center gap-1 transition-all ${casualTab === 'home' ? 'text-green-500 scale-110' : 'text-zinc-600'}`}
              >
                <Activity size={20} strokeWidth={casualTab === 'home' ? 3 : 2} />
                <span className="text-[8px] font-black uppercase tracking-widest">Home</span>
              </button>
              <button
                onClick={() => setCasualTab('leaderboard')}
                className={`flex flex-col items-center gap-1 transition-all ${casualTab === 'leaderboard' ? 'text-yellow-500 scale-110' : 'text-zinc-600'}`}
              >
                <Trophy size={20} strokeWidth={casualTab === 'leaderboard' ? 3 : 2} />
                <span className="text-[8px] font-black uppercase tracking-widest">Ranks</span>
              </button>
              <button
                onClick={() => setCasualTab('log')}
                className="relative -top-8 w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center text-zinc-950 shadow-2xl shadow-green-500/20 active:scale-90 transition-transform"
              >
                <Plus size={28} strokeWidth={3} />
              </button>
              <button
                onClick={() => setCasualTab('stats')}
                className={`flex flex-col items-center gap-1 transition-all ${casualTab === 'stats' ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}
              >
                <BarChart2 size={20} strokeWidth={casualTab === 'stats' ? 3 : 2} />
                <span className="text-[8px] font-black uppercase tracking-widest">Stats</span>
              </button>
              <button
                onClick={() => setCasualTab('history')}
                className={`flex flex-col items-center gap-1 transition-all ${casualTab === 'history' ? 'text-purple-500 scale-110' : 'text-zinc-600'}`}
              >
                <HistoryIcon size={20} strokeWidth={casualTab === 'history' ? 3 : 2} />
                <span className="text-[8px] font-black uppercase tracking-widest">Logs</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tournament Mode (Existing Layout)
  const tournamentPlayers = players.filter(p => p.type !== 'guest');

  return (
    <div className="min-h-screen text-white font-sans selection:bg-green-500/30">
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative px-4 pt-6">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} onBackToModes={() => setMode(null)} onLogout={handleLogout} user={user} mode={mode} />

        <main className="flex-1 mt-6 mb-[100px]">
          {activeTab === 'dashboard' && (
            <Dashboard
              players={tournamentPlayers}
              tournaments={tournaments}
              activeTournament={activeTournament}
              transactions={transactions}
              hallOfFame={hallOfFame}
              user={user}
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
            />
          )}

          {activeTab === 'history' && (
            <History tournaments={tournaments} onDelete={handleDeleteTournament} />
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
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`liquid-nav-item flex flex-col items-center gap-1.5 py-3 px-4 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <LayoutDashboard size={20} strokeWidth={activeTab === 'dashboard' ? 2.5 : 1.5} />
              <span className="text-[8px] font-bold uppercase tracking-widest">Dash</span>
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`liquid-nav-item flex flex-col items-center gap-1.5 py-3 px-4 rounded-2xl transition-all ${activeTab === 'players' ? 'active' : ''}`}
            >
              <Users size={20} strokeWidth={activeTab === 'players' ? 2.5 : 1.5} />
              <span className="text-[8px] font-bold uppercase tracking-widest">Roster</span>
            </button>
            <button
              onClick={() => setActiveTab('rankings')}
              className={`liquid-nav-item flex flex-col items-center gap-1.5 py-3 px-4 rounded-2xl transition-all ${activeTab === 'rankings' ? 'active' : ''}`}
            >
              <Crown size={20} strokeWidth={activeTab === 'rankings' ? 2.5 : 1.5} />
              <span className="text-[8px] font-bold uppercase tracking-widest">Ranks</span>
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`liquid-nav-item flex flex-col items-center gap-1.5 py-3 px-4 rounded-2xl transition-all ${activeTab === 'insights' ? 'active' : ''}`}
            >
              <Lightbulb size={20} strokeWidth={activeTab === 'insights' ? 2.5 : 1.5} />
              <span className="text-[8px] font-bold uppercase tracking-widest">Stats</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default App;
