import React, { useMemo } from 'react';
import { BarChart2, TrendingUp, Zap, Target, Users, ArrowLeft, Clock, Flame } from 'lucide-react';
import { Player, CasualMatch } from '../types';
import StatsChart from './StatsChart';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subMonths, isSameDay } from 'date-fns';

interface CasualStatsProps {
    players: Player[];
    matches: CasualMatch[];
    currentUser: { name: string } | null;
    onBack: () => void;
}

const CasualStats: React.FC<CasualStatsProps> = ({ players, matches, currentUser, onBack }) => {
    const playerId = useMemo(() => {
        if (!currentUser) return null;
        return players.find(p => p.name.toLowerCase() === currentUser.name.toLowerCase())?.id;
    }, [players, currentUser]);

    const stats = useMemo(() => {
        if (!playerId) return null;

        const myMatches = matches.filter(m =>
            m.teamA.player1Id === playerId || m.teamA.player2Id === playerId ||
            m.teamB.player1Id === playerId || m.teamB.player2Id === playerId
        );

        const now = new Date();
        const week = { start: startOfWeek(now), end: endOfWeek(now) };
        const month = { start: startOfMonth(now), end: endOfMonth(now) };

        const getPeriodStats = (start: Date, end: Date) => {
            const filtered = myMatches.filter(m => isWithinInterval(new Date(m.date), { start, end }));
            const won = filtered.filter(m => {
                const isTeamA = m.teamA.player1Id === playerId || m.teamA.player2Id === playerId;
                return (isTeamA && m.winner === 'A') || (!isTeamA && m.winner === 'B');
            }).length;
            return { total: filtered.length, won, lost: filtered.length - won };
        };

        // 1. Overview Stats
        const overallWon = myMatches.filter(m => {
            const isTeamA = m.teamA.player1Id === playerId || m.teamA.player2Id === playerId;
            return (isTeamA && m.winner === 'A') || (!isTeamA && m.winner === 'B');
        }).length;
        const overallLost = myMatches.length - overallWon;

        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dayMatches = myMatches.filter(m => isSameDay(new Date(m.date), d));
            return { name: format(d, 'EEE'), count: dayMatches.length };
        });

        // 2. Best Pairings & Rivals
        const partners: Record<string, { wins: number; total: number }> = {};
        const opponents: Record<string, { wins: number; total: number }> = {};

        myMatches.forEach(m => {
            const isTeamA = m.teamA.player1Id === playerId || m.teamA.player2Id === playerId;
            const myTeam = isTeamA ? m.teamA : m.teamB;
            const oppTeam = isTeamA ? m.teamB : m.teamA;
            const isWin = (isTeamA && m.winner === 'A') || (!isTeamA && m.winner === 'B');

            // Partner logic
            const partnerId = myTeam.player1Id === playerId ? myTeam.player2Id : myTeam.player1Id;
            if (partnerId) {
                if (!partners[partnerId]) partners[partnerId] = { wins: 0, total: 0 };
                partners[partnerId].total++;
                if (isWin) partners[partnerId].wins++;
            }

            // Opponent logic
            [oppTeam.player1Id, oppTeam.player2Id].forEach(oppId => {
                if (oppId) {
                    if (!opponents[oppId]) opponents[oppId] = { wins: 0, total: 0 };
                    opponents[oppId].total++;
                    if (isWin) opponents[oppId].wins++;
                }
            });
        });

        const bestPartners = Object.entries(partners)
            .map(([id, s]) => ({ id, name: players.find(p => p.id === id)?.name || 'Guest', winRate: (s.wins / s.total) * 100, total: s.total }))
            .filter(p => p.total >= 2)
            .sort((a, b) => b.winRate - a.winRate)
            .slice(0, 3);

        const toughestOpponent = Object.entries(opponents)
            .map(([id, s]) => ({ id, name: players.find(p => p.id === id)?.name || 'Guest', winRate: (s.wins / s.total) * 100, total: s.total }))
            .filter(p => p.total >= 3) // Min 3 games against opp
            .sort((a, b) => {
                if (a.winRate !== b.winRate) return a.winRate - b.winRate;
                return b.total - a.total;
            })[0];

        // 3. Streak & Form
        let currentStreak = 0;
        let maxStreak = 0;
        const matchesSorted = [...myMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Form: Last 5 matches
        const form = matchesSorted.slice(-5).map(m => {
            const isTeamA = m.teamA.player1Id === playerId || m.teamA.player2Id === playerId;
            return (isTeamA && m.winner === 'A') || (!isTeamA && m.winner === 'B') ? 'W' : 'L';
        });

        matchesSorted.forEach(m => {
            const isTeamA = m.teamA.player1Id === playerId || m.teamA.player2Id === playerId;
            const won = (isTeamA && m.winner === 'A') || (!isTeamA && m.winner === 'B');
            if (won) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        });

        return {
            overall: { total: myMatches.length, won: overallWon, lost: overallLost, winRate: myMatches.length > 0 ? (overallWon / myMatches.length) * 100 : 0 },
            thisWeek: getPeriodStats(week.start, week.end),
            thisMonth: getPeriodStats(month.start, month.end),
            chartData: last7Days,
            pieData: [
                { name: 'Won', value: overallWon },
                { name: 'Lost', value: overallLost }
            ],
            bestPartners,
            toughestOpponent,
            maxStreak,
            form
        };
    }, [playerId, matches, players]);

    if (!playerId) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                <BarChart2 size={48} className="text-zinc-800" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Could not find your player profile</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-center gap-3 px-2">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">My Stats</h2>
            </div>

            {stats && (
                <div className="space-y-6">
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Win Rate Pie Chart Card */}
                        <div className="col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[2.5rem] p-6 flex flex-row items-center justify-between relative overflow-hidden group">
                            <div className="space-y-2 z-10">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Target size={12} /> Win Rate
                                </p>
                                <p className="text-5xl font-black text-white tracking-tighter">{stats.overall.winRate.toFixed(0)}%</p>
                                <p className="text-[10px] text-zinc-500 font-bold">{stats.overall.won} Wins - {stats.overall.lost} Losses</p>
                            </div>

                            <div className="w-32 h-32 relative z-10">
                                <StatsChart
                                    type="pie"
                                    data={stats.pieData}
                                    dataKeys={['value']}
                                    colors={['#22c55e', '#ef4444']}
                                    height={120}
                                />
                            </div>
                        </div>

                        {/* Best Streak */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5 space-y-3 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all"></div>
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-orange-500/10 rounded-xl text-orange-500 w-fit">
                                    <Flame size={16} />
                                </div>
                            </div>
                            <div>
                                <span className="text-2xl font-black text-white">{stats.maxStreak}</span>
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">Best Streak</p>
                            </div>
                        </div>

                        {/* Toughest Opponent */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5 space-y-3 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all"></div>
                            {stats.toughestOpponent ? (
                                <>
                                    <div className="flex justify-between items-start">
                                        <div className="p-2 bg-red-500/10 rounded-xl text-red-500 w-fit">
                                            <Zap size={16} />
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-lg font-black text-white leading-tight block truncate">{stats.toughestOpponent.name}</span>
                                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                                            {stats.toughestOpponent.winRate > 40 ? 'Closest Rival' : 'Toughest Opponent'}
                                        </p>
                                        <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
                                            {stats.toughestOpponent.winRate.toFixed(0)}% Win Rate ({stats.toughestOpponent.total} games)
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col justify-center items-center text-center opacity-50">
                                    <p className="text-[9px] font-black text-zinc-500 uppercase">No Rival Yet</p>
                                    <p className="text-[8px] font-bold text-zinc-600 mt-1">Play min 3 games</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Form (Last 5 Games) */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <TrendingUp size={12} /> Last 5 Matches
                        </h3>
                        <div className="flex justify-between items-center px-2">
                            {stats.form.length > 0 ? stats.form.map((result, i) => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-zinc-950 shadow-lg ${result === 'W' ? 'bg-green-500 shadow-green-500/0' : 'bg-red-500 shadow-red-500/0'}`}
                                    >
                                        {result}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-[10px] text-zinc-600 font-bold uppercase w-full text-center">No recent matches</p>
                            )}
                        </div>
                        <div className="flex justify-between mt-4 text-[8px] font-bold text-zinc-600 uppercase tracking-widest px-2">
                            <span>Oldest</span>
                            <span>Newest</span>
                        </div>
                    </div>

                    {/* Activity Chart */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 space-y-4">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Clock size={14} className="text-blue-500" /> Matches Played (Last 7 Days)
                        </h3>
                        <div className="pt-4 h-[200px]">
                            <StatsChart type="bar" data={stats.chartData} dataKeys={['count']} colors={['#3b82f6']} height={180} />
                        </div>
                    </div>

                    {/* Best Partners */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                            <Users size={12} /> Best Pairing Partners
                        </h3>
                        <div className="space-y-2">
                            {stats.bestPartners.map((p, i) => {
                                let rankColor = 'text-zinc-400 bg-zinc-800';
                                let borderColor = 'border-zinc-800';
                                if (i === 0) { rankColor = 'text-yellow-500 bg-yellow-500/10 border border-yellow-500/20'; borderColor = 'border-yellow-500/20'; }
                                if (i === 1) { rankColor = 'text-zinc-300 bg-zinc-300/10 border border-zinc-300/20'; borderColor = 'border-zinc-500/30'; }
                                if (i === 2) { rankColor = 'text-orange-700 bg-orange-700/10 border border-orange-700/20'; borderColor = 'border-orange-900/30'; }

                                return (
                                    <div key={p.id} className={`bg-zinc-900 border ${borderColor} p-4 rounded-3xl flex items-center justify-between`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${rankColor}`}>
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-black uppercase ${players.find(pl => pl.id === p.id)?.type === 'guest' ? 'text-blue-300' : 'text-white'}`}>
                                                    {p.name}
                                                </p>
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{p.total} games played</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-green-500">{p.winRate.toFixed(0)}%</p>
                                            <p className="text-[8px] font-black text-zinc-600 uppercase">Win Rate</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {stats.bestPartners.length === 0 && (
                                <p className="text-[9px] text-zinc-700 font-bold uppercase text-center py-4">Not enough games with recurring partners</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CasualStats;
