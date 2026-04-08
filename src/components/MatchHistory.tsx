import React from 'react';
import { History as HistoryIcon, Trash2, Calendar, User, Users, ArrowLeft, RefreshCw } from 'lucide-react';
import { CasualMatch, Player } from '../types';

interface MatchHistoryProps {
    matches: CasualMatch[];
    players: Player[];
    onDelete: (id: string) => void;
    onBack: () => void;
    onRefresh: () => void;
    currentUser?: Player | null;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ matches, players, onDelete, onBack, onRefresh, currentUser }) => {
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';
    const isGuest = (id: string) => players.find(p => p.id === id)?.type === 'guest';

    const handleSync = async () => {
        setIsRefreshing(true);
        onRefresh();
        // Artificial delay for feedback if it's too fast
        setTimeout(() => setIsRefreshing(false), 800);
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                    <HistoryIcon className="text-purple-500" /> Match History
                </h2>
                <button
                    onClick={handleSync}
                    disabled={isRefreshing}
                    className={`w-10 h-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Sync with Database"
                >
                    <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-green-500' : ''} />
                </button>
            </div>

            <div className="space-y-3">
                {matches.length === 0 ? (
                    <div className="liquid-card-elevated rounded-3xl p-12 text-center space-y-2">
                        <HistoryIcon size={48} className="mx-auto text-zinc-700 opacity-50" />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No matches logged yet</p>
                    </div>
                ) : (
                    matches.map((match) => {
                        // Find current user's ID
                        const currentUserId = players.find(p => p.name.toLowerCase() === currentUser?.name?.toLowerCase())?.id;

                        // Check which team the user is in
                        const isTeamA = match.teamA.player1Id === currentUserId || match.teamA.player2Id === currentUserId;
                        const isTeamB = match.teamB.player1Id === currentUserId || match.teamB.player2Id === currentUserId;

                        // Determine display order:
                        // If user is in Team B, we show Team B on the left (as "My Team").
                        // Otherwise (Team A or Spectator), we show Team A on the left.
                        const displayMyTeam = isTeamB ? match.teamB : match.teamA;
                        const displayOpponent = isTeamB ? match.teamA : match.teamB;

                        // Determine victory status based on the *displayed* left team (My Team)
                        const myTeamLetter = isTeamB ? 'B' : 'A';
                        const isWin = match.winner === myTeamLetter;

                        const hasGuest = isGuest(match.teamA.player1Id) || isGuest(match.teamA.player2Id) || isGuest(match.teamB.player1Id) || isGuest(match.teamB.player2Id);

                        return (
                            <div key={match.id} className={`liquid-card-elevated rounded-3xl overflow-hidden shadow-lg mb-3 ${hasGuest ? 'border-blue-500/30' : ''}`}>
                                <div className="p-4 space-y-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                                            <Calendar size={10} /> {new Date(match.date).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                                        {/* My Team (Left) */}
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-sm font-black uppercase truncate ${match.winner === (isTeamB ? 'B' : 'A') ? 'text-green-500' : 'text-zinc-600 opacity-90'}`}>
                                                {getPlayerName(displayMyTeam.player1Id)}
                                            </span>
                                            <span className={`text-sm font-black uppercase truncate ${match.winner === (isTeamB ? 'B' : 'A') ? 'text-green-500' : 'text-zinc-600 opacity-90'}`}>
                                                {getPlayerName(displayMyTeam.player2Id)}
                                            </span>
                                        </div>

                                        {/* Score (Middle) */}
                                        <div className="flex items-center gap-2 text-3xl font-black italic tracking-tighter tabular-nums text-center">
                                            <span className={match.winner === (isTeamB ? 'B' : 'A') ? 'text-green-500' : 'text-zinc-600 opacity-70'}>{displayMyTeam.score}</span>
                                            <span className="text-zinc-700 text-lg opacity-50">-</span>
                                            <span className={match.winner === (isTeamB ? 'A' : 'B') ? 'text-green-500' : 'text-zinc-600 opacity-70'}>{displayOpponent.score}</span>
                                        </div>

                                        {/* Opponent Team (Right) */}
                                        <div className="flex flex-col gap-1 text-right">
                                            <span className={`text-sm font-black uppercase truncate ${match.winner === (isTeamB ? 'A' : 'B') ? 'text-green-500' : 'text-zinc-600 opacity-90'}`}>
                                                {getPlayerName(displayOpponent.player1Id)}
                                            </span>
                                            <span className={`text-sm font-black uppercase truncate ${match.winner === (isTeamB ? 'A' : 'B') ? 'text-green-500' : 'text-zinc-600 opacity-90'}`}>
                                                {getPlayerName(displayOpponent.player2Id)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`p-2 px-4 flex justify-between items-center border-t ${hasGuest ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/5 border-white/10'}`}>
                                    <div className="flex gap-2">
                                        {hasGuest ? (
                                            <span className="flex items-center gap-1 text-[8px] font-bold text-blue-400 uppercase tracking-widest">
                                                <Users size={8} /> Guest Match
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[8px] font-bold text-zinc-700 uppercase tracking-widest opacity-50">
                                                <User size={8} /> Ranked Match
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm("Delete this match record?")) {
                                                onDelete(match.id);
                                            }
                                        }}
                                        className="text-zinc-700 hover:text-red-500 transition-all p-1"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default MatchHistory;
