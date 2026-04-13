# Player Avatars — Design Spec
**Date:** 2026-04-13
**Status:** Approved

## Overview

Members can upload a profile photo which appears across the app — roster, rankings, and tournament history. Admin can upload for any player. Photos are stored in Supabase Storage and propagate in real time to all open clients.

---

## Data Layer

### Database
- Add `avatar_url TEXT` column to the `players` table (nullable).
- Migration: `ALTER TABLE players ADD COLUMN avatar_url TEXT;`

### Supabase Storage
- Bucket name: `avatars`
- Access: public read, authenticated write
- File naming: `{player-id}` (no extension — content-type header carries format)
- Overwriting the same key on re-upload automatically replaces the old image

---

## Auth → Player Mapping

Login already matches `user.name` to a player record by name (`players.find(p => p.name.toLowerCase() === user.name.toLowerCase())`). The matched player's `id` is used as the storage key and for all avatar operations. Admin bypasses this — admin can open any player's profile from the roster.

---

## Components

### `useSupabase.ts` — `updatePlayerAvatar(playerId, file)`
1. Resize/compress the image client-side to max 500×500px using a canvas element (no extra library needed)
2. Upload the blob to `avatars/{playerId}` in Supabase Storage (upsert)
3. Get the public URL via `supabase.storage.from('avatars').getPublicUrl(playerId)`
4. Write the URL to `players.avatar_url` where `id = playerId`
5. Supabase Realtime propagates the update to all clients — no manual state sync needed

### `ProfileModal.tsx` — new component
- Triggered by tapping name/avatar in the header
- Shows: circular avatar (photo or initial placeholder), player name, points, match count
- "Upload Photo" button → opens native file picker (accepts image/*)
- On file select: compress → upload → close modal on success
- Members see only their own profile. Admin sees all players' profiles (accessible from roster player card tap too)
- Loading state on the button during upload; error message if upload fails

### `Header.tsx`
- Replace the current name text with a small circular avatar (24×24px) + name
- Tapping opens `ProfileModal` for the logged-in member
- Falls back to initial letter if no avatar set

### `PlayersList.tsx` (Roster tab)
- Replace the letter-initial `div` with an `<img>` if `avatar_url` is set, else keep the initial letter
- A small camera icon appears on hover/tap of the avatar circle — tapping it opens `ProfileModal` for that player
- This keeps card tap for check-in (existing behaviour) and camera icon for profile/upload
- Members only see the camera icon on their own card; admin sees it on all cards

### `Rankings.tsx`
- Replace the rank-number box with a circular avatar photo if available
- #1 player: photo with crown icon overlaid (bottom-right corner, small)
- Non-#1 in captain zone: photo with rank number overlaid or adjacent
- Falls back to current rank-number box if no avatar

### `History.tsx`
- In match score rows, show a small avatar (20×20px) beside each team name
- Two player avatars per team side by side (or stacked if space is tight)
- Falls back to no avatar (current layout) if neither player has one

---

## Upload UX

- File picker: `accept="image/*"` — lets mobile users choose camera or gallery
- Client-side resize: draw to a 500×500 canvas, export as JPEG at 85% quality — keeps uploads under ~100KB
- No cropping UI — keep it simple; circular CSS mask handles the display
- Re-uploading replaces the existing photo silently

---

## Error Handling

- Upload fails → show inline error in ProfileModal, keep existing photo
- No avatar set → fall back to initial letter / rank number (existing UI)
- Broken image URL → `onError` on `<img>` tag falls back to initial placeholder

---

## Out of Scope

- Cropping / zoom UI
- Guest player avatars (guests are ephemeral)
- Avatar deletion (re-upload to replace is sufficient)
