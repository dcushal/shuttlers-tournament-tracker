import React from 'react';
import Logo from './Logo';
import { LogOut, ArrowLeft } from 'lucide-react';
import { Player } from '../types';

interface Props {
  onLogout?: () => void;
  onBackToModes?: () => void;
  user?: { role: 'admin' | 'member'; name: string } | null;
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
  mode?: 'casual' | 'tournament' | null;
  currentPlayer?: Player;
  onOpenProfile?: () => void;
}

const Header: React.FC<Props> = ({ onLogout, onBackToModes, user, currentPlayer, onOpenProfile }) => {
  return (
    <header className="liquid-card-elevated py-4 z-40">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToModes && (
            <button
              onClick={onBackToModes}
              className="flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-90"
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
                <button
                  onClick={onOpenProfile}
                  disabled={!onOpenProfile}
                  className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest hover:text-green-400 transition-colors disabled:pointer-events-none"
                >
                  {user?.name || 'Guest'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Avatar button */}
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="w-9 h-9 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-green-500/50 transition-colors"
            >
              {currentPlayer?.avatarUrl ? (
                <img
                  src={currentPlayer.avatarUrl}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <span className="text-xs font-black text-green-500">
                  {user?.name?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center justify-center text-zinc-400 hover:text-red-500 active:scale-90 transition-all"
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
