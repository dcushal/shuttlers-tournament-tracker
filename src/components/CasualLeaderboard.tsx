import React, { useState, useMemo } from 'react';
import { Trophy, Percent, Hash, Users, ArrowLeft } from 'lucide-react';
import { Player, CasualMatch } from '../types';

interface CasualLeaderboardProps {
    players: Player[];
    matches: CasualMatch[];
    onBack: () => void;
}

const CasualLeaderboard: React.FC<CasualLeaderboardProps> = ({ players, matches, onBack }) => {
    const [view, setView] = useState<'winrate' | 'wins'>('winrate');

    const stats = useMemo(() => {
        const data: Record<string, { wins: number; total: number; name: string; type: string }> = {};

        // Initialize with all players (members + guests)
        players.forEach(p => {
            data[p.id] = { wins: 0, total: 0, name: p.name, type: p.type || 'member' };
        });

        matches.forEach(m => {
            const pids = [m.teamA.player1Id, m.teamA.player2Id, m.teamB.player1Id, m.teamB.player2Id];
            const winIds = m.winner === 'A' ? [m.teamA.player1Id, m.teamA.player2Id] : [m.teamB.player1Id, m.teamB.player2Id];

            pids.forEach(pid => {
                if (data[pid]) {
                    data[pid].total++;
                    if (winIds.includes(pid)) data[pid].wins++;
                }
            });
        });

        return Object.entries(data).map(([id, s]) => ({
            id,
            ...s,
            winRate: s.total > 0 ? (s.wins / s.total) * 100 : 0
        }));
    }, [players, matches]);

    const sortedData = useMemo(() => {
        const sortByType = (a: any, b: any) => {
            if (a.type === 'member' && b.type !== 'member') return -1;
            if (a.type !== 'member' && b.type === 'member') return 1;
            return 0;
        };

        if (view === 'winrate') {
            return [...stats]
                .filter(s => s.total >= 5) // Min 5 matches
                .sort((a, b) => sortByType(a, b) || b.winRate - a.winRate || b.total - a.total);
        } else {
            return [...stats].sort((a, b) => sortByType(a, b) || b.wins - a.wins || b.winRate - a.winRate);
        }
    }, [stats, view]);

    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                    <Trophy className="text-yellow-500" /> Leaderboard
                </h2>
            </div>

            {/* View Toggle */}
            <div className="bg-zinc-900 p-1.5 rounded-2xl flex border border-zinc-800">
                <button
                    onClick={() => setView('winrate')}
                    className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${view === 'winrate' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                >
                    <Percent size={14} /> Win Rate %
                </button>
                <button
                    onClick={() => setView('wins')}
                    className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${view === 'wins' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                >
                    <Hash size={14} /> Total Wins
                </button>
            </div>

            {view === 'winrate' && (
                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] text-center">
                    * Qualification: Minimum 5 matches played
                </p>
            )}

            <div className="space-y-2">
                {sortedData.map((stat, index) => {
                    const isFirstGuest = stat.type === 'guest' && (index === 0 || sortedData[index - 1].type === 'member');

                    return (
                        <React.Fragment key={stat.id}>
                            {isFirstGuest && (
                                <div className="py-4 flex items-center gap-4 px-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                                    <span className="text-[10px] font-black text-blue-500/50 uppercase tracking-[0.4em]">Guest Members</span>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                                </div>
                            )}
                            <div
                                className={`bg-zinc-900 border border-zinc-800 p-5 rounded-3xl flex items-center gap-4 transition-all ${index < 3 && view === 'winrate' && stat.type === 'member' ? 'border-yellow-500/20' : ''
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black ${index === 0 && stat.type === 'member' ? 'bg-yellow-500 text-zinc-950' :
                                    index === 1 && stat.type === 'member' ? 'bg-zinc-300 text-zinc-900' :
                                        index === 2 && stat.type === 'member' ? 'bg-orange-400 text-zinc-900' :
                                            'bg-zinc-950 text-zinc-500 border border-zinc-800'
                                    }`}>
                                    {index + 1}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-sm font-black uppercase tracking-tight truncate ${stat.type === 'guest' ? 'text-blue-400' : 'text-green-500'}`}>
                                        {stat.name}
                                    </h3>
                                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                        {stat.wins} Wins / {stat.total} Total
                                    </p>
                                </div>

                                <div className="text-right">
                                    <div className={`text-xl font-black ${index === 0 && stat.type === 'member' ? 'text-yellow-500' : 'text-white'}`}>
                                        {view === 'winrate' ? `${stat.winRate.toFixed(0)}%` : stat.wins}
                                    </div>
                                    <div className="text-[8px] uppercase font-black text-zinc-600 tracking-tighter" title={view === 'winrate' ? 'Win Rate' : 'Wins'}>
                                        {view === 'winrate' ? 'Win Rate' : 'Wins'}
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}

                {sortedData.length === 0 && (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 text-center space-y-2">
                        <Users size={48} className="mx-auto text-zinc-700 opacity-50" />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No qualified players yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CasualLeaderboard;
