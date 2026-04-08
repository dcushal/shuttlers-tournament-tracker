
import React, { useState } from 'react';
import { Tournament, Match } from '../types';
import { Calendar, ChevronDown, ChevronUp, Award, Share2, Zap, ShieldAlert, Trash2 } from 'lucide-react';

interface Props {
  tournaments: Tournament[];
  onDeleteTournament?: (id: string) => void;
  isAdmin?: boolean;
}

const History: React.FC<Props> = ({ tournaments, onDeleteTournament, isAdmin }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl">
        <Calendar size={48} className="mx-auto text-zinc-700 mb-2" />
        <p className="text-zinc-500 text-sm">No historical logs found.</p>
      </div>
    );
  }

  const sortedTournaments = [...tournaments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getMatchBadge = (m: Match) => {
    const diff = Math.abs(m.scoreA - m.scoreB);
    if (diff >= 10) return <span className="flex items-center gap-1 text-[7px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-black uppercase"><Zap size={8} /> Dominant</span>;
    if (diff <= 2) return <span className="flex items-center gap-1 text-[7px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-black uppercase"><Zap size={8} /> Clutch</span>;
    return null;
  };

  const shareTournament = (t: Tournament) => {
    const finalMatch = t.matches.find(m => m.phase === 'finals' && m.isCompleted);
    const championId = finalMatch ? (finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamAId : finalMatch.teamBId) : null;
    const champion = championId ? t.teams.find(tm => tm.id === championId) : null;

    let text = `🏸 *${t.name}* - SESSION REPORT\n`;
    text += `📅 ${new Date(t.date).toLocaleDateString()}\n\n`;
    if (champion) {
      text += `🏆 *CHAMPIONS:* ${champion.player1.name} & ${champion.player2.name}\n`;
    }
    text += `\n*Final Standings:*\n`;

    // Simplistic standings for the share text
    const teamWins: Record<string, number> = {};
    t.teams.forEach(tm => teamWins[tm.id] = 0);
    t.matches.filter(m => m.isCompleted).forEach(m => {
      const winnerId = m.scoreA > m.scoreB ? m.teamAId : m.teamBId;
      teamWins[winnerId]++;
    });

    const sortedTeams = [...t.teams].sort((a, b) => teamWins[b.id] - teamWins[a.id]);
    sortedTeams.forEach((team, i) => {
      text += `${i + 1}. ${team.player1.name}/${team.player2.name} (${teamWins[team.id]}W)\n`;
    });

    text += `\nTracked via *8:30 Shuttlers*`;

    if (navigator.share) {
      navigator.share({ title: t.name, text }).catch(() => {
        navigator.clipboard.writeText(text);
        alert('Report copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(text);
      alert('Report copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
          <Award size={22} className="text-green-500" /> Tournament History
        </h2>
      </div>

      <div className="space-y-3">
        {sortedTournaments.map(t => {
          const finalMatch = t.matches.find(m => m.phase === 'finals' && m.isCompleted);
          const championId = finalMatch ? (finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamAId : finalMatch.teamBId) : null;
          const champion = championId ? t.teams.find(tm => tm.id === championId) : null;

          return (
            <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl group">
              <div className="flex">
                <button
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  className="flex-1 text-left p-6 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="space-y-1">
                    <h3 className="font-black text-white text-base uppercase tracking-tight group-hover:text-green-500 transition-colors">{t.name}</h3>
                    <p className="text-[10px] text-zinc-600 font-bold flex items-center gap-1 uppercase tracking-widest">
                      <Calendar size={10} /> {new Date(t.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-[8px] text-green-500 uppercase font-black tracking-widest">Champions</p>
                      <p className="text-xs font-black text-white truncate max-w-[100px] uppercase">
                        {champion ? `${champion.player1.name} & ${champion.player2.name}` : 'N/A'}
                      </p>
                    </div>
                    {expandedId === t.id ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
                  </div>
                </button>
                <button
                  onClick={() => shareTournament(t)}
                  className="px-6 border-l border-zinc-800 bg-zinc-950/30 hover:bg-green-500 hover:text-zinc-950 text-zinc-500 transition-all"
                  title="Share Results"
                >
                  <Share2 size={18} />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => onDeleteTournament?.(t.id)}
                    className="px-6 border-l border-zinc-800 bg-zinc-950/30 hover:bg-red-500 hover:text-white text-red-500 transition-all"
                    title="Delete Tournament"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {expandedId === t.id && (
                <div className="bg-zinc-950/80 p-6 border-t border-zinc-800 space-y-6 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-6">
                    {/* Final Standings Table */}
                    <div className="space-y-3">
                      <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] border-b border-zinc-900 pb-1">Final Standings</h4>
                      <div className="bg-zinc-900/50 border border-zinc-900 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-[10px]">
                          <thead className="bg-zinc-950/50 border-b border-zinc-900">
                            <tr>
                              <th className="p-3 text-zinc-600 font-black uppercase">Team</th>
                              <th className="p-3 text-zinc-600 font-black uppercase text-center">P</th>
                              <th className="p-3 text-green-500/80 font-black uppercase text-center">W</th>
                              <th className="p-3 text-red-500/80 font-black uppercase text-center">L</th>
                              <th className="p-3 text-zinc-400 font-black uppercase text-right">PD</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const stats: Record<string, { won: number; lost: number; pd: number; played: number; name: string }> = {};
                              t.teams.forEach(tm => stats[tm.id] = { won: 0, lost: 0, pd: 0, played: 0, name: `${tm.player1.name}/${tm.player2.name}` });
                              t.matches.filter(m => m.isCompleted).forEach(m => {
                                stats[m.teamAId].played++; stats[m.teamBId].played++;
                                stats[m.teamAId].pd += (m.scoreA - m.scoreB);
                                stats[m.teamBId].pd += (m.scoreB - m.scoreA);
                                if (m.scoreA > m.scoreB) { stats[m.teamAId].won++; stats[m.teamBId].lost++; }
                                else { stats[m.teamBId].won++; stats[m.teamAId].lost++; }
                              });
                              return Object.values(stats)
                                .sort((a, b) => b.won !== a.won ? b.won - a.won : b.pd - a.pd)
                                .map((s, i) => (
                                  <tr key={i} className="border-b border-zinc-900/50 last:border-0 hover:bg-zinc-900/50 transition-colors">
                                    <td className="p-3 font-black text-white uppercase tracking-tight">{s.name}</td>
                                    <td className="p-3 text-zinc-500 font-bold text-center">{s.played}</td>
                                    <td className="p-3 text-green-500 font-black text-center">{s.won}</td>
                                    <td className="p-3 text-red-500/60 font-bold text-center">{s.lost}</td>
                                    <td className="p-3 text-zinc-400 font-black text-right">{s.pd > 0 ? `+${s.pd}` : s.pd}</td>
                                  </tr>
                                ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {['finals', 'semi-finals', 'round-robin'].map(phase => {
                      const phaseMatches = t.matches.filter(m => m.phase === phase);
                      if (phaseMatches.length === 0) return null;
                      return (
                        <div key={phase} className="space-y-3">
                          <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] border-b border-zinc-900 pb-1">{phase.replace('-', ' ')}</h4>
                          <div className="space-y-2">
                            {phaseMatches.map(m => {
                              const teamA = t.teams.find(tm => tm.id === m.teamAId);
                              const teamB = t.teams.find(tm => tm.id === m.teamBId);
                              return (
                                <div key={m.id} className="bg-zinc-900/50 p-3 rounded-2xl flex items-center justify-between">
                                  <div className="flex-1">
                                    <span className={`text-[10px] font-black uppercase ${m.scoreA > m.scoreB ? 'text-white' : 'text-zinc-600'}`}>
                                      {teamA?.player1.name} / {teamA?.player2.name}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-center px-4">
                                    <div className="flex items-center gap-2 font-black text-sm">
                                      <span className={m.scoreA > m.scoreB ? 'text-green-500' : 'text-zinc-400'}>{m.scoreA}</span>
                                      <span className="text-zinc-800">-</span>
                                      <span className={m.scoreB > m.scoreA ? 'text-green-500' : 'text-zinc-400'}>{m.scoreB}</span>
                                    </div>
                                    {getMatchBadge(m)}
                                  </div>
                                  <div className="flex-1 text-right">
                                    <span className={`text-[10px] font-black uppercase ${m.scoreB > m.scoreA ? 'text-white' : 'text-zinc-600'}`}>
                                      {teamB?.player1.name} / {teamB?.player2.name}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

      </div>


    </div>
  );
};

export default History;
