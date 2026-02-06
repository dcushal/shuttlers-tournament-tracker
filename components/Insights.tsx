
import React from 'react';
import { Tournament, HallOfFameEntry } from '../types';
import { Lightbulb, TrendingUp, Award, Zap, Handshake, Flame, Target, ShieldCheck, Activity, Search, Crown, Trophy } from 'lucide-react';
import History from './History';

interface Props {
  tournaments: Tournament[];
  hallOfFame: HallOfFameEntry[];
  onDeleteTournament: (id: string) => void;
  isAdmin: boolean;
}

const BADMINTON_TIPS = [
  "Always return to the 'T' after every shot to maintain court coverage.",
  "Keep your racket up and ready at all times, especially when at the net.",
  "Use your non-racket arm for balance and to track the shuttlecock.",
  "Vary your serves to keep your opponent guessing; mix short and long serves.",
  "Footwork is 70% of badminton; focus on small, quick steps.",
  "The smash is powerful, but a well-placed drop shot often wins the point.",
  "In doubles, communication is key. Call 'MINE' or 'YOURS' early.",
  "Bend your knees when defending smashes to lower your center of gravity.",
  "Watch the shuttlecock right until the moment it hits your strings.",
  "A high clear gives you time to recover when you are out of position."
];

const Insights: React.FC<Props> = ({ tournaments, hallOfFame, onDeleteTournament, isAdmin }) => {
  const stats = React.useMemo(() => {
    const playerStats: Record<string, { wins: number, total: number }> = {};
    const partnershipStats: Record<string, { wins: number, total: number, p1: string, p2: string, pointDiff: number }> = {};
    const rivalries: Record<string, number> = {};

    let totalMatches = 0;
    let highestScore = 0;

    tournaments.forEach(t => {
      t.matches.filter(m => m.isCompleted).forEach(m => {
        totalMatches++;
        const teamA = t.teams.find(tm => tm.id === m.teamAId);
        const teamB = t.teams.find(tm => tm.id === m.teamBId);

        if (!teamA || !teamB) return;

        const winnerId = m.scoreA > m.scoreB ? m.teamAId : m.teamBId;
        highestScore = Math.max(highestScore, m.scoreA, m.scoreB);

        // Individual Stats
        [teamA, teamB].forEach(team => {
          [team.player1.name, team.player2.name].forEach(name => {
            if (!playerStats[name]) playerStats[name] = { wins: 0, total: 0 };
            playerStats[name].total++;
            if (team.id === winnerId) {
              playerStats[name].wins++;
            }
          });

          // Partnership Stats
          const pairKey = [team.player1.name, team.player2.name].sort().join(' + ');
          if (!partnershipStats[pairKey]) {
            partnershipStats[pairKey] = { wins: 0, total: 0, p1: team.player1.name, p2: team.player2.name, pointDiff: 0 };
          }
          partnershipStats[pairKey].total++;
          if (team.id === winnerId) partnershipStats[pairKey].wins++;

          const isTeamA = team.id === m.teamAId;
          partnershipStats[pairKey].pointDiff += isTeamA ? (m.scoreA - m.scoreB) : (m.scoreB - m.scoreA);
        });

        // Rivalry Tracking
        const rivalryKey = [
          [teamA.player1.name, teamA.player2.name].sort().join(' & '),
          [teamB.player1.name, teamB.player2.name].sort().join(' & ')
        ].sort().join(' vs ');
        rivalries[rivalryKey] = (rivalries[rivalryKey] || 0) + 1;
      });
    });

    const playerWinRates = Object.values(playerStats).map(s => (s.wins / s.total) * 100);
    const avgPlayerWinRate = playerWinRates.length > 0 ? playerWinRates.reduce((a, b) => a + b, 0) / playerWinRates.length : 0;

    const topPlayers = Object.entries(playerStats)
      .map(([name, s]) => ({ name, winRate: (s.wins / s.total) * 100, wins: s.wins }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 3);


    const topPartnerships = Object.entries(partnershipStats)
      .map(([key, s]) => ({
        ...s,
        key,
        winRate: (s.wins / s.total) * 100,
        avgDiff: s.pointDiff / s.total
      }))
      .filter(p => p.total >= 1)
      .sort((a, b) => b.winRate !== a.winRate ? b.winRate - a.winRate : b.avgDiff - a.avgDiff)
      .slice(0, 5);

    const mainRivalry = Object.entries(rivalries)
      .sort((a, b) => b[1] - a[1])[0];

    return { totalMatches, highestScore, topPlayers, topPartnerships, mainRivalry, avgPlayerWinRate };
  }, [tournaments]);

  const hofLeaders = React.useMemo(() => {
    const winCounts: Record<string, number> = {};
    hallOfFame.forEach(entry => {
      // Split "Player 1 & Player 2" into individual names
      const players = entry.teamName.split(' & ');
      players.forEach(name => {
        const trimmed = name.trim();
        winCounts[trimmed] = (winCounts[trimmed] || 0) + 1;
      });
    });

    return Object.entries(winCounts)
      .map(([name, wins]) => ({ name, wins }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 3);
  }, [hallOfFame]);

  const dailyTip = React.useMemo(() => BADMINTON_TIPS[Math.floor(Math.random() * BADMINTON_TIPS.length)], []);

  return (
    <div className="space-y-8 pb-12">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">PRO <span className="text-green-500">INSIGHTS</span></h2>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">8:30 Shuttlers Analytics</p>
      </div>

      {/* Tip Box - Coach's Corner */}
      <div className="bg-zinc-900 border border-green-500/20 p-6 rounded-[2rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 text-green-500/10 -rotate-12 translate-x-4 -translate-y-4">
          <ShieldCheck size={100} />
        </div>
        <div className="relative z-10 flex gap-4 items-start">
          <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-zinc-950 shrink-0 shadow-lg shadow-green-500/20">
            <Zap size={24} fill="currentColor" />
          </div>
          <div className="space-y-1">
            <h3 className="text-green-500 font-black uppercase tracking-widest text-[10px]">Coach's Corner</h3>
            <p className="text-zinc-200 font-bold text-sm leading-snug uppercase tracking-tight">
              "{dailyTip}"
            </p>
          </div>
        </div>
      </div>

      {/* Hall of Fame Leaders - ADDED HERE */}
      <section className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-yellow-500/5">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Crown size={80} className="text-yellow-500" />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-yellow-500" />
            <h3 className="font-black uppercase tracking-[0.3em] text-[10px]">
              <span className="text-sweep">TOP DOG</span>
            </h3>
          </div>

          <div className="space-y-4">
            {hofLeaders.length > 0 ? (
              hofLeaders.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${i === 0 ? 'bg-yellow-500 text-zinc-950 shadow-lg shadow-yellow-500/20' :
                      i === 1 ? 'bg-zinc-300 text-zinc-950' :
                        'bg-orange-600/50 text-white'
                      }`}>
                      {i === 0 ? <Crown size={20} fill="currentColor" /> : i + 1}
                    </div>
                    <div>
                      <p className="text-white font-black uppercase tracking-tight text-lg">{p.name}</p>
                      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-[0.2em]">HOF Inductee</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-2xl font-black text-white">{p.wins}</span>
                      <Award size={16} className="text-yellow-500" />
                    </div>
                    <p className="text-[8px] text-yellow-500/60 font-black uppercase tracking-widest leading-none">Tournaments</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-zinc-700 text-[10px] font-black uppercase text-center py-4">No Hall of Fame records yet</p>
            )}
          </div>
        </div>
      </section>

      {/* Match History shifted below Top Dog */}
      <div className="border-t border-zinc-900 pt-8 mt-4">
        <History
          tournaments={tournaments}
          onDeleteTournament={onDeleteTournament}
          isAdmin={isAdmin}
        />
      </div>
      {/* Partnership Synergy Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Handshake size={16} className="text-green-500" /> Partnership Synergy
          </h3>
        </div>

        {stats.topPartnerships.length === 0 ? (
          <div className="py-12 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl text-center">
            <Handshake size={32} className="mx-auto text-zinc-800 mb-2" />
            <p className="text-zinc-600 text-[10px] font-black uppercase">Start sessions to track synergy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.topPartnerships.map((p, i) => (
              <div
                key={p.key}
                className={`group relative overflow-hidden rounded-[2rem] transition-all border ${i === 0
                  ? 'bg-zinc-900 border-green-500/40 p-8 ring-2 ring-green-500/10'
                  : 'bg-zinc-900/50 border-zinc-800 p-6 hover:bg-zinc-900 hover:border-zinc-700'
                  }`}
              >
                {i === 0 && (
                  <div className="absolute top-0 right-0 bg-green-500 text-zinc-950 px-4 py-1.5 rounded-bl-2xl text-[8px] font-black uppercase tracking-widest">
                    Gold Standard Duo
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                      <div className={`w-10 h-10 rounded-full border-2 border-zinc-900 flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-green-500 text-zinc-950' : 'bg-zinc-800 text-white'}`}>{p.p1[0]}</div>
                      <div className={`w-10 h-10 rounded-full border-2 border-zinc-900 flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-zinc-300 text-zinc-950' : 'bg-zinc-700 text-white'}`}>{p.p2[0]}</div>
                    </div>
                    <div>
                      <h4 className={`font-black uppercase tracking-tight ${i === 0 ? 'text-xl text-white' : 'text-sm text-zinc-200'}`}>
                        {p.p1} & {p.p2}
                      </h4>
                      <div className="flex gap-3">
                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">{p.total} SESSIONS</p>
                        <p className={`text-[8px] font-black uppercase tracking-widest ${p.avgDiff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {p.avgDiff > 0 ? '+' : ''}{p.avgDiff.toFixed(1)} AVG DIFF
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-black ${i === 0 ? 'text-green-500' : 'text-zinc-400'}`}>
                      {Math.round(p.winRate)}%
                    </span>
                    <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">SYNERGY</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-zinc-700'}`}
                      style={{ width: `${p.winRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Rivalry Radar */}
      {stats.mainRivalry && (
        <section className="bg-zinc-950 border border-red-500/20 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Flame size={80} className="text-red-500" />
          </div>
          <div className="space-y-6 relative z-10 text-center">
            <div className="flex items-center justify-center gap-2">
              <Target size={18} className="text-red-500" />
              <h3 className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Rivalry Watch</h3>
            </div>
            <div className="space-y-3">
              <p className="text-white font-black text-lg uppercase tracking-tighter leading-tight px-4">
                {stats.mainRivalry[0]}
              </p>
              <div className="inline-block px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-2xl">
                <p className="text-red-500 font-black text-xl leading-none">{stats.mainRivalry[1]}</p>
                <p className="text-[8px] text-red-400/60 font-black uppercase tracking-widest mt-1">Epic Clashes</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl space-y-1">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">GAMES TRACKED</p>
          <p className="text-3xl font-black text-white">{stats.totalMatches}</p>
          <p className="text-[8px] text-green-500 font-bold uppercase">Active History</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl space-y-1">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">PEAK SCORE</p>
          <p className="text-3xl font-black text-green-500">{stats.highestScore}</p>
          <p className="text-[8px] text-zinc-600 font-bold uppercase">Session Record</p>
        </div>
      </div>

      {/* Individual Win Rate Leaders */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-yellow-500" />
            <h3 className="font-black text-white text-xs uppercase tracking-widest">Top Performers</h3>
          </div>
          <span className="text-[8px] text-zinc-500 font-black uppercase">Win Rate %</span>
        </div>
        <div className="p-2 space-y-1">
          {stats.topPlayers.length === 0 ? (
            <div className="py-8 text-center text-zinc-700 font-black uppercase text-[10px]">Data pending...</div>
          ) : (
            stats.topPlayers.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between p-4 rounded-2xl hover:bg-zinc-800/40 transition-colors">
                <div className="flex items-center gap-4">
                  <span className={`text-xl font-black ${i === 0 ? 'text-yellow-500' : 'text-zinc-700'}`}>0{i + 1}</span>
                  <div>
                    <p className="text-white font-black uppercase tracking-tight text-sm">{p.name}</p>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase">{p.wins} WINS</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-500 font-black text-lg">{Math.round(p.winRate)}%</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col items-center text-center space-y-4 pt-4">
        <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-600">
          <Activity size={24} />
        </div>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] max-w-[240px] leading-relaxed">
          Consistent play with the same partner increases synergy by up to 25%.
        </p>
      </div>
    </div>
  );
};

export default Insights;
