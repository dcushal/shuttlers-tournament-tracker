import React, { useState } from 'react';
import { X, UserPlus, Users } from 'lucide-react';

interface AddGuestModalProps {
    onClose: () => void;
    onAdd: (name: string) => void;
}

const AddGuestModal: React.FC<AddGuestModalProps> = ({ onClose, onAdd }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onAdd(name.trim());
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
                            <Users size={20} />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tight">Add Guest</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Guest Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. John Doe"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 text-white font-bold placeholder:text-zinc-700 focus:outline-none focus:border-green-500 transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="w-full bg-green-500 text-zinc-950 py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-20 hover:bg-green-400 transition-all shadow-xl shadow-green-500/10"
                    >
                        Add to Players <UserPlus size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddGuestModal;
