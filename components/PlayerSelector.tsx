import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Users, Plus, Search, ChevronDown, Check } from 'lucide-react';
import { Player } from '../types';

interface PlayerSelectorProps {
    label: string;
    value: string;
    players: Player[];
    onChange: (id: string) => void;
    onAddGuest?: () => void;
    excludeIds?: string[];
}

const PlayerSelector: React.FC<PlayerSelectorProps> = ({
    label,
    value,
    players,
    onChange,
    onAddGuest,
    excludeIds = []
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedPlayer = useMemo(() => players.find(p => p.id === value), [players, value]);

    const filteredPlayers = useMemo(() => {
        const base = players.filter(p => !excludeIds.includes(p.id));
        if (!search) return base;
        return base.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }, [players, excludeIds, search]);

    const members = useMemo(() => filteredPlayers.filter(p => p.type !== 'guest'), [filteredPlayers]);
    const guests = useMemo(() => filteredPlayers.filter(p => p.type === 'guest'), [filteredPlayers]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (id: string) => {
        if (id === 'add_guest') {
            onAddGuest?.();
        } else {
            onChange(id);
        }
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className="space-y-1.5 flex-1" ref={containerRef}>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative">
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full bg-zinc-900 border ${isOpen ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-zinc-800'} rounded-2xl py-4 pl-12 pr-10 text-sm font-bold text-white transition-all cursor-pointer flex items-center min-h-[54px]`}
                >
                    {selectedPlayer ? (
                        <span className={selectedPlayer.type === 'guest' ? 'text-blue-300' : 'text-white'}>
                            {selectedPlayer.name}
                        </span>
                    ) : (
                        <span className="text-zinc-600">Select Player...</span>
                    )}
                </div>

                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    {selectedPlayer ? (
                        selectedPlayer.type === 'guest'
                            ? <Users size={18} className="text-blue-400" />
                            : <User size={18} className="text-green-500" />
                    ) : (
                        <User size={18} className="text-zinc-700" />
                    )}
                </div>

                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                    <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                {isOpen && (
                    <div className="absolute z-[100] top-full mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Search Input */}
                        <div className="p-3 border-b border-zinc-800/50">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search player name..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-white focus:outline-none focus:border-green-500/50"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                            {members.length > 0 && (
                                <div className="px-2 py-2">
                                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-3 mb-1">Members</p>
                                    {members.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleSelect(p.id)}
                                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-between group"
                                        >
                                            <span className="text-xs font-bold text-white group-hover:text-green-500">{p.name}</span>
                                            {value === p.id && <Check size={14} className="text-green-500" />}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {guests.length > 0 && (
                                <div className="px-2 py-2 border-t border-zinc-800/30">
                                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-3 mb-1">Guests</p>
                                    {guests.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleSelect(p.id)}
                                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-between group"
                                        >
                                            <span className="text-xs font-bold text-zinc-400 group-hover:text-blue-400">{p.name}</span>
                                            {value === p.id && <Check size={14} className="text-blue-500" />}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {onAddGuest && (
                                <div className="p-2 bg-zinc-950/50">
                                    <button
                                        onClick={() => handleSelect('add_guest')}
                                        className="w-full text-left px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 flex items-center gap-2 hover:bg-green-500 hover:text-zinc-950 transition-all"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Add New Guest</span>
                                    </button>
                                </div>
                            )}

                            {filteredPlayers.length === 0 && !onAddGuest && (
                                <div className="p-8 text-center">
                                    <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">No players found</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerSelector;
