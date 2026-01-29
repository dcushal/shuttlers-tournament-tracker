
import React from 'react';
import { Tournament, Player, Transaction } from '../types';
import { Play, Users, Trophy, ChevronRight, Lightbulb, Clock, CheckCircle2, Wallet } from 'lucide-react';
import Logo from './Logo';

interface Props {
  activeTournament?: Tournament;
  tournaments: Tournament[];
  players: Player[];
  checkedInIds: string[];
  transactions: Transaction[];
  onToggleCheckIn: (id: string) => void;
  onNavigate: (tab: 'dashboard' | 'players' | 'tournament' | 'history' | 'insights' | 'treasury') => void;
}

const Dashboard: React.FC<Props> = ({ activeTournament, tournaments, players, checkedInIds, transactions, onToggleCheckIn, onNavigate }) => {
  const mvp = React.useMemo(() => {
    if (tournaments.length === 0) return null;
    const stats: Record<string, number> = {};
    const recent = [...tournaments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
    
    recent.forEach(t => {
      t.matches.filter(m => m.isCompleted).forEach(m => {
        const winnerId = m.scoreA > m.scoreB ? m.teamAId : m.teamBId;
        const winnerTeam = t.teams.find(tm => tm.id === winnerId);
        if (winnerTeam) {
          stats[winnerTeam.player1.id] = (stats[winnerTeam.player1.id] || 0) + 1;
          stats[winnerTeam.player2.id] = (stats[winnerTeam.player2.id] || 0) + 1;
        }
      });
    });

    const top = Object.entries(stats).sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    return players.find(p => p.id === top[0]);
  }, [tournaments, players]);

  const treasurySummary = React.useMemo(() => {
    const totalDue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalSpent = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { totalDue, totalSpent };
  }, [transactions]);

  return (
    <div className="space-y-6 pb-6">
      <div className="bg-zinc-900 border border-green-500/20 rounded-3xl p-6 relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-colors"></div>
        
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
              RESUME GAME <Play size={16} fill="currentColor" />
            </button>
          ) : (
            <button 
              onClick={() => onNavigate('tournament')}
              className="flex-1 bg-white text-zinc-950 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-500 active:scale-95 transition-all shadow-xl"
            >
              START SESSION <Play size={16} fill="currentColor" />
            </button>
          )}
        </div>
      </div>

      {/* Session Check-in Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">TONIGHT'S LINEUP</h3>
          <span className="text-[10px] font-black text-green-500 uppercase">{checkedInIds.length} CHECKED IN</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {players.map(player => {
            const isChecked = checkedInIds.includes(player.id);
            return (
              <button 
                key={player.id}
                onClick={() => onToggleCheckIn(player.id)}
                className="flex flex-col items-center gap-2 shrink-0 group"
              >
                <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center font-black text-sm transition-all relative ${
                  isChecked 
                    ? 'bg-green-500 border-green-400 text-zinc-950 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-600 group-hover:border-zinc-700'
                }`}>
                  {player.name.charAt(0).toUpperCase()}
                  {isChecked && <div className="absolute -top-1 -right-1 bg-white text-green-600 rounded-full p-0.5 shadow-md"><CheckCircle2 size={12} fill="currentColor" /></div>}
                </div>
                <span className={`text-[9px] font-black uppercase truncate w-14 text-center ${isChecked ? 'text-white' : 'text-zinc-600'}`}>{player.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl group hover:border-green-500/30 transition-colors">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3">CURRENT MVP</p>
          <div className="flex items-end justify-between">
            <span className="text-xl font-black text-white uppercase truncate max-w-[100px]">{mvp ? mvp.name : '...'}</span>
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl"><Trophy size={20} /></div>
          </div>
        </div>
        <button 
          onClick={() => onNavigate('treasury')}
          className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl group hover:border-green-500/30 transition-all text-left"
        >
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3">TOTAL DUE</p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-black text-red-500">₹{treasurySummary.totalDue}</span>
            <div className="p-2 bg-red-500/5 text-red-500 rounded-xl"><Wallet size={20} /></div>
          </div>
        </button>
      </div>

      {activeTournament && (
        <div className="bg-zinc-900 border border-green-500/20 rounded-3xl overflow-hidden shadow-2xl">
          <div className="bg-green-500/10 px-6 py-4 border-b border-green-500/10 flex justify-between items-center">
            <h3 className="font-black text-green-500 text-xs uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> LIVE: {activeTournament.name}
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
              ></div>
            </div>
            <button 
              onClick={() => onNavigate('tournament')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              UPDATE SCORES <ChevronRight size={14} className="text-green-500" />
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        <button 
          onClick={() => onNavigate('insights')}
          className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-5 rounded-3xl hover:border-green-500/40 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center text-green-500 border border-zinc-800 group-hover:scale-110 transition-transform">
              <Lightbulb size={22} />
            </div>
            <div className="text-left">
              <p className="font-black text-white text-sm uppercase">GAME INSIGHTS</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">PERFORMANCE & TIPS</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-zinc-700 group-hover:text-green-500 transition-colors" />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
