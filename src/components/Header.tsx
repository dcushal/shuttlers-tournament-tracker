
import React from 'react';
import Logo from './Logo';

import { LogOut, ArrowLeft, Trophy, Activity } from 'lucide-react';

interface Props {
  onLogout?: () => void;
  onBackToModes?: () => void;
  user?: { role: 'admin' | 'member'; name: string };
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
  mode?: 'casual' | 'tournament' | null;
}

const Header: React.FC<Props> = ({ onLogout, onBackToModes, user, mode }) => {
  return (
    <header className="glass-card-elevated py-4 z-40">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToModes && (
            <button
              onClick={onBackToModes}
              className="w-12 h-12 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-white transition-all active:scale-90"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex items-center gap-4 ml-1">
            <Logo className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-black text-white leading-none tracking-tighter uppercase">SHUTTLERS</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></div>
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest">{user?.name || 'Guest'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-12 h-12 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-red-500 active:scale-90 transition-all"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
