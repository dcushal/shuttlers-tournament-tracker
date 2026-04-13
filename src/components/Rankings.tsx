import React, { useMemo, useState } from 'react';
import { Trophy, Medal, Crown, Info, Zap, Target, Star, RefreshCw, Share2 } from 'lucide-react';
import { Player, Tournament } from '../types';

const AvatarImg: React.FC<{ url?: string; initial: React.ReactNode; name?: string }> = ({ url, initial, name }) => {
  const [error, setError] = React.useState(false);
  React.useEffect(() => { setError(false); }, [url]);
  if (!url || error) return <>{initial}</>;
  return (
    <img
      src={url}
      alt={name ?? ''}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
};

interface RankingsProps {
    players: Player[];
    tournaments: Tournament[];
    isAdmin?: boolean;
    onSyncRankings?: () => Promise<boolean>;
}

interface PlayerStats {
    id: string;
    name: string;
    gold: number;   // 1st place
    silver: number; // 2nd place
    bronze: number; // 3rd place
    points: number;
    tournamentsPlayed: number;
}

const Rankings: React.FC<RankingsProps> = ({ players, tournaments, isAdmin, onSyncRankings }) => {
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const shareRankings = () => {
        const captainCount = Math.floor(sortedPlayers.length / 2);
        const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        let text = `🏸 8:30 SHUTTLERS — LATEST RANKINGS\n`;
        text += `📅 ${date}  •  SEASON 2026\n\n`;

        sortedPlayers.forEach((player, i) => {
            const rank = i + 1;
            const pts = player.points % 1 === 0 ? player.points : player.points.toFixed(1);
            const crown = i === 0 ? '👑 ' : '    ';
            text += `${String(rank).padStart(2)}. ${crown}${player.name.padEnd(12)}${pts} pts\n`;
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
        const ok = await onSyncRankings();
        setSyncing(false);
        setSyncStatus(ok ? 'success' : 'error');
        setTimeout(() => setSyncStatus('idle'), 3000);
    };
    const playerPerformanceStats = useMemo(() => {
        const stats: Record<string, { wins: number; matches: number; totalDiff: number }> = {};
        players.forEach(p => stats[p.id] = { wins: 0, matches: 0, totalDiff: 0 });

        tournaments.forEach(t => {
            t.matches.filter(m => m.isCompleted).forEach(m => {
                const teamA = t.teams.find(tm => tm.id === m.teamAId);
                const teamB = t.teams.find(tm => tm.id === m.teamBId);
                if (teamA && teamB) {
                    const winnerId = m.scoreA > m.scoreB ? m.teamAId : m.teamBId;
                    [teamA, teamB].forEach(team => {
                        const teamDiff = team.id === m.teamAId ? (m.scoreA - m.scoreB) : (m.scoreB - m.scoreA);
                        [team.player1.id, team.player2.id].forEach(pid => {
                            if (stats[pid]) {
                                stats[pid].matches++;
                                stats[pid].totalDiff += teamDiff;
                                if (team.id === winnerId) stats[pid].wins++;
                            }
                        });
                    });
                }
            });
        });
        return stats;
    }, [players, tournaments]);

    const sortedPlayers = useMemo(() => {
        return [...players].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            // Tiebreaker: win rate, then total point diff
            const statsA = playerPerformanceStats[a.id];
            const statsB = playerPerformanceStats[b.id];
            const wrA = statsA && statsA.matches > 0 ? statsA.wins / statsA.matches : 0;
            const wrB = statsB && statsB.matches > 0 ? statsB.wins / statsB.matches : 0;
            if (wrB !== wrA) return wrB - wrA;
            return (statsB?.totalDiff ?? 0) - (statsA?.totalDiff ?? 0);
        });
    }, [players, playerPerformanceStats]);

    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                    <Trophy className="text-green-500" />
                    Global Rankings
                </h2>
                <div className="flex items-center gap-2">
                    {isAdmin && onSyncRankings && (
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${
                                syncStatus === 'success'
                                    ? 'bg-green-500/20 border-green-500/40 text-green-400'
                                    : syncStatus === 'error'
                                    ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                    : 'bg-white/5 border-white/10 text-zinc-400 hover:border-green-500/30 hover:text-green-400'
                            }`}
                        >
                            <RefreshCw size={10} className={syncing ? 'animate-spin' : ''} />
                            {syncing ? 'Syncing…' : syncStatus === 'success' ? 'Synced!' : syncStatus === 'error' ? 'Failed' : 'Sync'}
                        </button>
                    )}
                    <button
                        onClick={shareRankings}
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border bg-white/5 border-white/10 text-zinc-400 hover:border-green-500/30 hover:text-green-400 transition-all"
                        title="Share Rankings"
                    >
                        <Share2 size={10} />
                        Share
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {sortedPlayers.map((player, index) => {
                    const captainCount = Math.floor(sortedPlayers.length / 2);
                    const displayRank = index + 1;
                    const rankDiff = player.previousRank - displayRank;
                    const isPromotionZone = index === captainCount - 1; // Dynamic: after top half

                    return (
                        <React.Fragment key={player.id}>
                            <div
                                className={`relative overflow-hidden rounded-3xl p-5 transition-all liquid-card-elevated ${index < captainCount ? 'border-green-500/20' : 'border-white/5'
                                    }`}
                            >
                                {/* Rank Indicator */}
                                <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-7xl text-white pointer-events-none">
                                    #{displayRank}
                                </div>

                                <div className="flex items-center gap-5 relative z-10">
                                    <div className={`relative w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center text-xl font-black shadow-lg ${
                                        index === 0 ? 'bg-green-500 text-zinc-950' :
                                        index < captainCount ? 'bg-zinc-800 text-white' :
                                        'bg-zinc-800/60 text-white'
                                    }`}>
                                        <AvatarImg
                                            url={player.avatarUrl}
                                            initial={index === 0 ? <Crown size={28} strokeWidth={3} /> : displayRank}
                                            name={player.name}
                                        />
                                        {/* Crown overlay for #1 when they have a photo */}
                                        {index === 0 && player.avatarUrl && (
                                            <div className="absolute bottom-0.5 right-0.5 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center shadow">
                                                <Crown size={10} strokeWidth={3} className="text-zinc-950" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-lg font-black text-white uppercase tracking-tight">{player.name}</h3>
                                            {rankDiff !== 0 && (
                                                <span className={`text-[10px] font-black flex items-center gap-0.5 ${rankDiff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {rankDiff > 0 ? '⬆️' : '⬇️'} {Math.abs(rankDiff)}
                                                </span>
                                            )}
                                            {rankDiff === 0 && (
                                                <span className="text-[10px] font-black text-zinc-700">➖</span>
                                            )}
                                            {playerPerformanceStats[player.id]?.matches > 0 && (
                                                <span className="text-[10px] font-bold text-zinc-600">
                                                    {playerPerformanceStats[player.id].matches} matches
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                                            {index < captainCount ? 'CAPTAIN' : 'CHALLENGER'} • {
                                                playerPerformanceStats[player.id].matches > 0
                                                    ? `${((playerPerformanceStats[player.id].wins / playerPerformanceStats[player.id].matches) * 100).toFixed(0)}% WIN RATE`
                                                    : '0% WIN RATE'
                                            }
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <div className={`text-2xl font-black ${index === 0 ? 'text-green-500' : 'text-white'}`}>
                                            {player.points % 1 === 0 ? player.points : player.points.toFixed(1)}
                                        </div>
                                        <div className="text-[10px] uppercase font-black text-zinc-600 tracking-widest">Points</div>
                                    </div>
                                </div>
                            </div>

                            {isPromotionZone && (
                                <div className="py-2 flex items-center gap-4 px-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-500/20 to-transparent"></div>
                                    <span className="text-[9px] font-black text-green-500/50 uppercase tracking-[0.4em]">Promotion Zone</span>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-500/20 to-transparent"></div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Scoring Rules Section */}
            <div className="mt-8 space-y-4 px-1 pb-12">
                <div className="flex items-center gap-2 text-zinc-500 mb-2 px-1">
                    <Info size={14} />
                    <h3 className="text-[10px] font-black uppercase tracking-widest">How Points Work</h3>
                </div>

                <div className="liquid-card-elevated rounded-[2rem] p-6 space-y-6 shadow-2xl">

                    {/* Rule 1: Placement */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                <span className="text-[9px] font-black text-yellow-400">1</span>
                            </div>
                            <h4 className="text-[11px] font-black text-white uppercase tracking-tight">Placement Points</h4>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                            Only the <span className="text-white font-black">top half</span> of teams earn placement points. Bottom half gets nothing. The bigger the field, the bigger the reward for finishing high.
                        </p>
                        {/* Reference table */}
                        <div className="overflow-hidden rounded-2xl border border-white/10">
                            <table className="w-full text-center">
                                <thead>
                                    <tr className="bg-white/5">
                                        <td className="text-[8px] font-black text-zinc-500 uppercase py-2 px-2">Place</td>
                                        {[4,5,6,7,8,10].map(n => (
                                            <td key={n} className="text-[8px] font-black text-zinc-500 uppercase py-2">{n}T</td>
                                        ))}
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

                    {/* Rule 2: Match Wins */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                                <span className="text-[9px] font-black text-orange-400">2</span>
                            </div>
                            <h4 className="text-[11px] font-black text-white uppercase tracking-tight">Match Wins</h4>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                            Every match you win gives you <span className="text-white font-black">+2 points</span>, regardless of your final placement.
                        </p>
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

                    {/* Rule 3: Performance Bonus */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <span className="text-[9px] font-black text-blue-400">3</span>
                            </div>
                            <h4 className="text-[11px] font-black text-white uppercase tracking-tight">Performance Bonus</h4>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                            Win your matches by big margins and earn extra. Your total <span className="text-white font-black">positive point difference ÷ 2</span> is added as a bonus. Losing by a lot has no extra penalty.
                        </p>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center justify-between">
                            <span className="text-[9px] text-zinc-400">+30 point diff across all matches</span>
                            <span className="text-[10px] font-black text-blue-400">+15 bonus pts</span>
                        </div>
                    </div>

                    <div className="h-px bg-zinc-800" />

                    {/* Example */}
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
