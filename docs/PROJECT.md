# 8:30 Shuttlers Tournament Tracker

A badminton club management system for the "8:30 Shuttlers" group - tracking daily games from 20:30-22:30.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS (via CDN) |
| Backend/DB | Supabase (PostgreSQL) |
| Charts | Recharts |
| Animations | Canvas Confetti |
| Icons | Lucide React |

## Project Structure

```
shuttlers-tournament-tracker/
├── src/
│   ├── App.tsx              # Main application component
│   ├── index.tsx            # Entry point
│   ├── types.ts             # TypeScript interfaces
│   ├── components/         # React components
│   ├── hooks/               # React hooks (Supabase data management)
│   ├── lib/                 # Supabase client
│   └── utils/               # Ranking system logic
├── migrations/              # SQL schema migrations
├── public/                  # Static assets (PWA icons)
├── index.html               # HTML template
├── package.json             # Dependencies
├── vite.config.ts           # Vite configuration
└── tsconfig.json            # TypeScript config
```

## Features

### Tournament Mode
- Full bracket system with round-robin, semis, finals
- Customizable point limits (11, 15, or 21)
- Live score tracking with confetti celebration
- Automatic ranking recalculation

### Casual Mode
- Quick match logging
- Personal stats (win rate, streaks)
- Guest player support
- Leaderboard

### Core Features
- Player roster with check-in system
- ELO-style ranking with performance bonuses
- Treasury (expense tracking)
- Hall of Fame (champions)
- PWA support

## Known Issues

1. Duplicate `usePlayers` hook in `useSupabase.ts`
2. Ranking system has a reference bug (`persons` used before definition)

## Getting Started

```bash
npm install
npm run dev
```