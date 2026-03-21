import React from 'react';
import { Trophy, Activity, LogOut } from 'lucide-react';

interface ModeSelectorProps {
    onSelect: (mode: 'casual' | 'tournament') => void;
    onLogout?: () => void;
    userName?: string;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ onSelect, onLogout, userName }) => {
    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
                    Shuttlers <span className="text-green-500">Club</span>
                </h1>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Select Game Mode</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
                <button
                    onClick={() => onSelect('casual')}
                    className="group relative bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 text-center hover:border-green-500/50 transition-all active:scale-95 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity size={80} className="text-green-500" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-green-500 group-hover:text-zinc-950 transition-all">
                            <Activity size={32} strokeWidth={2.5} className="text-green-500 group-hover:text-zinc-950" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Casual Matches</h2>
                            <p className="text-zinc-500 font-medium text-xs mt-1">Log informal games & track personal stats</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => onSelect('tournament')}
                    className="group relative bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 text-center hover:border-yellow-500/50 transition-all active:scale-95 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Trophy size={80} className="text-yellow-500" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-yellow-500 group-hover:text-zinc-950 transition-all">
                            <Trophy size={32} strokeWidth={2.5} className="text-yellow-500 group-hover:text-zinc-950" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Tournaments</h2>
                            <p className="text-zinc-500 font-medium text-xs mt-1">Full-featured ranking & tournament tracking</p>
                        </div>
                    </div>
                </button>
            </div>

            {onLogout && (
                <div className="pt-4 border-t border-zinc-800 w-full max-w-sm">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-red-500 hover:border-red-500/30 transition-all active:scale-95"
                    >
                        <LogOut size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">Log Out{userName ? ` (${userName})` : ''}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ModeSelector;
