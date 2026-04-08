import React, { useMemo } from 'react';
import { Activity, Plus, BarChart2, List, Trophy, ArrowLeft, TrendingUp, Flame } from 'lucide-react';
import { Player, CasualMatch } from '../types';

interface CasualHomeProps {
    onSetTab: (tab: 'home' | 'log' | 'stats' | 'leaderboard' | 'history') => void;
    activeTab: string;
    onBack: () => void;
    players: Player[];
    matches: CasualMatch[];
    currentUser: { name: string } | null;
}

const CasualHome: React.FC<CasualHomeProps> = ({ onSetTab, activeTab, onBack, players, matches, currentUser }) => {
    const stats = useMemo(() => {
        if (!currentUser) return null;
        const playerId = players.find(p => p.name.toLowerCase() === currentUser.name.toLowerCase())?.id;
        if (!playerId) return null;

        const myMatches = matches.filter(m =>
            m.teamA.player1Id === playerId || m.teamA.player2Id === playerId ||
            m.teamB.player1Id === playerId || m.teamB.player2Id === playerId
        );

        const won = myMatches.filter(m => {
            const isTeamA = m.teamA.player1Id === playerId || m.teamA.player2Id === playerId;
            return (isTeamA && m.winner === 'A') || (!isTeamA && m.winner === 'B');
        }).length;

        let currentStreak = 0;
        let maxStreak = 0;
        [...myMatches].reverse().forEach(m => {
            const isTeamA = m.teamA.player1Id === playerId || m.teamA.player2Id === playerId;
            const isWon = (isTeamA && m.winner === 'A') || (!isTeamA && m.winner === 'B');
            if (isWon) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        });

        return {
            total: myMatches.length,
            winRate: myMatches.length > 0 ? (won / myMatches.length) * 100 : 0,
            streak: maxStreak
        };
    }, [players, matches, currentUser]);

    const menuItems = [
        { id: 'log', label: 'Log Match', icon: Plus, color: 'bg-green-500' },
        { id: 'stats', label: 'My Stats', icon: BarChart2, color: 'bg-blue-500' },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, color: 'bg-yellow-500' },
        { id: 'history', label: 'History', icon: List, color: 'bg-purple-500' },
    ];

    return (
        <div className="space-y-8 pb-24">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                    <Activity className="text-green-500" /> Casual Matches
                </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onSetTab(item.id as any)}
                        className="liquid-card-elevated rounded-[2rem] p-6 text-left hover:border-green-500/20 transition-all active:scale-95 space-y-4"
                    >
                        <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center text-zinc-950 shadow-lg`}>
                            <item.icon size={24} strokeWidth={2.5} />
                        </div>
                        <p className="text-sm font-black text-white uppercase tracking-tight">{item.label}</p>
                    </button>
                ))}
            </div>

            {/* Quick Stats Dashboard */}
            <div className="liquid-card-elevated rounded-[2.5rem] p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-white uppercase italic">My Performance</h3>
                    <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                        All Time
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Matches</p>
                        <p className="text-3xl font-black text-white">{stats?.total || 0}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Win Rate</p>
                        <p className="text-3xl font-black text-green-500 flex items-center gap-1">
                            {stats?.winRate.toFixed(0)}<span className="text-sm">%</span>
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Streak</p>
                        <p className="text-3xl font-black text-orange-500 flex items-center gap-1">
                            {stats?.streak || 0} <Flame size={16} fill="currentColor" />
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => onSetTab('log')}
                    className="w-full bg-white text-zinc-950 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl"
                >
                    Quick Log Match <Plus size={18} className="inline ml-1" />
                </button>
            </div>
        </div>
    );
};

export default CasualHome;
