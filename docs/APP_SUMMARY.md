# 8:30 Shuttlers — App Summary for Redesign

> This document captures all app logic, screens, flows, and data models for use in Google Stitch (or any redesign tool).

---

## What Is This App?

**8:30 Shuttlers** is a badminton club management PWA for a group called "8:30 Shuttlers" who play daily from 20:30–22:30 at Mini Stadium, Thane. It tracks:
- Structured tournaments with brackets and scoring
- Casual (non-tournament) match logging
- A global ranking system with points earned across tournaments
- Club expenses (shuttlecock splits) — Treasury module
- Hall of Fame — past tournament champions

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS (CDN) + custom CSS (`index.css`) |
| Backend / DB | Supabase (PostgreSQL) |
| Charts | Recharts |
| Confetti | canvas-confetti |
| Icons | Lucide React |
| Fonts | Inter |
| Deployment | Vercel |
| PWA | manifest.json + apple-touch-icon |

**Design language:** Dark background `#040d04`, accent color `#9ee312` (lime green), glassmorphism cards (`liquid-card`, `liquid-card-elevated`), all-caps uppercase labels, heavy black font weights, rounded-3xl/2xl corners.

---

## App Flow (User Journey)

```
Launch App
  └── Login Screen
        ├── Admin login (username: "admin", password: "098765")
        └── Member login (username: their name, password: "123456")
              └── Mode Selector
                    ├── Tournament Mode
                    └── (Casual Mode — partially hidden in current UI)
```

---

## Screens & Modules

### 1. Login Screen
- Logo (animated float)
- Username + Password fields
- Two roles:
  - **Admin** — full control (create tournaments, score entry, treasury, reset)
  - **Member** — read-only for most things; can view scores & personal stats
- Shared member password: `123456`
- Location shown: "mini stadium, Thane"

---

### 2. Mode Selector
- After login, user picks game mode
- **Tournament Mode** (main mode) — full bracket tracking
- **Casual Mode** — quick match logging (no brackets)
- Logout button shown here

---

## Tournament Mode

### Bottom Navigation (4 tabs):
| Tab | Icon | Content |
|-----|------|---------|
| Dash | LayoutDashboard | Dashboard overview |
| Roster | Users | Player list + check-in |
| Ranks | Crown | Global Rankings |
| Stats | Lightbulb | Insights & analytics |

Tournament management is accessed via Dashboard CTA.

---

### Tab: Dashboard
Shows:
- **Club header** with "8:30 Shuttlers" title and schedule ("20:30–22:30 DAILY")
- **Start Tournament / Resume Game** CTA button
- **Current MVP** card (highest ranked player) — tap triggers confetti + boom SFX
- **Top Dog** card (most Hall of Fame wins)
- **Live tournament banner** (if active) — shows name, phase, progress bar, "Update Scores" button
- **Hall of Fame** — list of past tournament-winning teams with dates; most recent has gold crown badge
- Admin-only: **Reset System Data** button (wipes all tournament history + recalculates rankings to base)

---

### Tab: Tournament Manager (accessed from Dashboard)

**When no tournament is active (Admin view):**

**Step 1 — Setup:**
- Tournament title (text input, or random from preset list like "Smash Fest Prime", "Birdie Blitz" etc.)
- Winning Cap (point limit): 11 / 15 / 21
- Optional date picker

**Step 2 — Team Roster:**
- **Rank-Based Pairings** button — auto-pairs players: Rank 1 with Last, Rank 2 with 2nd-last, etc.
- Manual team builder (P1 dropdown + P2 dropdown + "Register Team" button)
- Selected teams list with remove option
- "Launch Tournament" button (requires ≥ 2 teams)

**When no tournament is active (Member view):**
- Waiting screen — "Waiting for Host" message

---

**When tournament is active:**

**Round Robin Phase:**
- Standings table: Team | P (played) | W (wins) | L (losses) | Diff
- Top 2 teams highlighted in green (promotion zone)
- Match cards for each fixture showing:
  - Home Pair vs Away Pair names
  - Two ScrollPicker inputs (0–30 for each team score) — admin only
  - Confirm Score button (green checkmark) — admin only
  - Undo Score button (gray rotate) — admin only
  - Score validation with error nudge (bouncing red message):
    - No draws allowed
    - Winner must reach point limit
    - Deuce rule: must win by 2 (up to 29-29, then 30 wins)
- Admin-only: **Auto-fill scores** button (for testing/dev)

**Advancing to Finals:**
- When all round-robin matches complete → "Start Grand Final" button appears
- Top 2 teams from standings play finals match

**Finals Phase:**
- Single final match card
- After completion → "Declare Champion" button

**Champion Screen (full-screen overlay):**
- Trophy icon, "Champion" title
- Winning team names displayed
- Share Report button (native share or clipboard copy)
- End Session button — completes tournament, recalculates all rankings, adds to Hall of Fame

---

### Tab: Rankings (Global)

- Sorted player list by total points
- Each row shows:
  - Rank badge (Crown icon for #1, number for others)
  - Player name
  - Rank movement indicator (⬆️ / ⬇️ / ➖ with number of places moved)
  - Tier label: **CAPTAIN** (top half) or **CHALLENGER** (bottom half)
  - Win rate percentage
  - Total points
- "Promotion Zone" divider between top and bottom half
- **Scoring Logic explainer** at bottom:

#### Scoring System (V2, effective Feb 6, 2026)

Points are calculated cumulatively across all completed tournaments.

**Starting Points (baseline):**
| Player | Base |
|--------|------|
| Viru | 100 |
| Hritik | 90 |
| Aldrich | 80 |
| Kushal | 70 |
| Dev | 60 |
| Saptarishi | 50 |
| Sam | 40 |
| Sagar | 30 |
| Rohan | 20 |
| Sarvesh | 10 |

**Per Tournament — Points Awarded by Placement:**
| Placement | Points |
|-----------|--------|
| 1st | +10 |
| 2nd | +5 |
| 3rd | 0 |
| 4th | -5 |
| 5th | -10 |

**Match Win Bonus (V2 only):**
- Each match win in group stage = **+2 points**

**Performance Bonus:**
- Positive point differential ÷ 2 added to score
- Negative differential = 0 (no penalty from diff)

**Formula:**
```
Total Gain = Placement Points + (Point Diff / 2, if > 0) + (Wins × 2)
```

**Example:** 1st place (+10) + 3 match wins (+6) + +20 diff (+10) = **+26 points**

**Tiebreaker:** Win Rate % → Total Point Diff

**Rank movement** is calculated by comparing current standings vs standings without the most recent tournament.

---

### Tab: Players (Roster)

- List of all players with check-in toggles
- Check-in status synced to Supabase in real-time
- Checked-in players shown first / highlighted
- Admin can:
  - Add new player
  - Delete player
  - Toggle check-in for any player
- Members can only toggle their own check-in

---

### Tab: Insights

- Tournament history list
- Hall of Fame entries
- Admin can delete tournaments (triggers full ranking recalculation)

---

## Casual Mode

### Bottom Navigation (5 tabs):
| Tab | Icon | Color |
|-----|------|-------|
| Home | Activity | Green |
| Ranks | Trophy | Yellow |
| + (Log) | Plus | Floating green FAB |
| Stats | BarChart2 | Blue |
| Logs | History | Purple |

---

### Casual: Home Tab
- "My Performance" stats panel (current user):
  - Total matches played
  - Win rate %
  - Win streak (flame icon)
- Quick Log Match CTA button
- 4 menu tiles: Log Match / My Stats / Leaderboard / History

---

### Casual: Log Match
- Select 4 players (2 per team) from roster + guests
- Add Guest option (guests are added as type: 'guest', not ranked)
- Enter scores for both teams
- Winner auto-detected
- Logged by current user

---

### Casual: Leaderboard
- Rankings based on casual match win rate
- All players, sorted by performance

---

### Casual: Stats (My Stats)
- Per-player detailed performance stats
- Win/loss breakdown
- Chart visualizations (Recharts)

---

### Casual: Logs (Match History)
- Reverse-chronological list of all casual matches
- Shows: Team A vs Team B, scores, date, who logged it
- Admin/logger can delete entries

---

## Treasury Module

> Note: Treasury appears in the Dashboard nav in some views but is currently accessible as a sub-feature.

### Features:
- **Log Shuttle Box Purchase** (Admin only):
  - Select who bought the box
  - Enter total cost (₹)
  - System auto-splits equally across ALL players
  - Shows per-head cost calculation
  
- **Manual Payment Record** (Admin only):
  - Record a payment from a specific member

- **Member Ledger:**
  - Each player shows: "Owes ₹X" (red) / "Credit ₹X" (green) / "Settled"
  - Admin can mark a player as settled (triggers transaction)
  - Members only see their own balance

- **Transaction History** (Admin only):
  - Full log of all credits/debits with player name, description, date
  - Admin can delete individual transactions

---

## Data Models

### Player
```typescript
{
  id: string
  name: string
  points: number
  rank: number
  previousRank: number
  isCheckedIn?: boolean
  type?: 'member' | 'guest'
}
```

### Tournament
```typescript
{
  id: string
  name: string
  date: string (ISO)
  pointLimit: 11 | 15 | 21
  teams: Team[]
  matches: Match[]
  currentPhase: 'round-robin' | 'semi-finals' | 'finals' | 'completed'
  status: 'active' | 'completed'
}
```

### Team
```typescript
{
  id: string
  player1: Player
  player2: Player
}
```

### Match
```typescript
{
  id: string
  teamAId: string
  teamBId: string
  scoreA: number
  scoreB: number
  isCompleted: boolean
  phase: 'round-robin' | 'semi-finals' | 'finals'
}
```

### CasualMatch
```typescript
{
  id: string
  date: string
  teamA: { player1Id, player2Id, score }
  teamB: { player1Id, player2Id, score }
  winner: 'A' | 'B'
  loggedByUserId?: string
}
```

### Transaction
```typescript
{
  id: string
  playerId: string
  amount: number  // positive = owes, negative = credit
  description: string
  date: string
  type: 'expense' | 'payment'
}
```

### HallOfFameEntry
```typescript
{
  id: string
  teamName: string  // "Player1 & Player2"
  date: string
}
```

---

## Supabase Tables

| Table | Purpose |
|-------|---------|
| `players` | Player roster with points, rank, check-in status |
| `tournaments` | Tournament metadata |
| `teams` | Teams per tournament (join: player1_id, player2_id) |
| `matches` | Match results per tournament |
| `casual_matches` | Casual mode match logs |
| `transactions` | Treasury ledger entries |
| `hall_of_fame` | Past champions |

**Data sync strategy:**
- Supabase is source of truth for points and ranks
- `isCheckedIn` is local-first (session state, stored in localStorage)
- Full localStorage fallback if Supabase is unavailable

---

## Roster (Current Members)

10 core members in ranking order (starting baseline):
1. Viru
2. Hritik
3. Aldrich
4. Kushal
5. Dev
6. Saptarishi
7. Sam
8. Sagar
9. Rohan
10. Sarvesh

---

## Known Tournament Names (Preset Pool)
"Smash Fest Prime", "Birdie Blitz", "Court Kings", "Shuttle Showdown", "Net Ninjas", "Racket Rumble", "Drop Shot Dynasty", "The Golden Birdie", "Clear Dominance", "Midnight Mashers"

---

## Key UX Patterns

- **Admin vs Member role gates** — admins see edit controls, members see read-only
- **Score validation with nudge messages** — bouncing red error pill on invalid scores
- **Confetti + audio feedback** — on MVP card tap, on champion declaration
- **Rank movement arrows** — show change vs previous tournament
- **Live indicator** — pulsing green dot for active tournament
- **Progress bar** — shows % of matches completed in active tournament
- **FAB-style Log button** in casual mode — elevated center button in bottom nav
- **Glassmorphism cards** — frosted glass aesthetic throughout
- **PWA** — installable on iOS/Android, no URL bar, themed status bar

---

## App Color System

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#040d04` | Page background |
| Green accent | `#9ee312` | Primary CTA, highlights, rank #1 |
| Green hover | `#bef264` | Hover state |
| Card surface | `rgba(255,255,255,0.03–0.08)` | Glassmorphism cards |
| Card border | `rgba(255,255,255,0.05–0.1)` | Card outlines |
| Text primary | `#ffffff` | Names, scores |
| Text secondary | `#71717a` (zinc-500) | Labels, metadata |
| Error/loss | `#ef4444` (red-500) | Negative stats, errors |
| Yellow | `#eab308` | HOF, Top Dog, Trophies |
| Blue | `#3b82f6` | Stats accents |
| Purple | `#a855f7` | History tab |
