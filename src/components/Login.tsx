import React, { useState } from 'react';
import { Lock, ArrowRight, User, AlertCircle } from 'lucide-react';
import { Player } from '../types';
import Logo from './Logo';

interface LoginProps {
  onLogin: (role: 'admin' | 'member', name: string) => void;
  players: Player[];
}

export const Login: React.FC<LoginProps> = ({ onLogin, players }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Admin Login
    if (username.toLowerCase() === 'admin') {
      if (password === '098765') {
        onLogin('admin', 'Admin');
      } else {
        setError('Invalid admin password');
      }
      return;
    }

    // Member Login
    const player = players.find(p => p.name.toLowerCase() === username.toLowerCase());
    if (player) {
      if (password === '123456') {
        onLogin('member', player.name);
      } else {
        setError('Invalid password');
      }
      return;
    }

    setError('User not found in roster');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center flex flex-col items-center">
          <div className="w-96 h-64 flex items-center justify-center overflow-hidden mb-[-2rem] animate-float">
            <Logo className="w-full h-full" />
          </div>
          <div className="space-y-1 relative z-10 mb-8">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <span className="bg-gradient-to-r from-white via-white/50 to-white bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent">8:30</span>
              <span className="bg-gradient-to-r from-green-500 via-green-300 to-green-500 bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent">Shuttlers</span>
            </h1>
            <p className="text-zinc-400 text-sm">Enter your credentials to access</p>
          </div>
        </div>

        <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter name (e.g. Kushal) or 'admin'"
                  className="w-full bg-zinc-950 border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-zinc-950 border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-500/10 p-3 rounded-lg">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 text-zinc-950 font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
            >
              Login <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Default Member Password: 123456</p>
          </div>
        </div>
      </div>
      <div className="mt-12 text-center">
        <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.3em] opacity-50">mini stadium, Thane</p>
      </div>
    </div>
  );
};

export default Login;
