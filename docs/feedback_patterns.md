---
name: Feedback — How to work on this project
description: Patterns and corrections Kushal has given about how to approach this codebase
type: feedback
originSessionId: fb586e74-9f80-4e1c-ba10-c43121129095
---
## Supabase is source of truth, not localStorage
**Why:** Earlier bugs caused stale localStorage to overwrite correct Supabase values when Sync was pressed.
**How to apply:** Always fetch fresh from Supabase when in doubt. Never push local state to Supabase without verifying it's correct.

## Sync button = pull, not push
**Why:** The old push-local-state Sync was accumulating/corrupting points every press.
**How to apply:** `handleSyncRankings` calls `refreshPlayers()` to force-pull from Supabase.

## Recalculation is server-side, not client-side
**Why:** Client-side recalculation with wrong startingPoints was causing point corruption.
**How to apply:** Use `recalculate_rankings.mjs` (Node script) to fix Supabase data. Client-side `recalculatePlayerStats` only runs at tournament completion and only replays from BASELINE_DATE.

## When things look wrong in Supabase, query and verify first
**Why:** Script output showed "✓" but Supabase had wrong values — previous sync had overwritten them.
**How to apply:** After running the recalculate script, always immediately verify with a direct Supabase query.

## Logo replacement: user handles image files themselves
**Why:** User replaced logo.jpg with logo.png (transparent bg) directly.
**How to apply:** Don't assume logo file format — check Logo.tsx for current src path.
