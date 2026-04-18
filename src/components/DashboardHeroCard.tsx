import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Player, Tournament } from '../types';
import { computePlayerPerformanceStats } from '../utils/playerStats';

gsap.registerPlugin(useGSAP);

interface Props {
  player: Player;
  tournaments: Tournament[];
}

function getLastResult(player: Player, tournaments: Tournament[]): { place: string; date: string } | null {
  const completed = [...tournaments]
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const t of completed) {
    const playerTeam = t.teams.find(
      tm => tm.player1.id === player.id || tm.player2.id === player.id
    );
    if (!playerTeam) continue;

    const finalMatch = t.matches.find(m => m.phase === 'finals' && m.isCompleted);
    if (finalMatch) {
      const winnerId = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamAId : finalMatch.teamBId;
      if (playerTeam.id === winnerId) return { place: '1st', date: t.date };
      if (playerTeam.id === (winnerId === finalMatch.teamAId ? finalMatch.teamBId : finalMatch.teamAId)) {
        return { place: '2nd', date: t.date };
      }
    }

    const semis = t.matches.filter(m => m.phase === 'semi-finals' && m.isCompleted);
    for (const semi of semis) {
      const semiWinner = semi.scoreA > semi.scoreB ? semi.teamAId : semi.teamBId;
      const semiLoser = semiWinner === semi.teamAId ? semi.teamBId : semi.teamAId;
      if (playerTeam.id === semiLoser) return { place: '3rd', date: t.date };
    }

    return { place: 'Participated', date: t.date };
  }
  return null;
}

const DashboardHeroCard: React.FC<Props> = ({ player, tournaments }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const counter = useRef({ rank: 0, pts: 0 });
  const [displayRank, setDisplayRank] = useState(0);
  const [displayPts, setDisplayPts] = useState(0);
  const [avatarError, setAvatarError] = useState(false);

  const allPlayers = React.useMemo(() => [player], [player]);
  const stats = React.useMemo(
    () => computePlayerPerformanceStats(allPlayers, tournaments),
    [allPlayers, tournaments]
  );
  const perf = stats[player.id] ?? { wins: 0, matches: 0, totalDiff: 0 };
  const winRate = perf.matches > 0 ? Math.round((perf.wins / perf.matches) * 100) : 0;
  const lastResult = React.useMemo(() => getLastResult(player, tournaments), [player, tournaments]);

  useGSAP(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDisplayRank(player.rank);
      setDisplayPts(Math.round(player.points));
      return;
    }
    gsap.from(cardRef.current, { opacity: 0, y: 20, duration: 0.5, ease: 'power3.out' });
    counter.current.rank = 0;
    counter.current.pts = 0;
    gsap.to(counter.current, {
      rank: player.rank,
      pts: player.points,
      duration: 0.8,
      ease: 'power3.out',
      delay: 0.15,
      onUpdate() {
        setDisplayRank(Math.round(counter.current.rank));
        setDisplayPts(Math.round(counter.current.pts));
      },
    });
  }, { scope: cardRef, dependencies: [player.rank, player.points] });

  return (
    <div ref={cardRef} className="liquid-card-elevated rounded-[2.5rem] p-6 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-36 h-36 bg-green-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Your Rank</p>
          <div className="flex items-end gap-3">
            <span className="stat-hero">#{displayRank !== 0 ? displayRank : player.rank}</span>
          </div>
        </div>

        <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
          {player.avatarUrl && !avatarError ? (
            <img
              src={player.avatarUrl}
              alt={player.name}
              className="w-full h-full object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <span className="text-2xl font-black text-green-500">
              {player.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-4 mt-5 pt-4 border-t border-zinc-800/60">
        <div className="flex-1 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Points</p>
          <p className="text-xl font-black text-white">{displayPts !== 0 ? displayPts : Math.round(player.points)}</p>
        </div>
        <div className="w-px bg-zinc-800" />
        <div className="flex-1 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Win Rate</p>
          <p className="text-xl font-black text-white">{winRate}%</p>
        </div>
        <div className="w-px bg-zinc-800" />
        <div className="flex-1 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Matches</p>
          <p className="text-xl font-black text-white">{perf.matches}</p>
        </div>
      </div>

      {lastResult && (
        <p className="text-[10px] text-zinc-500 font-bold mt-3">
          Last:{' '}
          <span className="text-zinc-300">{lastResult.place}</span>
          {' '}·{' '}
          {new Date(lastResult.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>
      )}
    </div>
  );
};

export default DashboardHeroCard;
