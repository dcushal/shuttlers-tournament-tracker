# Player Avatars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let members upload profile photos that appear on the roster, rankings, and tournament history screens.

**Architecture:** Photos are stored in Supabase Storage (`avatars` bucket, public read). `avatar_url` is a nullable column on the `players` table. A `ProfileModal` component handles upload (with client-side resize to 500×500 JPEG), triggered from the Header (own profile) or the roster avatar camera icon (admin for any player). Realtime propagation means all clients update immediately on upload.

**Tech Stack:** React + TypeScript, Supabase Storage + Postgres, Vite, Tailwind CSS, Lucide icons

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `migrations/add_avatar_url.sql` | Create | Add `avatar_url TEXT` column to players table |
| `src/types.ts` | Modify | Add `avatarUrl?: string` to Player interface |
| `src/hooks/useSupabase.ts` | Modify | Map `avatar_url` in fetch, include in upsert, add `updatePlayerAvatar` |
| `src/components/ProfileModal.tsx` | Create | Upload modal with resize, loading/error state |
| `src/components/Header.tsx` | Modify | Show circular avatar + name, tap opens own profile |
| `src/App.tsx` | Modify | Modal state, pass `updatePlayerAvatar` + `onOpenProfile` down |
| `src/components/PlayersList.tsx` | Modify | Avatar image with camera icon overlay |
| `src/components/Rankings.tsx` | Modify | Avatar in rank box, crown overlay for #1 |
| `src/components/History.tsx` | Modify | Accept `players` prop, small avatars in match rows |

---

## Task 1: DB Migration + Player Type

**Files:**
- Create: `migrations/add_avatar_url.sql`
- Modify: `src/types.ts`

- [ ] **Step 1: Create migration file**

```sql
-- migrations/add_avatar_url.sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

- [ ] **Step 2: Run migration in Supabase**

Go to Supabase dashboard → SQL Editor → paste and run the migration above.

- [ ] **Step 3: Add avatarUrl to Player type**

In `src/types.ts`, update the Player interface:

```typescript
export interface Player {
  id: string;
  name: string;
  points: number;
  rank: number;
  previousRank: number;
  startingPoints?: number;
  isCheckedIn?: boolean;
  type?: 'member' | 'guest';
  avatarUrl?: string; // add this line
}
```

- [ ] **Step 4: Type-check**

```bash
cd "/Users/home/Public/WORKSPACE/shuttlers-tournament-tracker "
npx tsc --noEmit
```

Expected: no new errors (there may be pre-existing ones — only fail on new errors).

- [ ] **Step 5: Commit**

```bash
git add migrations/add_avatar_url.sql src/types.ts
git commit -m "feat: add avatar_url to players table and Player type"
```

---

## Task 2: Supabase Storage Setup + updatePlayerAvatar Hook

**Files:**
- Modify: `src/hooks/useSupabase.ts`

- [ ] **Step 1: Create Supabase Storage bucket**

Go to Supabase dashboard → Storage → New bucket:
- Name: `avatars`
- Public: **yes** (toggle on)
- Click Create

Then go to Storage → Policies → `avatars` bucket → add policy:
- For SELECT: allow public (no auth required)
- For INSERT/UPDATE: allow authenticated (or set to public for simplicity since the app has its own auth)

Simplest policy for INSERT (paste in SQL editor):
```sql
CREATE POLICY "Allow all uploads to avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow public reads from avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Allow updates to avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');
```

- [ ] **Step 2: Add avatar_url to fetch mapping in useSupabase.ts**

In the `fetchPlayers` function inside `usePlayers`, find the `dbPlayers` mapping block (around line 38) and add `avatarUrl`:

```typescript
const dbPlayers: Player[] = data.map(p => ({
    id: p.id,
    name: p.name,
    points: p.points,
    rank: p.rank,
    previousRank: p.previous_rank,
    startingPoints: p.starting_points ?? 10,
    isCheckedIn: p.is_checked_in,
    type: p.type,
    avatarUrl: p.avatar_url ?? undefined,  // add this line
}));
```

- [ ] **Step 3: Add avatar_url to upsert in updatePlayers**

In `updatePlayers`, find the `.upsert(newPlayers.map(p => ({...})))` block and add:

```typescript
...(p.avatarUrl !== undefined && { avatar_url: p.avatarUrl }),
```

So the full upsert map looks like:
```typescript
newPlayers.map(p => ({
    id: p.id,
    name: p.name,
    points: p.points,
    rank: p.rank,
    previous_rank: p.previousRank,
    is_checked_in: p.isCheckedIn ?? false,
    type: p.type ?? 'member',
    ...(p.startingPoints !== undefined && { starting_points: p.startingPoints }),
    ...(p.avatarUrl !== undefined && { avatar_url: p.avatarUrl }),
})),
```

- [ ] **Step 4: Add updatePlayerAvatar function**

Add this function inside `usePlayers`, after the `toggleCheckIn` definition and before the `return` statement:

```typescript
const updatePlayerAvatar = useCallback(async (playerId: string, file: File): Promise<string | null> => {
    if (!isSupabaseConfigured() || !supabase) return null;

    // Resize image client-side to max 500x500 JPEG at 85% quality
    const resized = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const MAX = 500;
            const scale = Math.min(MAX / img.width, MAX / img.height, 1);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                blob => blob ? resolve(blob) : reject(new Error('Resize failed')),
                'image/jpeg',
                0.85
            );
        };
        img.onerror = reject;
        img.src = objectUrl;
    });

    try {
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(playerId, resized, { upsert: true, contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(playerId);

        // Append cache-buster so re-uploads show immediately
        const urlWithBust = `${publicUrl}?t=${Date.now()}`;

        const { error: updateError } = await supabase
            .from('players')
            .update({ avatar_url: urlWithBust })
            .eq('id', playerId);

        if (updateError) throw updateError;

        // Update local state immediately
        setPlayers(prev => prev.map(p =>
            p.id === playerId ? { ...p, avatarUrl: urlWithBust } : p
        ));

        return urlWithBust;
    } catch (err) {
        console.error('Error uploading avatar:', err);
        return null;
    }
}, []);
```

- [ ] **Step 5: Add updatePlayerAvatar to the return value**

```typescript
return { players, setPlayers: updatePlayers, addPlayer, deletePlayer, toggleCheckIn, updatePlayerAvatar, loading, error, refetch: fetchPlayers };
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useSupabase.ts
git commit -m "feat: add updatePlayerAvatar to useSupabase, map avatar_url in fetch/upsert"
```

---

## Task 3: ProfileModal Component

**Files:**
- Create: `src/components/ProfileModal.tsx`

- [ ] **Step 1: Create ProfileModal**

Create `src/components/ProfileModal.tsx`:

```tsx
import React, { useRef, useState } from 'react';
import { Camera, X, Upload } from 'lucide-react';
import { Player } from '../types';

interface Props {
  player: Player;
  onClose: () => void;
  onUpload: (playerId: string, file: File) => Promise<string | null>;
}

const ProfileModal: React.FC<Props> = ({ player, onClose, onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const result = await onUpload(player.id, file);
    setUploading(false);
    if (result) {
      onClose();
    } else {
      setError('Upload failed. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl p-6 space-y-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white uppercase tracking-tight">Profile</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              {player.avatarUrl ? (
                <img
                  src={player.avatarUrl}
                  alt={player.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <span className="text-3xl font-black text-green-500">
                  {player.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg font-black text-white uppercase tracking-tight">{player.name}</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              {player.points % 1 === 0 ? player.points : player.points.toFixed(1)} pts
            </p>
          </div>
        </div>

        {/* Upload */}
        <div className="space-y-2">
          {error && (
            <p className="text-[11px] text-red-400 font-bold text-center">{error}</p>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-zinc-950 font-black uppercase tracking-widest text-sm py-3.5 rounded-2xl transition-all active:scale-[0.98]"
          >
            {uploading ? (
              <>
                <Upload size={16} className="animate-bounce" /> Uploading…
              </>
            ) : (
              <>
                <Camera size={16} /> {player.avatarUrl ? 'Change Photo' : 'Upload Photo'}
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProfileModal.tsx
git commit -m "feat: add ProfileModal component for avatar upload"
```

---

## Task 4: Header — Avatar Display

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Update Header props and render**

Replace the full contents of `src/components/Header.tsx`:

```tsx
import React from 'react';
import Logo from './Logo';
import { LogOut, ArrowLeft } from 'lucide-react';
import { Player } from '../types';

interface Props {
  onLogout?: () => void;
  onBackToModes?: () => void;
  user?: { role: 'admin' | 'member'; name: string } | null;
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
  mode?: 'casual' | 'tournament' | null;
  currentPlayer?: Player;
  onOpenProfile?: () => void;
}

const Header: React.FC<Props> = ({ onLogout, onBackToModes, user, currentPlayer, onOpenProfile }) => {
  return (
    <header className="liquid-card-elevated py-4 z-40">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToModes && (
            <button
              onClick={onBackToModes}
              className="flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-90"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex items-center gap-4 ml-1">
            <Logo className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-black text-white leading-none tracking-tighter uppercase">SHUTTLERS</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></div>
                <button
                  onClick={onOpenProfile}
                  disabled={!onOpenProfile}
                  className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest hover:text-green-400 transition-colors disabled:pointer-events-none"
                >
                  {user?.name || 'Guest'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Avatar button */}
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="w-9 h-9 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-green-500/50 transition-colors"
            >
              {currentPlayer?.avatarUrl ? (
                <img
                  src={currentPlayer.avatarUrl}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <span className="text-xs font-black text-green-500">
                  {user?.name?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center justify-center text-zinc-400 hover:text-red-500 active:scale-90 transition-all"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: add avatar display and profile tap to Header"
```

---

## Task 5: App.tsx — Wire Everything Together

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import ProfileModal and destructure updatePlayerAvatar**

At the top of `src/App.tsx`, add the import:

```typescript
import ProfileModal from './components/ProfileModal';
```

In the `usePlayers` destructure (find the line that starts `const { players, setPlayers, addPlayer, deletePlayer ...`), add `updatePlayerAvatar`:

```typescript
const { players, setPlayers, addPlayer, deletePlayer, toggleCheckIn, updatePlayerAvatar, loading: playersLoading, error: playersError, refetch: refetchPlayers } = usePlayers(...);
```

(Match the exact destructure pattern in the existing file — just add `updatePlayerAvatar` to the list.)

- [ ] **Step 2: Add profile modal state**

After the existing state declarations (near `const [activeTab, setActiveTab]`), add:

```typescript
const [profileModalPlayer, setProfileModalPlayer] = useState<Player | null>(null);
```

- [ ] **Step 3: Compute currentPlayer for logged-in member**

After the `profileModalPlayer` state, add:

```typescript
const currentPlayer = user ? players.find(p => p.name.toLowerCase() === user.name.toLowerCase()) : undefined;
```

- [ ] **Step 4: Update tournament-mode Header to pass currentPlayer and onOpenProfile**

Find the tournament-mode Header render (line ~442):

```tsx
<Header activeTab={activeTab} setActiveTab={setActiveTab} onBackToModes={() => setMode(null)} onLogout={handleLogout} user={user} mode={mode} />
```

Replace with:

```tsx
<Header
  activeTab={activeTab}
  setActiveTab={setActiveTab}
  onBackToModes={() => setMode(null)}
  onLogout={handleLogout}
  user={user}
  mode={mode}
  currentPlayer={currentPlayer}
  onOpenProfile={currentPlayer ? () => setProfileModalPlayer(currentPlayer) : undefined}
/>
```

- [ ] **Step 5: Update PlayersList to pass onOpenProfile**

Find the PlayersList render and add two props:

```tsx
<PlayersList
  players={tournamentPlayers}
  setPlayers={setPlayers}
  addPlayer={addPlayer}
  deletePlayer={deletePlayer}
  tournaments={tournaments}
  user={user}
  checkedInIds={checkedInIds}
  onToggleCheckIn={handleToggleCheckIn}
  onOpenProfile={(player) => setProfileModalPlayer(player)}
  currentPlayerId={currentPlayer?.id}
/>
```

- [ ] **Step 6: Update History to pass players**

Find the History render and add the `players` prop:

```tsx
<History tournaments={tournaments} onDelete={handleDeleteTournament} players={players} />
```

- [ ] **Step 7: Render ProfileModal at the end of the tournament-mode JSX**

Just before the closing `</div>` of the tournament-mode return, add:

```tsx
{profileModalPlayer && (
  <ProfileModal
    player={profileModalPlayer}
    onClose={() => setProfileModalPlayer(null)}
    onUpload={updatePlayerAvatar}
  />
)}
```

- [ ] **Step 8: Type-check**

```bash
npx tsc --noEmit
```

Fix any type errors (likely prop mismatches on PlayersList and History).

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire ProfileModal, currentPlayer, and updatePlayerAvatar in App"
```

---

## Task 6: PlayersList — Avatar + Camera Icon

**Files:**
- Modify: `src/components/PlayersList.tsx`

- [ ] **Step 1: Add new props to Props interface**

```typescript
interface Props {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  addPlayer: (player: Player) => Promise<void>;
  deletePlayer: (playerId: string) => Promise<void>;
  tournaments: Tournament[];
  user: { role: 'admin' | 'member'; name: string };
  checkedInIds: string[];
  onToggleCheckIn: (id: string) => void;
  onOpenProfile: (player: Player) => void;   // add
  currentPlayerId?: string;                   // add
}
```

- [ ] **Step 2: Destructure new props**

In the component signature, add `onOpenProfile` and `currentPlayerId`:

```typescript
const PlayersList: React.FC<Props> = ({ players, setPlayers, addPlayer: hookAddPlayer, deletePlayer: hookDeletePlayer, tournaments, user, checkedInIds, onToggleCheckIn, onOpenProfile, currentPlayerId }) => {
```

- [ ] **Step 3: Add Camera to lucide imports**

```typescript
import { Plus, Trash2, UserPlus, Trophy, CheckCircle2, Camera } from 'lucide-react';
```

- [ ] **Step 4: Replace the avatar circle with avatar image + camera overlay**

Find the block that renders the avatar circle (the `<div className="relative">` wrapping the avatar and trophy badge). Replace it with:

```tsx
<div className="flex items-center gap-4">
  <div className="relative">
    {/* Avatar circle */}
    <div className={`w-12 h-12 rounded-2xl border overflow-hidden flex items-center justify-center font-black text-sm transition-all ${isCheckedIn
        ? 'bg-green-500 text-zinc-950 border-green-500'
        : 'bg-zinc-950 border-zinc-800 text-green-500 group-hover:bg-green-500 group-hover:text-zinc-950'
      }`}>
      {isCheckedIn ? (
        <CheckCircle2 size={20} />
      ) : player.avatarUrl ? (
        <img
          src={player.avatarUrl}
          alt={player.name}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        player.name.charAt(0).toUpperCase()
      )}
    </div>

    {/* Trophy badge */}
    {stats?.titles > 0 && (
      <div className="absolute -top-1 -right-1 bg-yellow-500 text-zinc-950 w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-900 shadow-lg">
        <Trophy size={10} strokeWidth={3} />
      </div>
    )}

    {/* Camera icon — only shown for own card (member) or all cards (admin) */}
    {(user.role === 'admin' || player.id === currentPlayerId) && (
      <button
        onClick={e => { e.stopPropagation(); onOpenProfile(player); }}
        className="absolute -bottom-1 -right-1 w-5 h-5 bg-zinc-700 hover:bg-green-500 text-white hover:text-zinc-950 rounded-full flex items-center justify-center border border-zinc-600 transition-all shadow"
      >
        <Camera size={9} strokeWidth={2.5} />
      </button>
    )}
  </div>
```

Make sure this replaces the old `<div className="relative">...</div>` block (up to and including the trophy badge). The rest of the player card content (name, form dots) stays unchanged.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/PlayersList.tsx
git commit -m "feat: show avatar with camera upload icon in roster"
```

---

## Task 7: Rankings — Avatar in Rank Box

**Files:**
- Modify: `src/components/Rankings.tsx`

- [ ] **Step 1: Replace the rank number box with avatar**

Find the rank box render inside the `sortedPlayers.map` (the `<div className={`w-14 h-14 rounded-2xl...`}>` block). Replace it with:

```tsx
<div className={`relative w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center text-xl font-black shadow-lg ${
    index === 0 ? 'bg-green-500 text-zinc-950' :
    index < captainCount ? 'bg-zinc-800 text-white' :
    'bg-zinc-800/60 text-white'
}`}>
  {player.avatarUrl ? (
    <img
      src={player.avatarUrl}
      alt={player.name}
      className="w-full h-full object-cover"
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  ) : (
    index === 0 ? <Crown size={28} strokeWidth={3} /> : displayRank
  )}
  {/* Crown overlay for #1 when they have a photo */}
  {index === 0 && player.avatarUrl && (
    <div className="absolute bottom-0.5 right-0.5 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center shadow">
      <Crown size={10} strokeWidth={3} className="text-zinc-950" />
    </div>
  )}
</div>
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Rankings.tsx
git commit -m "feat: show player avatar in rankings rank box with crown overlay for #1"
```

---

## Task 8: History — Small Avatars in Match Rows

**Files:**
- Modify: `src/components/History.tsx`

- [ ] **Step 1: Update Props interface to accept players**

```typescript
interface Props {
  tournaments: Tournament[];
  onDeleteTournament?: (id: string) => void;
  isAdmin?: boolean;
  players?: Player[];  // add
}
```

Add `Player` to the import:

```typescript
import { Tournament, Match, Player } from '../types';
```

- [ ] **Step 2: Destructure players in component signature**

```typescript
const History: React.FC<Props> = ({ tournaments, onDeleteTournament, isAdmin, players = [] }) => {
```

- [ ] **Step 3: Add a helper to get avatar by player ID**

Inside the component (before the return), add:

```typescript
const getPlayerAvatar = (playerId: string) => {
  return players.find(p => p.id === playerId)?.avatarUrl;
};
```

- [ ] **Step 4: Add small avatars in match rows**

Find the match row render inside the `['finals', 'semi-finals', 'round-robin'].map` block. It currently renders team names like:

```tsx
<span className={`text-[10px] font-black uppercase ...`}>
  {teamA?.player1.name} / {teamA?.player2.name}
</span>
```

Replace each team name span with a flex container that adds avatar dots:

For Team A (left side):
```tsx
<div className="flex-1 flex items-center gap-1.5">
  <div className="flex -space-x-1.5">
    {[teamA?.player1, teamA?.player2].map((p, i) => p && (
      <div key={i} className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        {getPlayerAvatar(p.id) ? (
          <img src={getPlayerAvatar(p.id)} alt={p.name} className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <span className="text-[7px] font-black text-zinc-400">{p.name.charAt(0)}</span>
        )}
      </div>
    ))}
  </div>
  <span className={`text-[10px] font-black uppercase ${m.scoreA > m.scoreB ? 'text-white' : 'text-zinc-600'}`}>
    {teamA?.player1.name} / {teamA?.player2.name}
  </span>
</div>
```

For Team B (right side, mirror layout):
```tsx
<div className="flex-1 flex items-center justify-end gap-1.5">
  <span className={`text-[10px] font-black uppercase ${m.scoreB > m.scoreA ? 'text-white' : 'text-zinc-600'}`}>
    {teamB?.player1.name} / {teamB?.player2.name}
  </span>
  <div className="flex -space-x-1.5">
    {[teamB?.player1, teamB?.player2].map((p, i) => p && (
      <div key={i} className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        {getPlayerAvatar(p.id) ? (
          <img src={getPlayerAvatar(p.id)} alt={p.name} className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <span className="text-[7px] font-black text-zinc-400">{p.name.charAt(0)}</span>
        )}
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Manual smoke test**

```bash
npm run dev
```

Open the app and verify:
1. Rankings tab — rank box shows avatar photo if uploaded, falls back to rank number / crown
2. Roster tab — avatar circle shows photo, camera icon appears (own card for members, all for admin)
3. Tapping camera icon opens ProfileModal
4. Upload a photo → modal closes, photo appears immediately across roster, rankings, and header
5. History tab — small avatar circles appear next to player names in match rows
6. Header — tapping username or avatar circle opens ProfileModal for logged-in user

- [ ] **Step 7: Final commit and push**

```bash
git add src/components/History.tsx
git commit -m "feat: show small player avatars in tournament history match rows"
git push
```
