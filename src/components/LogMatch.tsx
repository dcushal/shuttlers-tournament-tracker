import React, { useState } from 'react';
import { Save, Calendar, Check, X, ArrowLeft } from 'lucide-react';
import { Player, CasualMatch } from '../types';
import PlayerSelector from './PlayerSelector';
import AddGuestModal from './AddGuestModal';

interface LogMatchProps {
    players: Player[];
    onSave: (match: CasualMatch) => void;
    onAddGuest: (name: string) => void;
    onCancel: () => void;
    currentUserId?: string;
}

const LogMatch: React.FC<LogMatchProps> = ({
    players,
    onSave,
    onAddGuest,
    onCancel,
    currentUserId
}) => {
    const [teamA1, setTeamA1] = useState('');
    const [teamA2, setTeamA2] = useState('');
    const [teamB1, setTeamB1] = useState('');
    const [teamB2, setTeamB2] = useState('');
    const [scoreA, setScoreA] = useState('');
    const [scoreB, setScoreB] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [showGuestModal, setShowGuestModal] = useState(false);

    const isFormValid = teamA1 && teamA2 && teamB1 && teamB2 && scoreA && scoreB;

    const handlePlayerSelectorChange = (setter: (val: string) => void) => (val: string) => {
        if (val === 'add_guest') {
            setShowGuestModal(true);
        } else {
            setter(val);
        }
    };

    const handleSave = () => {
        if (!isFormValid) return;

        const sA = parseInt(scoreA);
        const sB = parseInt(scoreB);

        const match: CasualMatch = {
            id: crypto.randomUUID(),
            date,
            teamA: {
                player1Id: teamA1,
                player2Id: teamA2,
                score: sA
            },
            teamB: {
                player1Id: teamB1,
                player2Id: teamB2,
                score: sB
            },
            winner: sA > sB ? 'A' : 'B',
            loggedByUserId: currentUserId
        };

        onSave(match);
        onCancel();
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Log Match</h2>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 space-y-8 shadow-2xl">
                {/* Date Selection */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Match Date</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full block box-border min-w-0 bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-12 text-white font-bold focus:outline-none focus:border-green-500 transition-all appearance-none cursor-pointer"
                        />
                        <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                    </div>
                </div>

                {/* Team A */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Team A</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                        <PlayerSelector
                            label="Player 1"
                            value={teamA1}
                            players={players}
                            onChange={handlePlayerSelectorChange(setTeamA1)}
                            onAddGuest={() => setShowGuestModal(true)}
                            excludeIds={[teamA2, teamB1, teamB2]}
                        />
                        <PlayerSelector
                            label="Player 2"
                            value={teamA2}
                            players={players}
                            onChange={handlePlayerSelectorChange(setTeamA2)}
                            onAddGuest={() => setShowGuestModal(true)}
                            excludeIds={[teamA1, teamB1, teamB2]}
                        />
                    </div>
                </div>

                {/* Team B */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                        <span className="w-2 h-2 rounded-full bg-zinc-700"></span>
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Team B (Opponents)</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                        <PlayerSelector
                            label="Player 1"
                            value={teamB1}
                            players={players}
                            onChange={handlePlayerSelectorChange(setTeamB1)}
                            onAddGuest={() => setShowGuestModal(true)}
                            excludeIds={[teamA1, teamA2, teamB2]}
                        />
                        <PlayerSelector
                            label="Player 2"
                            value={teamB2}
                            players={players}
                            onChange={handlePlayerSelectorChange(setTeamB2)}
                            onAddGuest={() => setShowGuestModal(true)}
                            excludeIds={[teamA1, teamA2, teamB1]}
                        />
                    </div>
                </div>

                {/* Scores */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Scores</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 text-center">
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Team A</label>
                            <input
                                type="number"
                                value={scoreA}
                                onChange={(e) => setScoreA(e.target.value)}
                                placeholder="0"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-5 text-3xl font-black text-center text-white focus:outline-none focus:border-green-500 transition-all"
                            />
                        </div>
                        <div className="space-y-2 text-center">
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Team B</label>
                            <input
                                type="number"
                                value={scoreB}
                                onChange={(e) => setScoreB(e.target.value)}
                                placeholder="0"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-5 text-3xl font-black text-center text-white focus:outline-none focus:border-red-500/50 transition-all font-outline"
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={!isFormValid}
                    className="w-full bg-green-500 text-zinc-950 py-5 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-20 hover:bg-green-400 transition-all shadow-xl shadow-green-500/20"
                >
                    Save Match <Save size={20} />
                </button>
            </div>

            {showGuestModal && (
                <AddGuestModal
                    onClose={() => setShowGuestModal(false)}
                    onAdd={onAddGuest}
                />
            )}
        </div>
    );
};

export default LogMatch;
