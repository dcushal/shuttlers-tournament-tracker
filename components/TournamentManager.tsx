import React, { useState, useMemo } from 'react';
import { Player, Tournament, Team, Match, TeamStats } from '../types';
import { Trophy, Plus, CheckCircle2, ChevronRight, Users, Play, RotateCcw, Swords, Zap, Clock, Share2 } from 'lucide-react';
import ScrollPicker from './ScrollPicker';

const TOURNAMENT_TITLES = [
  "Smash Fest Prime", "Birdie Blitz", "Court Kings", "Shuttle Showdown",
  "Net Ninjas", "Racket Rumble", "Drop Shot Dynasty", "The Golden Birdie",
  "Clear Dominance", "Midnight Mashers"
];

interface Props {
  players: Player[];
  checkedInIds: string[];
  tournaments: Tournament[];
  activeTournament?: Tournament;
  onCreate: (t: Tournament) => void;
  onUpdate: (t: Tournament) => void;
  onComplete: (id: string) => void;
  onEndSession: () => void;
  user: { role: 'admin' | 'member'; name: string };
}

const TournamentManager: React.FC<Props> = ({ players, checkedInIds, tournaments, activeTournament, onCreate, onUpdate, onComplete, onEndSession, user }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [pointLimit, setPointLimit] = useState<11 | 15 | 21>(21);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [p1Id, setP1Id] = useState('');
  const [p2Id, setP2Id] = useState('');
  const [showGlory, setShowGlory] = useState(false);
  const [nudge, setNudge] = useState<{ matchId: string; message: string } | null>(null);

  // --- Hooks must be at the top level ---

  const unavailableIds = useMemo(() => {
    return selectedTeams.flatMap(t => [t.player1.id, t.player2.id]);
  }, [selectedTeams]);

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

  const champion = useMemo(() => {
    if (!activeTournament) return null;
    const finalMatch = activeTournament.matches.find(m => m.phase === 'finals' && m.isCompleted);
    if (!finalMatch) return null;
    const winnerId = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamAId : finalMatch.teamBId;
    return activeTournament.teams.find(t => t.id === winnerId);
  }, [activeTournament]);

  const currentMatches = useMemo(() => {
    if (!activeTournament) return [];
    return activeTournament.matches
      .filter(m => m.phase === activeTournament.currentPhase)
      .sort((a, b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1));
  }, [activeTournament]);

  const isPhaseCompleted = useMemo(() => {
    return currentMatches.length > 0 && currentMatches.every(m => m.isCompleted);
  }, [currentMatches]);

  // --- End Hooks ---

  const addTeam = () => {
    if (!p1Id || !p2Id || p1Id === p2Id) return;
    const player1 = players.find(p => p.id === p1Id)!;
    const player2 = players.find(p => p.id === p2Id)!;
    setSelectedTeams(prev => [...prev, { id: crypto.randomUUID(), player1, player2 }]);
    setP1Id(''); setP2Id('');
  };

  const rankPairing = () => {
    if (checkedInIds.length < 4) {
      alert("Need at least 4 checked-in players to pair.");
      return;
    }
    const checkedInPlayers = players
      .filter(p => checkedInIds.includes(p.id))
      .sort((a, b) => a.rank - b.rank);
    const newTeams: Team[] = [];
    const len = checkedInPlayers.length;
    for (let i = 0; i < Math.floor(len / 2); i++) {
      const p1 = checkedInPlayers[i];
      const p2 = checkedInPlayers[len - 1 - i];
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
      id: crypto.randomUUID(),
      name: name || TOURNAMENT_TITLES[Math.floor(Math.random() * TOURNAMENT_TITLES.length)],
      date: new Date().toISOString(), pointLimit, teams: selectedTeams,
      matches: matches.sort(() => Math.random() - 0.5),
      currentPhase: 'round-robin', status: 'active'
    });
    setStep(1); setName(''); setSelectedTeams([]);
  };

  const autoFillScores = () => {
    if (!activeTournament || user.role !== 'admin') return;
    const updatedMatches = activeTournament.matches.map(m => {
      if (m.isCompleted || m.phase !== 'round-robin') return m;
      const scores = [activeTournament.pointLimit, Math.floor(Math.random() * (activeTournament.pointLimit - 2))];
      const [sA, sB] = Math.random() > 0.5 ? scores : [scores[1], scores[0]];
      return { ...m, scoreA: sA, scoreB: sB, isCompleted: true };
    });
    onUpdate({ ...activeTournament, matches: updatedMatches });
  };

  const handleScoreChange = (matchId: string, teamAVal: number, teamBVal: number) => {
    if (!activeTournament) return;
    const updatedMatches = activeTournament.matches.map(m =>
      m.id === matchId ? { ...m, scoreA: teamAVal, scoreB: teamBVal } : m
    );
    onUpdate({ ...activeTournament, matches: updatedMatches });
  };

  const confirmScore = (matchId: string) => {
    if (!activeTournament) return;
    const match = activeTournament.matches.find(m => m.id === matchId);
    if (!match) return;
    const teamAVal = match.scoreA;
    const teamBVal = match.scoreB;
    const limit = activeTournament.pointLimit;
    const winnerScore = Math.max(teamAVal, teamBVal);
    const loserScore = Math.min(teamAVal, teamBVal);
    let error = '';
    if (teamAVal === teamBVal && (teamAVal > 0 || teamBVal > 0)) {
      error = "DRAWS NOT ALLOWED";
    } else if (winnerScore < limit) {
      error = `SCORE NOT REACHED ${limit}`;
    } else if (winnerScore > limit) {
      const diff = winnerScore - loserScore;
      if (winnerScore < 30 && diff !== 2) error = "MUST WIN BY 2 (DEUCE)";
      else if (winnerScore === 30 && diff > 2) error = "INVALID 30-POINT SCORE";
    }
    if (error) {
      setNudge({ matchId, message: error });
      setTimeout(() => setNudge(null), 3000);
      return;
    }
    const updatedMatches = activeTournament.matches.map(m =>
      m.id === matchId ? { ...m, isCompleted: true } : m
    );
    onUpdate({ ...activeTournament, matches: updatedMatches });
  };

  const renderMatchCard = (match: Match) => {
    const teamA = activeTournament!.teams.find(t => t.id === match.teamAId)!;
    const teamB = activeTournament!.teams.find(t => t.id === match.teamBId)!;
    const isNudge = nudge?.matchId === match.id;

    return (
      <div key={match.id} className={`bg-zinc-900 border rounded-3xl p-6 transition-all shadow-xl shadow-black/40 ${match.isCompleted ? 'border-zinc-800/50 opacity-60' : 'border-green-500/30 ring-1 ring-green-500/10'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <p className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-1.5">Home Pair</p>
            <p className="text-xs font-black text-white uppercase tracking-tight leading-tight">
              <span className="text-green-500 text-lg block mb-1">{teamA.player1.name}</span>
              {teamA.player2.name}
            </p>
          </div>
          <div className="px-6 flex flex-col items-center">
            <span className="text-red-600 font-black text-2xl transform rotate-[-12deg] skew-x-12">VS</span>
          </div>
          <div className="flex-1 text-right">
            <p className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-1.5">Away Pair</p>
            <p className="text-xs font-black text-white uppercase tracking-tight leading-tight">
              <span className="text-green-500 text-lg block mb-1">{teamB.player1.name}</span>
              {teamB.player2.name}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex gap-5 items-center">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <ScrollPicker
                value={match.scoreA || 0}
                max={30}
                onChange={(val) => handleScoreChange(match.id, val, match.scoreB)}
                disabled={match.isCompleted || user.role !== 'admin'}
              />
              <ScrollPicker
                value={match.scoreB || 0}
                max={30}
                onChange={(val) => handleScoreChange(match.id, match.scoreA, val)}
                disabled={match.isCompleted || user.role !== 'admin'}
              />
            </div>
            {user.role === 'admin' && (
              !match.isCompleted ? (
                <button onClick={() => confirmScore(match.id)} className="p-4 bg-green-500 text-zinc-950 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-500/20 self-center">
                  <CheckCircle2 size={24} />
                </button>
              ) : (
                <button onClick={() => {
                  const updated = activeTournament!.matches.map(m => m.id === match.id ? { ...m, isCompleted: false } : m);
                  onUpdate({ ...activeTournament!, matches: updated });
                }} className="p-4 bg-zinc-800 text-zinc-400 rounded-2xl hover:bg-zinc-700 transition-all self-center">
                  <RotateCcw size={24} />
                </button>
              )
            )}
          </div>
          {isNudge && (
            <div className="text-center animate-bounce">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20">
                {nudge.message}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const advanceToFinals = () => {
    if (!activeTournament) return;
    const topTeams = standings.slice(0, 2);
    const finalMatch: Match = {
      id: crypto.randomUUID(), teamAId: topTeams[0].teamId, teamBId: topTeams[1].teamId,
      scoreA: 0, scoreB: 0, isCompleted: false, phase: 'finals'
    };
    onUpdate({ ...activeTournament, currentPhase: 'finals', matches: [...activeTournament.matches, finalMatch] });
  };

  const shareReport = () => {
    if (!activeTournament || !champion) return;
    let text = `🏸 *${activeTournament.name}* SESSION OVER\n\nChampion: ${champion.player1.name} & ${champion.player2.name}\n\nTracked via *8:30 Shuttlers*`;
    if (navigator.share) navigator.share({ title: activeTournament.name, text });
    else { navigator.clipboard.writeText(text); alert('Copied!'); }
  };

  if (showGlory && champion) {
    return (
      <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative z-10 space-y-6 w-full flex flex-col items-center">
          <Trophy size={80} className="text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Champion</h1>
            <p className="text-green-500 font-black uppercase tracking-[0.4em] text-[10px]">Glory attained</p>
          </div>
          <div className="bg-zinc-900 border border-green-500/30 p-8 rounded-3xl shadow-2xl w-full max-w-sm">
            <h2 className="text-2xl font-black text-white uppercase">{champion.player1.name} & {champion.player2.name}</h2>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button onClick={shareReport} className="w-full bg-green-500 text-zinc-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">Share Report <Share2 size={18} /></button>
            <button onClick={() => { setShowGlory(false); onComplete(activeTournament!.id); onEndSession(); }} className="w-full bg-white text-zinc-950 py-4 rounded-2xl font-black uppercase tracking-widest text-sm">End Session</button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeTournament) {
    return (
      <div className="space-y-6">
        {user.role === 'admin' ? (
          step === 1 ? (
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-6 shadow-xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1">Tournament Title</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Night Clash #42" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-bold transition-all" />
                </div>
                <div>
                  <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1">Winning Cap</label>
                  <div className="flex gap-3">
                    {[11, 15, 21].map(p => (
                      <button key={p} onClick={() => setPointLimit(p as any)} className={`flex-1 py-4 rounded-2xl border font-black transition-all text-sm uppercase ${pointLimit === p ? 'bg-green-500 border-green-500 text-zinc-950' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => setStep(2)} className="w-full bg-green-500 text-zinc-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">Continue to Roster <ChevronRight size={18} /></button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4 shadow-xl">
                <button onClick={rankPairing} className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-green-500 text-zinc-950 font-black uppercase tracking-widest text-xs hover:bg-green-400 transition-all shadow-lg"><Swords size={18} /> Rank-Based Pairings</button>
                <div className="grid grid-cols-2 gap-3">
                  <select value={p1Id} onChange={(e) => setP1Id(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white font-bold text-xs rounded-xl p-4"><option value="">P1...</option>{players.filter(p => !unavailableIds.includes(p.id) && p.id !== p2Id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                  <select value={p2Id} onChange={(e) => setP2Id(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white font-bold text-xs rounded-xl p-4"><option value="">P2...</option>{players.filter(p => !unavailableIds.includes(p.id) && p.id !== p1Id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </div>
                <button onClick={addTeam} disabled={!p1Id || !p2Id} className="w-full bg-zinc-800 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-20"><Plus size={16} /> Register Team</button>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4 shadow-xl">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Selected Teams ({selectedTeams.length})</h3>
                <div className="space-y-2">
                  {selectedTeams.map(team => (
                    <div key={team.id} className="flex items-center justify-between bg-zinc-950 p-4 rounded-xl border border-zinc-800 group"><span className="text-xs font-bold text-white uppercase">{team.player1.name} & {team.player2.name}</span><button onClick={() => setSelectedTeams(prev => prev.filter(t => t.id !== team.id))} className="text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Plus className="rotate-45" size={16} /></button></div>
                  ))}
                </div>
                <div className="pt-2">
                  <button onClick={startTournament} disabled={selectedTeams.length < 2} className="w-full bg-green-500 text-zinc-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-green-500/10 hover:bg-green-400">Launch Tournament <Play size={18} /></button>
                  <button onClick={() => setStep(1)} className="w-full bg-transparent text-zinc-600 py-3 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Back to Settings</button>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-[2.5rem] text-center space-y-6">
            <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto"><Clock size={32} className="text-zinc-500" /></div>
            <div className="space-y-2"><h3 className="text-xl font-black text-white uppercase tracking-tighter">Waiting for Host</h3><p className="text-zinc-500 text-xs font-medium leading-relaxed max-w-[200px] mx-auto">A tournament hasn't been started yet. Please wait for an Admin to initialize the session.</p></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="bg-zinc-900 border border-green-500/20 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-4 flex gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div><span className="text-[10px] text-green-400 font-black tracking-widest uppercase">{activeTournament.currentPhase.replace('-', ' ')}</span></div>
        <div className="space-y-1"><h2 className="text-2xl font-black text-white leading-tight uppercase tracking-tighter">{activeTournament.name}</h2><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Target: {activeTournament.pointLimit}</p></div>
      </div>
      <div className="space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-[11px]">
            <thead className="border-b border-zinc-800 bg-zinc-950/50"><tr><th className="p-4 text-zinc-500 font-black uppercase tracking-widest">Team</th><th className="p-4 text-zinc-500 font-black uppercase tracking-widest text-center">P</th><th className="p-4 text-green-500 font-black uppercase tracking-widest text-center">W</th><th className="p-4 text-red-500 font-black uppercase tracking-widest text-center">L</th><th className="p-4 text-zinc-500 font-black uppercase tracking-widest text-right">Diff</th></tr></thead>
            <tbody>{standings.map((stat, i) => (<tr key={stat.teamId} className={`border-b border-zinc-800/50 group transition-colors ${i < 2 ? 'bg-green-500/[0.03]' : ''}`}><td className="p-4"><div className="flex items-center gap-3"><span className={`w-2 h-2 rounded-full ${i < 2 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)]' : 'bg-zinc-800'}`}></span><span className="font-black text-white uppercase group-hover:text-green-400 transition-colors">{stat.teamName}</span></div></td><td className="p-4 text-zinc-400 font-bold text-center">{stat.played}</td><td className="p-4 text-green-500 font-black text-center">{stat.won}</td><td className="p-4 text-red-500/80 font-bold text-center">{stat.lost}</td><td className="p-4 text-zinc-400 font-bold text-right">{stat.pointDiff > 0 ? `+${stat.pointDiff}` : stat.pointDiff}</td></tr>))}</tbody>
          </table>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Fixtures</h3>
          {user.role === 'admin' && activeTournament.currentPhase === 'round-robin' && activeTournament.matches.some(m => !m.isCompleted) && (
            <button onClick={autoFillScores} className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-900/50 border border-zinc-800 px-3 py-1.5 rounded-full hover:text-green-500 hover:border-green-500/30 transition-all"><Zap size={12} className="fill-current" /> Auto-fill</button>
          )}
        </div>
        <div className="grid gap-4">{currentMatches.map(match => renderMatchCard(match))}</div>
      </div>
      {user.role === 'admin' && activeTournament.currentPhase === 'finals' && currentMatches[0].isCompleted && (
        <button onClick={() => setShowGlory(true)} className="w-full mt-4 bg-green-500 text-zinc-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:scale-[1.02] active:scale-95 transition-all"><Trophy size={20} /> Declare Champion</button>
      )}
      {user.role === 'admin' && isPhaseCompleted && activeTournament.currentPhase === 'round-robin' && (
        <div className="pt-4"><button onClick={advanceToFinals} className="w-full bg-green-500 text-zinc-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl shadow-green-500/20 hover:scale-[1.02] active:scale-95 transition-all">Start Grand Final <Trophy size={18} /></button></div>
      )}
    </div>
  );
};

export default TournamentManager;
