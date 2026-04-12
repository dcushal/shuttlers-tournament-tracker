---
name: Shuttlers Tournament Tracker — Project Overview
description: Full project context for the 8:30 Shuttlers badminton club app — stack, scoring rules, player roster, key architecture decisions
type: project
originSessionId: fb586e74-9f80-4e1c-ba10-c43121129095
---
## What it is
React + TypeScript SPA (Vite) deployed on Vercel, backed by Supabase (PostgreSQL + Realtime). A badminton club tournament tracker for 8:30 Shuttlers — Mumbai-based club. Kushal is the admin.

**Why:** Track tournament rankings, player stats, casual matches, finances, hall of fame for a core group of ~16 members.

## Repo & Deploy
- Repo: dcushal/shuttlers-tournament-tracker (GitHub)
- Live: Vercel (auto-deploy on push to main)
- Supabase project: nlbkaepsgsrxcmfdtqah.supabase.co

## Tech Stack
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Supabase (PostgreSQL + Realtime subscriptions)
- Deployed: Vercel

## Key Files
- `src/App.tsx` — root, auth, mode selection, handleCompleteTournament, handleSyncRankings
- `src/hooks/useSupabase.ts` — all Supabase data hooks (usePlayers, useTournaments, etc.)
- `src/utils/rankingSystem.ts` — client-side ranking recalculation (only used at tournament completion)
- `src/components/Rankings.tsx` — rankings tab UI, admin Sync button
- `src/components/PlayersList.tsx` — player roster, add/delete players
- `src/components/Logo.tsx` — logo component (uses /public/logo.png with transparent bg)
- `recalculate_rankings.mjs` — Node.js server-side script to hard-reset rankings in Supabase
- `migrations/add_starting_points.sql` — adds starting_points column to players table (NOT YET RUN in Supabase)

## Scoring System (Versioned)
- **V1** (before 2026-02-06): Fixed 5-team table [10, 5, 0, -5, -10], no match win bonus
- **V2** (2026-02-06 to 2026-04-11): Same table + 2pts per match win
- **V3** (from 2026-04-12 "Shuttle Showdown"): Scaled table, top ceil(N/2) teams earn, no negatives
  - Formula: `round(N×2 × (numEarners + 1 - rank) / numEarners)`
  - + performance bonus: pointDiff/2 (if positive)
  - + match win bonus: wins × 2

## Ranking Architecture
- `BASELINE_DATE = 2026-04-12` — only tournaments on/after this date are replayed client-side
- Each player has `startingPoints` = their verified post-March-Slam baseline (stored in Supabase `starting_points` column — migration pending)
- `recalculate_rankings.mjs` is the authoritative tool for fixing Supabase data — run via `node recalculate_rankings.mjs`
- Sync button = force-pull from Supabase (NOT push local state)
- Supabase Realtime auto-propagates changes to all clients

## Post-March-Slam Baseline (verified, hardcoded in recalculate_rankings.mjs)
1. Viru: 117 → currently 121 (after Shuttle Showdown)
2. Saptarishi: 84 → 84
3. Aldrich: 80 → 104.5
4. Hritik: 80 → 98.5
5. Zaheer: 77.5 → 79.5
6. Dev: 75.5 → 110.5
7. Kushal: 65 → 67
8. Sam: 53.5 → 53.5
9. Sarvesh: 46.5 → 46.5
10. Sagar: 30 → 32
11. Dinesh: 27 → 62
12. Rohan: 18 → 22
13. Naveen: 10 → 34.5
14. Prashant: 10 → 10
15. Prasad: 10 → 28.5
16. Sanjay: 7 → 9

## Pending
- Run `migrations/add_starting_points.sql` in Supabase SQL editor to add `starting_points` column
- After migration: re-run `node recalculate_rankings.mjs` to write starting_points per player

## Logo
- File: `/public/logo.png` (transparent background PNG — user replaced the original logo.jpg)
- Component: `src/components/Logo.tsx` — simple img tag, no blend mode needed
