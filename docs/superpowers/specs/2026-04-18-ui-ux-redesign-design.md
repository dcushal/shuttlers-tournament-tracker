# Shuttlers UI/UX Redesign — Design Spec

## Goal
Elevate the Shuttlers Tournament Tracker to a premium fitness-app aesthetic (Strava/Whoop tier) with personalized dashboards, expandable player stat pills, and purposeful GSAP animations. Remove the Casual mode entirely.

## Architecture
Single-mode app (Tournament only). Dashboard becomes role-aware: members see a personal "Your Season" hero card first; admins see the operational club view. All screens share upgraded design tokens. GSAP handles entrances, counters, and micro-interactions.

## Tech Stack
React + TypeScript + Vite, Tailwind CSS, GSAP (gsap-core, gsap-react skills installed), Lucide React icons, Supabase backend.

---

## Section 1: Design System Upgrades

### New CSS tokens in `index.css`
- `.stat-hero` — oversized rank/points number. `font-size: 3.75rem`, `font-weight: 900`, `color: #9ee312`, `text-shadow: 0 0 24px rgba(158,227,18,0.35)`
- `.pill-expand` — base style for expandable roster cards. `border-radius: 2rem`, `overflow: hidden`, `transition: none` (GSAP handles motion)
- `.rank-delta-up` — rank improvement badge. Small green pill, `▲N` text, `background: rgba(158,227,18,0.15)`, `color: #9ee312`
- `.rank-delta-down` — rank drop badge. Small red pill, `▼N` text, `background: rgba(239,68,68,0.15)`, `color: #ef4444`

### Updated radius scale
- Roster pills (collapsed + expanded): `rounded-[2rem]`
- Dashboard hero card: `rounded-[2.5rem]`
- Existing `liquid-card` and `liquid-card-elevated` unchanged

### Spacing
- All screen top-level containers use `space-y-5` for consistent vertical rhythm

### What stays unchanged
Color palette, glassmorphism card styles, bottom nav structure, Lucide icon library, font stack.

---

## Section 2: Dashboard Redesign

### Member view (role === 'member')
**Hero Card** — `rounded-[2.5rem]`, `liquid-card-elevated`, full width. Contents:
- Top-left: label `YOUR RANK` — `text-[9px] font-black uppercase tracking-widest text-zinc-500`
- Large rank number: `#N` using `.stat-hero` class — counts up from 0 on mount via GSAP
- Below rank: horizontal 3-stat row — **Points · Win Rate · Matches Played** — each in a `text-[10px]` label + bold value
- Top-right: player avatar `w-16 h-16 rounded-[1.5rem]` (or initial fallback)
- Bottom strip: last tournament result — `"Last: 2nd place · Jan 18"` in `text-[10px] text-zinc-500`

**Club Feed** (below hero):
- Active tournament card (unchanged from current)
- Hall of Fame horizontal scroll strip (unchanged)
- Quick-navigate buttons → Ranks, Roster

### Admin view (role === 'admin')
No hero card. Shows current club feed directly:
- Active tournament card
- Hall of Fame strip
- Reset data / management actions
- Same as the current Dashboard, no changes

### Data source
Hero card reads from the `players` array — find the entry where `player.name.toLowerCase() === user.name.toLowerCase()`. Uses `playerPerformanceStats` (same logic as Rankings) for win rate and match count.

---

## Section 3: Rankings Redesign

### Top 3 Podium Strip
Horizontal row above the scrollable list. Shows #1 (center, slightly taller), #2 (left), #3 (right).
- Each: avatar or initial, name truncated, points below name
- `#1` uses `.stat-hero` for points; `#2` and `#3` use standard bold text
- Podium strip animates in first before the list (GSAP, see Section 5)

### Rank List Cards
- Radius: `rounded-[2rem]`
- **Rank delta badge**: replaced emoji with styled pill — `.rank-delta-up` or `.rank-delta-down` sitting inline next to player name
- **Win rate bar**: thin `h-1 rounded-full` progress bar below player name. Green fill proportional to win rate. Label `68% WIN` at end of bar in `text-[9px]`
- Points: right-aligned, large, unchanged
- Promotion zone divider: unchanged

### Personal highlight
Logged-in member's own card gets `border border-green-500/40 shadow-[0_0_20px_rgba(158,227,18,0.1)]` — immediately visible without scrolling.

### Unchanged
Sync button, Share button, Scoring Rules section at bottom.

---

## Section 4: Roster Redesign — Expandable Pills

### Collapsed state
Each player row is a pill — `rounded-[2rem]`, `liquid-card` background:
- Left: avatar `w-10 h-10 rounded-2xl` or initial
- Center: player name (bold) + current rank in `text-[10px] text-zinc-500`
- Right: chevron-down icon `text-zinc-600`, rotates 180° when expanded

### Expanded state
Pill grows downward (GSAP `maxHeight` spring) to reveal:
- 3-stat row: **Matches Played · Win Rate · Total Points**
- Mini rank history strip: `#5 → #4 → #3` — last 3 tournament positions, separated by `→` arrows in zinc-600
- **Own card only** (logged-in user): "Upload Photo" button at bottom — `Camera` icon, same green CTA style as ProfileModal. Tapping opens ProfileModal.

### Accordion behavior
Only one pill open at a time. Opening a new pill triggers GSAP collapse on the previously open one first.

### Admin extras
Small `Trash2` icon (zinc-600, hover red) on right side of each collapsed pill. Members do not see it.

---

## Section 5: GSAP Animation Plan

All animations wrapped in `if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)` check. Falls back to instant display.

### Tab transitions
`gsap.fromTo(contentRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' })` on each tab mount via `useGSAP`.

### Dashboard hero card entrance
On mount:
1. Card slides up: `gsap.fromTo(heroRef, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })`
2. Rank counter: `gsap.to(counterObj, { value: actualRank, duration: 0.8, ease: 'power3.out', onUpdate: () => setDisplayRank(Math.round(counterObj.value)) })`
3. Points counter: same pattern, duration 0.8s

### Rankings podium + list stagger
1. Podium strip: `gsap.fromTo(podiumRef, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })`
2. List cards: `gsap.fromTo('.rank-card', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: 'power2.out' })`
3. Delta badges: `gsap.fromTo('.rank-delta-up, .rank-delta-down', { scale: 0 }, { scale: 1, duration: 0.25, stagger: 0.03, ease: 'back.out(1.7)' })` — fires after list stagger completes

### Roster pill expand
Open: `gsap.to(pillBodyRef, { maxHeight: fullHeight, paddingTop: 16, paddingBottom: 16, duration: 0.4, ease: 'elastic.out(1, 0.5)' })`
Close: `gsap.to(pillBodyRef, { maxHeight: 0, paddingTop: 0, paddingBottom: 0, duration: 0.25, ease: 'power2.inOut' })`
Chevron: `gsap.to(chevronRef, { rotation: isOpen ? 180 : 0, duration: 0.25, ease: 'power2.inOut' })`

### Sync button
While syncing: `gsap.to(syncIconRef, { rotation: 360, duration: 1, repeat: -1, ease: 'none' })`
On complete: `gsap.killTweensOf(syncIconRef)` then snap back

### Nav micro-interactions
`onPointerDown`: `gsap.to(btnRef, { scale: 0.92, duration: 0.1 })`
`onPointerUp`: `gsap.to(btnRef, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.4)' })`

---

## Section 6: Casual Mode Removal

Remove from `App.tsx`:
- `casualTab` state and `setCasualTab`
- `renderCasualContent()` function
- Casual bottom nav JSX block
- All casual mode imports: `CasualHome`, `LogMatch`, `CasualStats`, `CasualLeaderboard`, `MatchHistory`
- `useCasualMatches` hook usage
- The `mode === 'casual'` render branch

Remove component files:
- `src/components/CasualHome.tsx`
- `src/components/CasualStats.tsx`
- `src/components/CasualLeaderboard.tsx`
- `src/components/MatchHistory.tsx`
- `src/components/LogMatch.tsx`
- `src/components/ScrollPicker.tsx` (used only by LogMatch)
- `src/components/AddGuestModal.tsx` (used only by LogMatch)

Remove `ModeSelector.tsx` entirely. With only one mode, it serves no purpose. `App.tsx` sets `mode` to `'tournament'` directly on login, skipping the selector screen.

---

## Files Modified
| File | Change |
|------|--------|
| `src/index.css` | Add `.stat-hero`, `.pill-expand`, `.rank-delta-up`, `.rank-delta-down` |
| `src/App.tsx` | Remove casual mode, simplify to tournament-only |
| `src/components/Dashboard.tsx` | Role-aware: member hero card + club feed / admin club feed only |
| `src/components/Rankings.tsx` | Podium strip, delta badges, win rate bar, personal highlight (scoring rules section unchanged) |
| `src/components/PlayersList.tsx` | Expandable pill accordion with GSAP, inline stats, own-card upload button |
| `src/components/Header.tsx` | Minor: remove casual-mode-specific logic if any |
| `src/components/ModeSelector.tsx` | Delete entirely — App.tsx sets tournament mode directly on login |

## Files Deleted
`CasualHome.tsx`, `CasualStats.tsx`, `CasualLeaderboard.tsx`, `MatchHistory.tsx`, `LogMatch.tsx`, `ScrollPicker.tsx`, `AddGuestModal.tsx`

## Files Unchanged
`TournamentManager.tsx`, `History.tsx`, `Insights.tsx`, `ProfileModal.tsx`, `Login.tsx`, `Logo.tsx`, `Rankings.tsx` scoring rules section, `useSupabase.ts`, `supabase.ts`
