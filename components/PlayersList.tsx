
import React, { useState, useMemo } from 'react';
import { Player, Tournament } from '../types';
import { Plus, Trash2, UserPlus, Trophy } from 'lucide-react';

interface Props {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  tournaments: Tournament[];
  user: { role: 'admin' | 'member'; name: string };
}

const PlayersList: React.FC<Props> = ({ players, setPlayers, tournaments, user }) => {
  const [newPlayerName, setNewPlayerName] = useState('');

  const playerStats = useMemo(() => {
    const stats: Record<string, { form: ('W' | 'L')[], titles: number }> = {};

    // Process Titles
    tournaments.filter(t => t.status === 'completed').forEach(t => {
      const finalMatch = t.matches.find(m => m.phase === 'finals' && m.isCompleted);
      if (finalMatch) {
        const winnerId = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamAId : finalMatch.teamBId;
        const winnerTeam = t.teams.find(tm => tm.id === winnerId);
        if (winnerTeam) {
          [winnerTeam.player1.id, winnerTeam.player2.id].forEach(pid => {
            if (!stats[pid]) stats[pid] = { form: [], titles: 0 };
            stats[pid].titles++;
          });
        }
      }
    });

    // Process Form
    const sorted = [...tournaments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    players.forEach(player => {
      if (!stats[player.id]) stats[player.id] = { form: [], titles: 0 };
      const form: ('W' | 'L')[] = [];

      for (const t of sorted) {
        if (form.length >= 5) break;
        const playerMatches = t.matches.filter(m => m.isCompleted && (
          t.teams.find(tm => tm.id === m.teamAId)?.player1.id === player.id ||
          t.teams.find(tm => tm.id === m.teamAId)?.player2.id === player.id ||
          t.teams.find(tm => tm.id === m.teamBId)?.player1.id === player.id ||
          t.teams.find(tm => tm.id === m.teamBId)?.player2.id === player.id
        ));

        playerMatches.reverse().forEach(m => {
          if (form.length >= 5) return;
          const teamA = t.teams.find(tm => tm.id === m.teamAId);
          const isTeamA = teamA?.player1.id === player.id || teamA?.player2.id === player.id;
          const won = isTeamA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
          form.push(won ? 'W' : 'L');
        });
      }
      stats[player.id].form = form.reverse();
    });

    return stats;
  }, [players, tournaments]);

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const player: Player = {
      id: crypto.randomUUID(),
      name: newPlayerName.trim()
    };
    setPlayers(prev => [...prev, player]);
    setNewPlayerName('');
  };

  const removePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-black text-white uppercase tracking-tighter">PLAYER ROSTER</h2>
        <span className="bg-zinc-900 text-zinc-400 text-[10px] px-3 py-1 rounded-full border border-zinc-800 font-black uppercase tracking-widest">
          {players.length} Active
        </span>
      </div>

      {user.role === 'admin' && (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl shadow-xl">
          <div className="relative">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Registration Name..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-white placeholder-zinc-700 focus:outline-none focus:border-green-500 font-bold transition-all"
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            />
            <button
              onClick={addPlayer}
              className="absolute right-2 top-2 bg-green-500 text-zinc-950 p-3 rounded-xl hover:bg-green-400 transition-all active:scale-95 shadow-lg shadow-green-500/20"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {players.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-[2rem]">
            <UserPlus size={48} className="mx-auto text-zinc-800 mb-3" />
            <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">No players registered</p>
          </div>
        ) : (
          players.map(player => {
            const stats = playerStats[player.id];
            return (
              <div
                key={player.id}
                className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-5 rounded-3xl group hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-green-500 font-black text-sm group-hover:bg-green-500 group-hover:text-zinc-950 transition-all">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    {stats?.titles > 0 && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 text-zinc-950 w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-900 shadow-lg">
                        <Trophy size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white uppercase tracking-tight text-base">{player.name}</span>
                      {stats?.titles > 0 && (
                        <span className="text-[10px] text-yellow-500 font-black flex items-center gap-0.5">
                          ×{stats.titles}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5 mt-1">
                      {stats?.form.length > 0 ? (
                        stats.form.map((res, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${res === 'W' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500/40'}`}
                            title={res === 'W' ? 'Win' : 'Loss'}
                          />
                        ))
                      ) : (
                        <span className="text-[8px] text-zinc-700 font-black uppercase tracking-widest">No Recent Matches</span>
                      )}
                    </div>
                  </div>
                </div>
                {user.role === 'admin' && (
                  <button
                    onClick={() => removePlayer(player.id)}
                    className="text-zinc-700 hover:text-red-500 p-2 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PlayersList;
