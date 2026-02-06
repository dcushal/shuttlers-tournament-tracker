import React from 'react';
import { Tournament, Player, Transaction, HallOfFameEntry } from '../types';
import { Play, Trophy, ChevronRight, Lightbulb, Clock, CheckCircle2, Wallet, RotateCcw, Crown, Trash2, Award, Lock } from 'lucide-react';
import Logo from './Logo';
import confetti from 'canvas-confetti';


interface Props {
  activeTournament?: Tournament;
  tournaments: Tournament[];
  players: Player[];
  transactions: Transaction[];
  hallOfFame: HallOfFameEntry[];
  onNavigate: (tab: 'dashboard' | 'players' | 'tournament' | 'rankings' | 'insights' | 'treasury') => void;
  onResetData: () => void;
  onDeleteHOF: (id: string) => void;
  onDataRefresh?: () => void;
  user: { role: 'admin' | 'member'; name: string };
}

const Dashboard: React.FC<Props> = ({ activeTournament, tournaments, players, transactions, hallOfFame, onNavigate, onResetData, onDeleteHOF, onDataRefresh, user }) => {
  const mvp = React.useMemo(() => {
    return [...players].sort((a, b) => b.points - a.points)[0] || null;
  }, [players]);

  const topDog = React.useMemo(() => {
    const winCounts: Record<string, number> = {};
    hallOfFame.forEach(entry => {
      const names = entry.teamName.split(' & ');
      names.forEach(name => {
        const trimmed = name.trim();
        winCounts[trimmed] = (winCounts[trimmed] || 0) + 1;
      });
    });

    const top = Object.entries(winCounts)
      .map(([name, wins]) => ({ name, wins }))
      .sort((a, b) => b.wins - a.wins)[0];

    return top || null;
  }, [hallOfFame]);

  const treasurySummary = React.useMemo(() => {
    const balances: Record<string, number> = {};
    players.forEach(p => balances[p.id] = 0);
    transactions.forEach(t => {
      if (balances[t.playerId] !== undefined) {
        balances[t.playerId] += t.amount;
      }
    });

    const purchasers = Object.entries(balances)
      .filter(([_, balance]) => balance < 0)
      .map(([id, balance]) => ({
        name: players.find(p => p.id === id)?.name || 'Unknown',
        amount: Math.abs(balance)
      }))
      .sort((a, b) => b.amount - a.amount);

    const totalDue = purchasers.reduce((sum, p) => sum + p.amount, 0);

    return { totalDue, purchasers };
  }, [players, transactions]);

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

    const end = Date.now() + 1 * 1000;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#EAB308', '#FDE047', '#FFFFFF']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#EAB308', '#FDE047', '#FFFFFF']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  return (
    <div className="space-y-4 pb-6">
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
              {user.role === 'admin' ? 'RESUME GAME' : 'WATCH GAME'} <Play size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate('tournament')}
              className="flex-1 bg-white text-zinc-950 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-500 active:scale-95 transition-all shadow-xl animate-glow-pulse"
            >
              START TOURNAMENT <Play size={16} fill="currentColor" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleMVPCelebration}
          className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl group hover:border-yellow-500/30 transition-colors relative overflow-hidden text-left active:scale-95 duration-200"
        >
          <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity animate-glow-pulse"></div>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3 relative z-10">CURRENT MVP</p>
          <div className="flex items-end justify-between relative z-10">
            <span className={`text-xl font-black uppercase truncate max-w-[100px] ${mvp ? 'bg-gradient-to-r from-yellow-400 via-yellow-100 to-yellow-400 bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent' : 'text-white'}`}>
              {mvp ? mvp.name : '...'}
            </span>
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl"><Trophy size={20} /></div>
          </div>
        </button>
        <button
          onClick={() => onNavigate('insights')}
          className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl group hover:border-yellow-500/30 transition-all text-left active:scale-95 duration-200 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3 relative z-10">
            <span className="text-sweep">TOP DOG</span>
          </p>
          <div className="flex items-end justify-between relative z-10">
            <span className="text-xl font-black text-white uppercase truncate max-w-[100px]">
              {topDog ? topDog.name : '...'}
            </span>
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl">
              <Award size={20} />
            </div>
          </div>
        </button>
      </div>

      <button
        onClick={() => onNavigate('treasury')}
        className="w-full bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl text-left relative overflow-hidden group hover:border-green-500/30 transition-all active:scale-[0.99] duration-200"
      >
        <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Lock size={80} className="text-white" />
        </div>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3 relative z-10">REIMBURSEMENT DUE</p>
        <div className="flex items-end justify-between relative z-10">
          <div className="space-y-2 flex-1">
            {treasurySummary.purchasers.length > 0 ? (
              <div className="space-y-1">
                {treasurySummary.purchasers.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between pr-8 border-l-2 border-green-500/30 pl-3">
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-tighter">{p.name}</p>
                    <span className="text-sm font-black text-white">₹{p.amount}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-black text-zinc-600 uppercase tracking-tighter">Club Treasury settled</p>
            )}
            <div className="pt-1 border-t border-zinc-800/50 mt-1">
              <span className={`text-2xl font-black ${treasurySummary.totalDue === 0 ? 'text-green-500' : 'text-yellow-500'}`}>₹{treasurySummary.totalDue}</span>
            </div>
          </div>
          <div className={`p-2 rounded-xl bg-zinc-800 text-zinc-500 group-hover:text-green-500 transition-colors shadow-lg`}><Lock size={20} /></div>
        </div>
      </button>

      {activeTournament && (
        <div className="bg-zinc-900 border border-green-500/20 rounded-3xl overflow-hidden shadow-2xl">
          <div className="bg-green-500/10 px-6 py-4 border-b border-green-500/10 flex justify-between items-center">
            <h3 className="font-black text-green-500 text-xs uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-glow-pulse shadow-[0_0_10px_#9ee312]"></span> LIVE: {activeTournament.name}
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
              {user.role === 'admin' ? 'UPDATE SCORES' : 'LIVE SCORE'} <ChevronRight size={14} className="text-green-500" />
            </button>
          </div>
        </div>
      )}

      {/* Hall of Fame Section */}
      <div className="bg-zinc-900/40 border border-yellow-500/10 rounded-3xl p-5 space-y-5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <Trophy size={14} className="text-yellow-500" />
            <span className="text-sweep">CHAMPIONS HALL OF FAME</span>
          </h3>
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Legends Recorded</span>
        </div>
        <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
          {hallOfFame.map((entry, idx) => (
            <div key={entry.id} className={`flex items-center justify-between p-4 rounded-2xl border ${idx === 0 ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-zinc-950/50 border-zinc-800/50'}`}>
              <div className="flex items-center gap-4 flex-1">
                <div className="space-y-1">
                  <p className="text-xs font-black text-white uppercase tracking-tight">{entry.teamName}</p>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{new Date(entry.date).toLocaleDateString('en-GB')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {idx === 0 && <div className="p-1.5 bg-yellow-500/10 text-yellow-500 rounded-lg"><Crown size={14} /></div>}
                {user.role === 'admin' && (
                  <button
                    onClick={() => onDeleteHOF(entry.id)}
                    className="p-2 text-zinc-700 hover:text-red-500 transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {user.role === 'admin' && (
        <>
          <button
            onClick={onResetData}
            className="w-full mt-4 bg-zinc-950 border border-red-500/20 text-red-500 p-4 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 group"
          >
            <RotateCcw size={16} className="group-hover:-rotate-180 transition-transform duration-500" /> Reset System Data
          </button>
        </>
      )}
    </div>
  );
};

export default Dashboard;
