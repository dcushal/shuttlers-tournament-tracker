import React from 'react';
import { Tournament, Player, Transaction, HallOfFameEntry } from '../types';
import { Play, Trophy, ChevronRight, Lightbulb, Clock, RotateCcw, Crown, Trash2, Award } from 'lucide-react';
import Logo from './Logo';
import DashboardHeroCard from './DashboardHeroCard';
import confetti from 'canvas-confetti';
import { computeLastTournamentDelta } from '../utils/playerStats';

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
  const pointsDeltas = React.useMemo(() => computeLastTournamentDelta(players, tournaments), [players, tournaments]);

  const playerTitles = React.useMemo(() => {
    const counts: Record<string, number> = {};
    tournaments.filter(t => t.status === 'completed').forEach(t => {
      const finalMatch = t.matches.find(m => m.phase === 'finals' && m.isCompleted);
      if (finalMatch) {
        const winnerId = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamAId : finalMatch.teamBId;
        const winnerTeam = t.teams.find(tm => tm.id === winnerId);
        if (winnerTeam) {
          [winnerTeam.player1.id, winnerTeam.player2.id].forEach(pid => {
            counts[pid] = (counts[pid] || 0) + 1;
          });
        }
      }
    });
    return counts;
  }, [tournaments]);

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
        <DashboardHeroCard player={currentPlayer} tournaments={tournaments} pointsDelta={pointsDeltas[currentPlayer.id]} titles={playerTitles[currentPlayer.id] ?? 0} />
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
