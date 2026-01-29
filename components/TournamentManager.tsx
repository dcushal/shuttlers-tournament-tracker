
import React, { useState, useMemo } from 'react';
import { Player, Tournament, Team, Match, TeamStats } from '../types';
import { Trophy, Plus, CheckCircle2, ChevronRight, Hash, Users, Play, Sparkles, Share2, Wand2 } from 'lucide-react';

interface Props {
  players: Player[];
  checkedInIds: string[];
  tournaments: Tournament[];
  activeTournament?: Tournament;
  onCreate: (t: Tournament) => void;
  onUpdate: (t: Tournament) => void;
  onComplete: (id: string) => void;
}

const SimpleGoldTrophy: React.FC<{ className?: string }> = ({ className = "w-64 h-80" }) => (
  <svg viewBox="0 0 100 120" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="50%" stopColor="#EAB308" />
        <stop offset="100%" stopColor="#A16207" />
      </linearGradient>
    </defs>
    <rect x="25" y="105" width="50" height="8" rx="2" fill="#854d0e" />
    <rect x="30" y="97" width="40" height="8" rx="2" fill="#a16207" />
    <rect x="45" y="80" width="10" height="17" fill="url(#goldGrad)" />
    <path d="M20 20 C20 20 20 80 50 80 C80 80 80 20 80 20 Z" fill="url(#goldGrad)" stroke="#854d0e" strokeWidth="1" />
    <path d="M20 30 Q5 30 5 50 Q5 70 20 70" fill="none" stroke="url(#goldGrad)" strokeWidth="4" strokeLinecap="round" />
    <path d="M80 30 Q95 30 95 50 Q95 70 80 70" fill="none" stroke="url(#goldGrad)" strokeWidth="4" strokeLinecap="round" />
    <path d="M50 35 L54 44 L64 44 L56 50 L59 60 L50 54 L41 60 L44 50 L36 44 L46 44 Z" fill="white" opacity="0.4" />
  </svg>
);

const TournamentManager: React.FC<Props> = ({ players, checkedInIds, tournaments, activeTournament, onCreate, onUpdate, onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [pointLimit, setPointLimit] = useState<11 | 15 | 21>(21);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [p1Id, setP1Id] = useState('');
  const [p2Id, setP2Id] = useState('');
  const [showGlory, setShowGlory] = useState(false);

  const standings = useMemo(() => {
    if (!activeTournament) return [];
    const stats: Record<string, TeamStats> = {};
    activeTournament.teams.forEach(team => {
      stats[team.id] = {
        teamId: team.id, teamName: `${team.player1.name} / ${team.player2.name}`,
        played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0
      };
    });
    activeTournament.matches.filter(m => m.phase === 'round-robin' && m.isCompleted).forEach(match => {
      const teamA = stats[match.teamAId];
      const teamB = stats[match.teamBId];
      if (!teamA || !teamB) return;
      teamA.played++; teamB.played++;
      teamA.pointsFor += match.scoreA; teamA.pointsAgainst += match.scoreB;
      teamB.pointsFor += match.scoreB; teamB.pointsAgainst += match.scoreA;
      teamA.pointDiff = teamA.pointsFor - teamA.pointsAgainst;
      teamB.pointDiff = teamB.pointsFor - teamB.pointsAgainst;
      if (match.scoreA > match.scoreB) { teamA.won++; teamB.lost++; } 
      else { teamB.won++; teamA.lost++; }
    });
    return Object.values(stats).sort((a, b) => b.won !== a.won ? b.won - a.won : b.pointDiff - a.pointDiff);
  }, [activeTournament]);

  const addTeam = () => {
    if (!p1Id || !p2Id || p1Id === p2Id) return;
    const player1 = players.find(p => p.id === p1Id)!;
    const player2 = players.find(p => p.id === p2Id)!;
    setSelectedTeams(prev => [...prev, { id: crypto.randomUUID(), player1, player2 }]);
    setP1Id(''); setP2Id('');
  };

  const magicShuffle = () => {
    if (checkedInIds.length < 4) {
      alert("Need at least 4 checked-in players to shuffle.");
      return;
    }
    
    // Simple randomized shuffle
    const shuffled = [...checkedInIds].sort(() => Math.random() - 0.5);
    const newTeams: Team[] = [];
    
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      const p1 = players.find(p => p.id === shuffled[i])!;
      const p2 = players.find(p => p.id === shuffled[i+1])!;
      newTeams.push({ id: crypto.randomUUID(), player1: p1, player2: p2 });
    }
    
    setSelectedTeams(newTeams);
  };

  const startTournament = () => {
    if (selectedTeams.length < 2) return;
    const matches: Match[] = [];
    for (let i = 0; i < selectedTeams.length; i++) {
      for (let j = i + 1; j < selectedTeams.length; j++) {
        matches.push({
          id: crypto.randomUUID(), teamAId: selectedTeams[i].id, teamBId: selectedTeams[j].id,
          scoreA: 0, scoreB: 0, isCompleted: false, phase: 'round-robin'
        });
      }
    }
    onCreate({
      id: crypto.randomUUID(), name: name || `Session ${new Date().toLocaleDateString()}`,
      date: new Date().toISOString(), pointLimit, teams: selectedTeams, matches,
      currentPhase: 'round-robin', status: 'active'
    });
    setStep(1); setName(''); setSelectedTeams([]);
  };

  const updateScore = (matchId: string, teamAVal: number, teamBVal: number) => {
    if (!activeTournament) return;
    const updatedMatches = activeTournament.matches.map(m => 
      m.id === matchId ? { ...m, scoreA: teamAVal, scoreB: teamBVal, isCompleted: true } : m
    );
    const tournament = { ...activeTournament, matches: updatedMatches };
    const match = updatedMatches.find(m => m.id === matchId)!;
    if (match.phase === 'finals' && match.isCompleted) {
      setShowGlory(true);
    }
    onUpdate(tournament);
  };

  const advanceToFinals = () => {
    if (!activeTournament) return;
    const topTeams = standings.slice(0, 2);
    const finalMatch: Match = {
      id: crypto.randomUUID(), teamAId: topTeams[0].teamId, teamBId: topTeams[1].teamId,
      scoreA: 0, scoreB: 0, isCompleted: false, phase: 'finals'
    };
    onUpdate({
      ...activeTournament,
      currentPhase: 'finals',
      matches: [...activeTournament.matches, finalMatch]
    });
  };

  const shareReport = () => {
    if (!activeTournament || !champion) return;
    let text = `🏸 *${activeTournament.name}* SESSION OVER\n\n`;
    text += `🏆 *CHAMPIONS:* ${champion.player1.name} & ${champion.player2.name}\n\n`;
    text += `*Final Standings:*\n`;
    standings.forEach((s, i) => {
      text += `${i + 1}. ${s.teamName} (${s.won} Wins)\n`;
    });
    text += `\nTracked via *8:30 Shuttlers*`;
    
    if (navigator.share) {
      navigator.share({ title: activeTournament.name, text }).catch(() => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  };

  const champion = useMemo(() => {
    if (!activeTournament) return null;
    const finalMatch = activeTournament.matches.find(m => m.phase === 'finals' && m.isCompleted);
    if (!finalMatch) return null;
    const winnerId = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamAId : finalMatch.teamBId;
    return activeTournament.teams.find(t => t.id === winnerId);
  }, [activeTournament]);

  if (showGlory && champion) {
    return (
      <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 blur-[150px] rounded-full"></div>
        </div>
        <div className="relative z-10 space-y-8 animate-in fade-in zoom-in duration-1000 w-full flex flex-col items-center">
          <div className="flex justify-center drop-shadow-[0_0_30px_rgba(234,179,8,0.4)]">
            <SimpleGoldTrophy className="w-64 h-80" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter drop-shadow-lg">Champion Decided</h1>
            <p className="text-green-500 font-black uppercase tracking-[0.4em] text-xs">Immortal Glory Attained</p>
          </div>
          <div className="bg-zinc-900/80 backdrop-blur-2xl border border-green-500/30 p-8 rounded-3xl space-y-4 shadow-2xl max-w-sm w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,1)]"></div>
            <h2 className="text-3xl font-black text-white leading-tight uppercase tracking-tighter">
              {champion.player1.name}<br/>
              <span className="text-green-500 text-xl font-black">&</span><br/>
              {champion.player2.name}
            </h2>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button 
              onClick={shareReport}
              className="w-full bg-green-500 text-zinc-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-400 active:scale-95 transition-all shadow-xl shadow-green-500/20"
            >
              Share Report <Share2 size={18} />
            </button>
            <button 
              onClick={() => {
                setShowGlory(false);
                onComplete(activeTournament!.id);
              }}
              className="w-full bg-white text-zinc-950 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95"
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeTournament) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
            <Play size={24} className="text-green-500 fill-current" /> Initialize
          </h2>
        </div>

        {step === 1 ? (
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-6 shadow-xl">
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1">Tournament Title</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Night Clash #42" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-bold tracking-wide transition-all" />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1">Winning Cap</label>
                <div className="flex gap-3">
                  {[11, 15, 21].map(p => (
                    <button key={p} onClick={() => setPointLimit(p as any)} className={`flex-1 py-4 rounded-2xl border font-black transition-all text-sm uppercase ${pointLimit === p ? 'bg-green-500 border-green-500 text-zinc-950 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-green-500 text-zinc-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-400 active:scale-95 transition-all shadow-xl shadow-green-500/10 group">Continue to Roster <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Manual Setup</span>
                <button 
                  onClick={magicShuffle}
                  className="flex items-center gap-2 text-[10px] font-black text-green-500 uppercase bg-green-500/10 px-3 py-1.5 rounded-full hover:bg-green-500/20 transition-all active:scale-95"
                >
                  <Wand2 size={12} /> Magic Shuffle
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">Player 1</label>
                  <select value={p1Id} onChange={(e) => setP1Id(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white font-bold text-xs rounded-xl p-4 focus:outline-none focus:border-green-500">
                    <option value="">Select...</option>
                    {players.filter(p => p.id !== p2Id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">Player 2</label>
                  <select value={p2Id} onChange={(e) => setP2Id(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white font-bold text-xs rounded-xl p-4 focus:outline-none focus:border-green-500">
                    <option value="">Select...</option>
                    {players.filter(p => p.id !== p1Id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={addTeam} disabled={!p1Id || !p2Id} className="w-full bg-zinc-800 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-20 hover:bg-zinc-750 transition-colors active:scale-95"><Plus size={16} /> Register Team</button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Live Teams ({selectedTeams.length})</h4>
              </div>
              {selectedTeams.map(team => (
                <div key={team.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-2xl group animate-in slide-in-from-left-2 duration-200">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500"><Users size={18} /></div>
                    <div>
                      <span className="text-sm font-black text-white uppercase tracking-tight">{team.player1.name} & {team.player2.name}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedTeams(prev => prev.filter(t => t.id !== team.id))} className="text-zinc-600 hover:text-red-500 transition-colors px-2">
                    <Hash size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={() => setStep(1)} className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-500 py-5 rounded-2xl font-black uppercase tracking-widest text-xs">Back</button>
              <button onClick={startTournament} disabled={selectedTeams.length < 2} className="flex-[2] bg-green-500 text-zinc-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-green-500/10">Start Matches</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentMatches = activeTournament.matches.filter(m => m.phase === activeTournament.currentPhase);
  const isPhaseCompleted = currentMatches.length > 0 && currentMatches.every(m => m.isCompleted);

  return (
    <div className="space-y-8 pb-10">
      <div className="bg-zinc-900 border border-green-500/20 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-4 flex gap-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] text-green-400 font-black tracking-widest uppercase">{activeTournament.currentPhase.replace('-', ' ')}</span>
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white leading-tight uppercase tracking-tighter">{activeTournament.name}</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Target: {activeTournament.pointLimit}</p>
        </div>
      </div>

      {activeTournament.currentPhase === 'round-robin' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">Table Standings</h3>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-[11px]">
              <thead className="border-b border-zinc-800 bg-zinc-950/50">
                <tr><th className="p-4 text-zinc-500 font-black uppercase tracking-widest">Team</th><th className="p-4 text-zinc-500 font-black uppercase tracking-widest">P</th><th className="p-4 text-green-500 font-black uppercase tracking-widest">W</th><th className="p-4 text-zinc-500 font-black uppercase tracking-widest text-right">Diff</th></tr>
              </thead>
              <tbody>
                {standings.map((stat, i) => (
                  <tr key={stat.teamId} className={`border-b border-zinc-800/50 group transition-colors ${i < 2 ? 'bg-green-500/[0.03]' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${i < 2 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)]' : 'bg-zinc-800'}`}></span>
                        <span className="font-black text-white uppercase tracking-tight group-hover:text-green-400 transition-colors">{stat.teamName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-400 font-bold">{stat.played}</td>
                    <td className="p-4 text-green-500 font-black">{stat.won}</td>
                    <td className="p-4 text-zinc-400 font-bold text-right">{stat.pointDiff > 0 ? `+${stat.pointDiff}` : stat.pointDiff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] px-2">Active Fixtures</h3>
        <div className="grid gap-4">
          {currentMatches.map(match => {
            const teamA = activeTournament.teams.find(t => t.id === match.teamAId)!;
            const teamB = activeTournament.teams.find(t => t.id === match.teamBId)!;
            return (
              <div key={match.id} className={`bg-zinc-900 border rounded-3xl p-6 transition-all shadow-xl ${match.isCompleted ? 'border-zinc-800/50 opacity-60' : 'border-green-500/30 ring-1 ring-green-500/10'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex-1">
                    <p className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-1.5">Home Pair</p>
                    <p className="text-xs font-black text-white uppercase tracking-tight leading-tight">{teamA.player1.name}<br/>{teamA.player2.name}</p>
                  </div>
                  <div className="px-6 flex flex-col items-center">
                    <span className="text-zinc-800 font-black text-lg transform rotate-[-12deg]">VS</span>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-1.5">Away Pair</p>
                    <p className="text-xs font-black text-white uppercase tracking-tight leading-tight">{teamB.player1.name}<br/>{teamB.player2.name}</p>
                  </div>
                </div>
                
                <div className="flex gap-5 items-center">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <input 
                      type="number" 
                      defaultValue={match.scoreA || ''} 
                      onBlur={(e) => { const val = parseInt(e.target.value); if (!isNaN(val)) updateScore(match.id, val, match.scoreB); }} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 text-center text-2xl font-black text-white focus:outline-none focus:border-green-500 transition-all placeholder:text-zinc-900" 
                      placeholder="0" 
                    />
                    <input 
                      type="number" 
                      defaultValue={match.scoreB || ''} 
                      onBlur={(e) => { const val = parseInt(e.target.value); if (!isNaN(val)) updateScore(match.id, match.scoreA, val); }} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 text-center text-2xl font-black text-white focus:outline-none focus:border-green-500 transition-all placeholder:text-zinc-900" 
                      placeholder="0" 
                    />
                  </div>
                  {match.isCompleted && (
                    <div className="bg-green-500/20 p-3 rounded-2xl text-green-500">
                      <CheckCircle2 size={28} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isPhaseCompleted && activeTournament.currentPhase === 'round-robin' && (
        <div className="pt-4">
          <button onClick={advanceToFinals} className="w-full bg-green-500 text-zinc-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl shadow-green-500/20 hover:scale-[1.02] active:scale-95 transition-all">Start Grand Final <Trophy size={18} /></button>
        </div>
      )}
    </div>
  );
};

export default TournamentManager;
