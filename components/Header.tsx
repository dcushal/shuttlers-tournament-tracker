
import React from 'react';
import Logo from './Logo';

const Header: React.FC = () => {
  return (
    <header className="bg-zinc-900 border-b border-green-900/30 py-4 px-6 sticky top-0 z-40 backdrop-blur-md bg-opacity-80">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Logo className="w-12 h-12" />
          <div>
            <h1 className="text-xl font-bold text-white leading-tight tracking-tight">8:30 <span className="text-green-500">Shuttlers</span></h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">Official Club App</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
            <p className="text-xs text-green-400 font-black uppercase">Live</p>
          </div>
          <p className="text-[10px] text-zinc-500 font-bold">20:30 - 22:30</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
