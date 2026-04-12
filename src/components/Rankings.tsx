import React, { useMemo, useState } from 'react';
import { Trophy, Medal, Crown, Info, Zap, Target, Star, RefreshCw } from 'lucide-react';
import { Player, Tournament } from '../types';

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
                    <div className="text-[10px] font-black text-zinc-400 bg-white/5 backdrop-blur-xl px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest">
                        SEASON 2026
                    </div>
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
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg ${index === 0 ? 'bg-green-500 text-zinc-950' :
                                        index < captainCount ? 'bg-zinc-800 text-white' :
                                            'bg-zinc-800/60 text-white'
                                        }`}>
                                        {index === 0 ? <Crown size={28} strokeWidth={3} /> : displayRank}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-black text-white uppercase tracking-tight">{player.name}</h3>
                                            {rankDiff !== 0 && (
                                                <span className={`text-[10px] font-black flex items-center gap-0.5 ${rankDiff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {rankDiff > 0 ? '⬆️' : '⬇️'} {Math.abs(rankDiff)}
                                                </span>
                                            )}
                                            {rankDiff === 0 && (
                                                <span className="text-[10px] font-black text-zinc-700">➖</span>
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
                    <h3 className="text-[10px] font-black uppercase tracking-widest">Global Scoring Logic</h3>
                </div>

                <div className="liquid-card-elevated rounded-[2rem] p-6 space-y-6 shadow-2xl">
                    <div className="grid grid-cols-1 gap-6">
                        {/* Point 1: Placement */}
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-black text-white uppercase flex items-center gap-2 tracking-tight">
                                <Trophy size={14} className="text-yellow-500" /> 1. Tournament Placement
                            </h4>
                            <div className="grid grid-cols-5 gap-2">
                                {[
                                    { rank: '1st', pts: '+10' },
                                    { rank: '2nd', pts: '+5' },
                                    { rank: '3rd', pts: '0' },
                                    { rank: '4th', pts: '-5' },
                                    { rank: '5th', pts: '-10' }
                                ].map((item) => (
                                    <div key={item.rank} className="bg-white/5 border border-white/10 p-2 rounded-xl text-center">
                                        <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">{item.rank}</p>
                                        <p className={`text-[10px] font-black ${item.pts.startsWith('+') ? 'text-green-500' : item.pts.startsWith('-') ? 'text-red-500' : 'text-zinc-400'}`}>{item.pts}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Point 2: Match Win Points */}
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-black text-white uppercase flex items-center gap-2 tracking-tight">
                                <Trophy size={14} className="text-orange-500" /> 2. Match Win Points
                            </h4>
                            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <Trophy size={32} className="text-orange-500" />
                                </div>
                                <p className="text-[10px] font-bold text-zinc-400 leading-relaxed relative z-10">
                                    Each match won in the group stage awards <span className="text-white">+2 points</span>.
                                </p>
                                <div className="mt-2 py-1 px-3 bg-orange-500/10 border border-orange-500/20 rounded-lg inline-block">
                                    <code className="text-[9px] font-black text-orange-500 uppercase tracking-wider">3 Wins = +6 Points</code>
                                </div>
                            </div>
                        </div>

                        {/* Point 3: Performance */}
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-black text-white uppercase flex items-center gap-2 tracking-tight">
                                <Zap size={14} className="text-blue-400" /> 3. Performance Bonus
                            </h4>
                            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <Target size={32} className="text-blue-400" />
                                </div>
                                <p className="text-[10px] font-bold text-zinc-400 leading-relaxed relative z-10">
                                    Positive Point Difference is divided by 2 and added to your score. Negative difference does not result in a penalty.
                                </p>
                                <div className="mt-2 py-1 px-3 bg-blue-500/10 border border-blue-500/20 rounded-lg inline-block">
                                    <code className="text-[9px] font-black text-blue-400 uppercase tracking-wider">Score = Base + (Diff &gt; 0 ? Diff / 2 : 0)</code>
                                </div>
                            </div>
                        </div>

                        {/* Practical Example */}
                        <div className="bg-green-500/5 border border-green-500/10 p-4 rounded-2xl space-y-2">
                            <p className="text-[9px] font-black text-green-500 uppercase tracking-widest">Example Calculation:</p>
                            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                                If <span className="text-white font-black">PLAYER</span> comes 1st <span className="text-green-500 font-bold">(+10)</span>, wins 3 matches <span className="text-orange-500 font-bold">(3x2 = +6)</span>, and finishes with <span className="text-white font-black">+20</span> point difference <span className="text-blue-400 font-bold">(20/2 = +10)</span>...
                            </p>
                            <p className="text-xs font-black text-white uppercase pt-1 tracking-tight">
                                Total Global Gain: <span className="text-green-500 font-black">10 + 6 + 10 = +26 Points</span>
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-600">
                            <Star size={12} strokeWidth={3} />
                            <p className="text-[8px] font-black uppercase tracking-[0.2em]">Tie breaker: Win Rate % &gt; Total Pnt. Diff</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Rankings;
