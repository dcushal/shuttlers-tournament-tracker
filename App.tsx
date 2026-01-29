
import React, { useState, useEffect } from 'react';
import { Player, Tournament, Team, Match, Transaction } from './types';
import Dashboard from './components/Dashboard';
import PlayersList from './components/PlayersList';
import TournamentManager from './components/TournamentManager';
import History from './components/History';
import Insights from './components/Insights';
import Treasury from './components/Treasury';
import Header from './components/Header';
import { Trophy, Users, LayoutDashboard, History as HistoryIcon, Lightbulb, Wallet } from 'lucide-react';

const DEFAULT_PLAYERS: string[] = [
  "Aldrich",
  "Dev",
  "Hritik",
  "Kushal",
  "Rohan",
  "Sagar",
  "Sam",
  "Saptarishi",
  "Sarvesh",
  "Viru"
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'tournament' | 'history' | 'insights' | 'treasury'>('dashboard');
  
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('shuttlers_players');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) return parsed;
    }
    return DEFAULT_PLAYERS.map(name => ({
      id: Math.random().toString(36).substring(2, 11),
      name
    }));
  });

  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    const saved = localStorage.getItem('shuttlers_tournaments');
    return saved ? JSON.parse(saved) : [];
  });

  const [checkedInIds, setCheckedInIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('shuttlers_attendance');
    return saved ? JSON.parse(saved) : [];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('shuttlers_transactions');
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

  const toggleCheckIn = (id: string) => {
    setCheckedInIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const activeTournament = tournaments.find(t => t.status === 'active');

  const updateActiveTournament = (updated: Tournament) => {
    setTournaments(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const createTournament = (newTournament: Tournament) => {
    setTournaments(prev => [...prev, newTournament]);
  };

  const completeTournament = (id: string) => {
    setTournaments(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' } : t));
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <Header />
      
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
          />
        )}
        
        {activeTab === 'players' && (
          <PlayersList players={players} setPlayers={setPlayers} tournaments={tournaments} />
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
          />
        )}
        
        {activeTab === 'history' && (
          <History tournaments={tournaments.filter(t => t.status === 'completed')} />
        )}

        {activeTab === 'insights' && (
          <Insights tournaments={tournaments.filter(t => t.status === 'completed')} />
        )}

        {activeTab === 'treasury' && (
          <Treasury 
            players={players} 
            checkedInIds={checkedInIds}
            transactions={transactions}
            setTransactions={setTransactions}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-3 z-50">
        <div className="flex justify-around items-center max-w-lg mx-auto overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 shrink-0 px-2 ${activeTab === 'dashboard' ? 'text-green-500' : 'text-zinc-500'}`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
          </button>
          <button 
            onClick={() => setActiveTab('players')}
            className={`flex flex-col items-center gap-1 shrink-0 px-2 ${activeTab === 'players' ? 'text-green-500' : 'text-zinc-500'}`}
          >
            <Users size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Roster</span>
          </button>
          <button 
            onClick={() => setActiveTab('tournament')}
            className={`flex flex-col items-center gap-1 shrink-0 px-2 ${activeTab === 'tournament' ? 'text-green-500' : 'text-zinc-500'}`}
          >
            <Trophy size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Play</span>
          </button>
          <button 
            onClick={() => setActiveTab('treasury')}
            className={`flex flex-col items-center gap-1 shrink-0 px-2 ${activeTab === 'treasury' ? 'text-green-500' : 'text-zinc-500'}`}
          >
            <Wallet size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Funds</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 shrink-0 px-2 ${activeTab === 'history' ? 'text-green-500' : 'text-zinc-500'}`}
          >
            <HistoryIcon size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Logs</span>
          </button>
          <button 
            onClick={() => setActiveTab('insights')}
            className={`flex flex-col items-center gap-1 shrink-0 px-2 ${activeTab === 'insights' ? 'text-green-500' : 'text-zinc-500'}`}
          >
            <Lightbulb size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Stats</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
