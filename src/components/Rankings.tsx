import React, { useMemo, useState, useRef } from 'react';
import { Trophy, Crown, Info, Star, RefreshCw, Share2 } from 'lucide-react';
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
  const syncIconRef = useRef<HTMLSpanElement>(null);

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
              <span ref={syncIconRef} className="inline-flex">
                <RefreshCw size={10} />
              </span>
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

      {/* Scoring Rules */}
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
