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
