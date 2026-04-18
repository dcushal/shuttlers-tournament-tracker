import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Player, Tournament, HallOfFameEntry } from '../types';
import { Plus, Trash2, UserPlus, Trophy, ChevronDown, Camera, CheckCircle2, Star } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { computePlayerPerformanceStats, computeLastTournamentDelta } from '../utils/playerStats';

gsap.registerPlugin(useGSAP);

interface Props {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  addPlayer: (player: Player) => Promise<void>;
  deletePlayer: (playerId: string) => Promise<void>;
  tournaments: Tournament[];
  hallOfFame: HallOfFameEntry[];
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
  stats: { form: ('W' | 'L')[]; titles: number };
  perfStats: { wins: number; matches: number; totalDiff: number };
  pointsDelta?: number;
  user: { role: 'admin' | 'member'; name: string };
  checkedInIds: string[];
  onToggleCheckIn: (id: string) => void;
  onOpenProfile: (player: Player) => void;
  onDelete: (id: string) => void;
  currentPlayerId?: string;
}

const PlayerPill: React.FC<PillProps> = ({
  player, isOpen, onToggle, stats, perfStats, pointsDelta,
  user, checkedInIds, onToggleCheckIn, onOpenProfile, onDelete, currentPlayerId
}) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const chevronWrapRef = useRef<HTMLSpanElement>(null);
  const isCheckedIn = checkedInIds.includes(player.id);
  const wr = perfStats.matches > 0 ? Math.round((perfStats.wins / perfStats.matches) * 100) : 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Animate on isOpen change
  React.useEffect(() => {
    const body = bodyRef.current;
    const chevron = chevronWrapRef.current;
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
    return () => {
      gsap.killTweensOf(body);
      if (chevron) gsap.killTweensOf(chevron);
    };
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
          <span ref={chevronWrapRef} style={{ display: 'inline-flex' }}>
            <ChevronDown size={16} className="text-zinc-600" />
          </span>
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

          {/* Tournament wins */}
          <div className="flex items-center justify-between mt-2 mb-0.5 px-1 py-1.5 rounded-xl bg-yellow-500/6 border border-yellow-500/12">
            <div className="flex items-center gap-1.5">
              <Trophy size={11} className="text-yellow-500" />
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Tournament Wins</p>
            </div>
            <span className={`text-[11px] font-black ${stats.titles > 0 ? 'text-yellow-400' : 'text-zinc-600'}`}>
              {stats.titles}
            </span>
          </div>

          {/* Last tournament delta */}
          {pointsDelta !== undefined && pointsDelta !== 0 && (
            <div className="flex items-center justify-between mt-2 mb-0.5 px-1 py-1.5 rounded-xl bg-zinc-900/50">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Last Tournament</p>
              <span className={`text-[11px] font-black ${pointsDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {pointsDelta > 0 ? `+${pointsDelta}` : pointsDelta} pts
              </span>
            </div>
          )}

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
              className="w-full flex items-center justify-center gap-2 mt-3 mb-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 font-black uppercase text-[10px] tracking-widest py-2.5 rounded-2xl transition-all active:scale-[0.98]"
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
  tournaments, hallOfFame, user, checkedInIds, onToggleCheckIn, onOpenProfile, currentPlayerId
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPoints, setNewPlayerPoints] = useState(10);
  const [openPillId, setOpenPillId] = useState<string | null>(null);

  const playerStats = useMemo(() => {
    const stats: Record<string, { form: ('W' | 'L')[]; titles: number }> = {};

    (hallOfFame ?? []).forEach(entry => {
      if (!entry?.teamName) return;
      const names = entry.teamName.split(' & ').map(n => n.trim().toLowerCase());
      players.forEach(p => {
        if (names.includes(p.name.toLowerCase())) {
          if (!stats[p.id]) stats[p.id] = { form: [], titles: 0 };
          stats[p.id].titles++;
        }
      });
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
  }, [players, tournaments, hallOfFame]);

  const perfStats = useMemo(
    () => computePlayerPerformanceStats(players, tournaments),
    [players, tournaments]
  );

  const pointsDeltas = useMemo(
    () => computeLastTournamentDelta(players, tournaments),
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

  // Suppress unused-variable warning — setPlayers is kept in Props for App.tsx compatibility
  void setPlayers;

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
              stats={playerStats[player.id] ?? { form: [], titles: 0 }}
              perfStats={perfStats[player.id] ?? { wins: 0, matches: 0, totalDiff: 0 }}
              pointsDelta={pointsDeltas[player.id]}
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
