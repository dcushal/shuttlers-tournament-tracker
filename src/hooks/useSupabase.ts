import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Player, Tournament, Team, Match, Transaction, HallOfFameEntry, CasualMatch } from '../types';

// ============ PLAYERS HOOK ============
export function usePlayers(initialPlayers: Player[] | (() => Player[])) {
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch players from Supabase
    const fetchPlayers = useCallback(async () => {
        // First, load from localStorage as base (these have the correct recalculated points)
        const localData = localStorage.getItem('shuttlers_players');
        const localPlayers = localData ? JSON.parse(localData) : [];

        if (!isSupabaseConfigured() || !supabase) {
            // No Supabase - use localStorage data directly
            if (localPlayers.length > 0) {
                setPlayers(localPlayers);
            }
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('players')
                .select('*')
                .order('rank', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                // Convert Supabase players to app format
                const dbPlayers: Player[] = data.map(p => ({
                    id: p.id,
                    name: p.name,
                    points: p.points,
                    rank: p.rank,
                    previousRank: p.previous_rank,
                    startingPoints: p.starting_points ?? 10,
                    isCheckedIn: p.is_checked_in,
                    type: p.type,
                    avatarUrl: p.avatar_url ?? undefined,
                }));

                // Supabase is the source of truth for points, rank, and who exists.
                // localStorage only overrides isCheckedIn (session-local state).
                const mergedPlayers = dbPlayers.map(dbPlayer => {
                    const localPlayer = localPlayers.find((lp: Player) => lp.id === dbPlayer.id);
                    if (localPlayer) {
                        return {
                            ...dbPlayer,
                            isCheckedIn: localPlayer.isCheckedIn
                        };
                    }
                    return dbPlayer;
                });

                // DO NOT append localOnlyPlayers — players not in Supabase are stale/duplicate artifacts.
                setPlayers(mergedPlayers);
                localStorage.setItem('shuttlers_players', JSON.stringify(mergedPlayers));
            }
        } catch (err) {
            // On error, fall back to localStorage
            if (localPlayers.length > 0) {
                setPlayers(localPlayers);
            }
            setError(err instanceof Error ? err.message : 'Failed to fetch players');
            console.error('Error fetching players:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers]);

    // Realtime subscription — all clients auto-refresh when any player row changes
    useEffect(() => {
        if (!isSupabaseConfigured() || !supabase) return;

        const channel = supabase
            .channel('players-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
                fetchPlayers();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchPlayers]);

    // Update players in Supabase
    const updatePlayers = useCallback(async (newPlayers: Player[]): Promise<boolean> => {
        setPlayers(newPlayers);

        // Also save to localStorage as backup
        localStorage.setItem('shuttlers_players', JSON.stringify(newPlayers));

        if (!isSupabaseConfigured() || !supabase) return false;

        try {
            // Upsert all players
            const { error } = await supabase
                .from('players')
                .upsert(
                    newPlayers.map(p => ({
                        id: p.id,
                        name: p.name,
                        points: p.points,
                        rank: p.rank,
                        previous_rank: p.previousRank,
                        is_checked_in: p.isCheckedIn ?? false,
                        type: p.type ?? 'member',
                        // Only include starting_points if it's defined — column may not exist yet
                        ...(p.startingPoints !== undefined && { starting_points: p.startingPoints }),
                        ...(p.avatarUrl !== undefined && { avatar_url: p.avatarUrl }),
                    })),
                    { onConflict: 'id' }
                );

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Error updating players in Supabase:', err);
            return false;
        }
    }, []);

    // Add a new player
    const addPlayer = useCallback(async (player: Player) => {
        // Merge with ALL current players (not just filtered), re-sort, re-rank
        const merged = [...players, player]
            .sort((a, b) => b.points - a.points)
            .map((p, i) => ({ ...p, rank: i + 1, previousRank: p.rank || i + 1 }));
        await updatePlayers(merged);
    }, [players, updatePlayers]);

    // Delete a player
    const deletePlayer = useCallback(async (playerId: string) => {
        // Remove, re-sort, re-rank
        const remaining = players.filter(p => p.id !== playerId)
            .sort((a, b) => b.points - a.points)
            .map((p, i) => ({ ...p, rank: i + 1, previousRank: p.rank || i + 1 }));
        await updatePlayers(remaining);

        if (isSupabaseConfigured() && supabase) {
            try {
                await supabase.from('players').delete().eq('id', playerId);
            } catch (err) {
                console.error('Error deleting player:', err);
            }
        }
    }, [players, updatePlayers]);

    // Toggle Check-In status specifically
    const toggleCheckIn = useCallback(async (playerId: string, isCheckedIn: boolean) => {
        setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, isCheckedIn } : p));

        if (isSupabaseConfigured() && supabase) {
            try {
                await supabase
                    .from('players')
                    .update({ is_checked_in: isCheckedIn })
                    .eq('id', playerId);
            } catch (err) {
                console.error('Error updating check-in status:', err);
            }
        }
    }, []);

    const updatePlayerAvatar = useCallback(async (playerId: string, file: File): Promise<string | null> => {
        if (!isSupabaseConfigured() || !supabase) return null;

        try {
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
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(
                        blob => blob ? resolve(blob) : reject(new Error('Resize failed')),
                        'image/jpeg',
                        0.85
                    );
                };
                img.onerror = (e) => {
                    URL.revokeObjectURL(objectUrl);
                    reject(e);
                };
                img.src = objectUrl;
            });

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(playerId, resized, { upsert: true, contentType: 'image/jpeg' });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(playerId);

            // Store cache-busted URL in DB so restarts always get the latest image
            const urlWithBust = `${publicUrl}?t=${Date.now()}`;
            const { error: updateError } = await supabase
                .from('players')
                .update({ avatar_url: urlWithBust })
                .eq('id', playerId);

            if (updateError) throw updateError;

            setPlayers(prev => prev.map(p =>
                p.id === playerId ? { ...p, avatarUrl: urlWithBust } : p
            ));

            return urlWithBust;
        } catch (err) {
            console.error('Error uploading avatar:', err);
            throw err;
        }
    }, []);

    return { players, setPlayers: updatePlayers, addPlayer, deletePlayer, toggleCheckIn, updatePlayerAvatar, loading, error, refetch: fetchPlayers };
}

// ============ TOURNAMENTS HOOK ============
export function useTournaments(initialTournaments: Tournament[] | (() => Tournament[])) {
    const [tournaments, setTournaments] = useState<Tournament[]>(initialTournaments);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTournaments = useCallback(async () => {
        if (!isSupabaseConfigured() || !supabase) {
            setLoading(false);
            return;
        }

        try {
            // Fetch tournaments
            const { data: tournamentsData, error: tournamentsError } = await supabase
                .from('tournaments')
                .select('*')
                .order('created_at', { ascending: false });

            if (tournamentsError) throw tournamentsError;

            if (!tournamentsData || tournamentsData.length === 0) {
                setLoading(false);
                return;
            }

            // Fetch teams and matches for all tournaments
            const tournamentIds = tournamentsData.map(t => t.id);

            const { data: teamsData, error: teamsError } = await supabase
                .from('teams')
                .select('*, player1:player1_id(*), player2:player2_id(*)')
                .in('tournament_id', tournamentIds);

            if (teamsError) throw teamsError;

            const { data: matchesData, error: matchesError } = await supabase
                .from('matches')
                .select('*')
                .in('tournament_id', tournamentIds);

            if (matchesError) throw matchesError;

            // Map the data to our types
            const mappedTournaments: Tournament[] = tournamentsData.map(t => {
                const tournamentTeams = (teamsData || [])
                    .filter(team => team.tournament_id === t.id)
                    .map(team => ({
                        id: team.id,
                        player1: {
                            id: team.player1.id,
                            name: team.player1.name,
                            points: team.player1.points,
                            rank: team.player1.rank,
                            previousRank: team.player1.previous_rank
                        },
                        player2: {
                            id: team.player2.id,
                            name: team.player2.name,
                            points: team.player2.points,
                            rank: team.player2.rank,
                            previousRank: team.player2.previous_rank
                        }
                    }));

                const tournamentMatches = (matchesData || [])
                    .filter(match => match.tournament_id === t.id)
                    .map(match => ({
                        id: match.id,
                        teamAId: match.team_a_id,
                        teamBId: match.team_b_id,
                        scoreA: match.score_a,
                        scoreB: match.score_b,
                        isCompleted: match.is_completed,
                        phase: match.phase as 'round-robin' | 'semi-finals' | 'finals'
                    }));

                return {
                    id: t.id,
                    name: t.name,
                    date: t.date,
                    pointLimit: t.point_limit as 11 | 15 | 21,
                    currentPhase: t.current_phase as 'round-robin' | 'semi-finals' | 'finals' | 'completed',
                    status: t.status as 'active' | 'completed',
                    teams: tournamentTeams,
                    matches: tournamentMatches
                };
            });

            setTournaments(mappedTournaments);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch tournaments');
            console.error('Error fetching tournaments:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTournaments();
    }, [fetchTournaments]);

    const updateTournaments = useCallback(async (newTournaments: Tournament[]) => {
        setTournaments(newTournaments);
        localStorage.setItem('shuttlers_tournaments', JSON.stringify(newTournaments));
    }, []);

    // Create a new tournament
    const createTournament = useCallback(async (tournament: Tournament) => {
        const newTournaments = [...tournaments, tournament];
        setTournaments(newTournaments);
        localStorage.setItem('shuttlers_tournaments', JSON.stringify(newTournaments));

        if (!isSupabaseConfigured() || !supabase) return;

        try {
            // Insert tournament
            const { error: tournamentError } = await supabase
                .from('tournaments')
                .insert({
                    id: tournament.id,
                    name: tournament.name,
                    date: tournament.date,
                    point_limit: tournament.pointLimit,
                    current_phase: tournament.currentPhase,
                    status: tournament.status
                });

            if (tournamentError) throw tournamentError;

            // Insert teams
            if (tournament.teams.length > 0) {
                const { error: teamsError } = await supabase
                    .from('teams')
                    .insert(
                        tournament.teams.map(team => ({
                            id: team.id,
                            tournament_id: tournament.id,
                            player1_id: team.player1.id,
                            player2_id: team.player2.id
                        }))
                    );

                if (teamsError) throw teamsError;
            }

            // Insert matches
            if (tournament.matches.length > 0) {
                const { error: matchesError } = await supabase
                    .from('matches')
                    .insert(
                        tournament.matches.map(match => ({
                            id: match.id,
                            tournament_id: tournament.id,
                            team_a_id: match.teamAId,
                            team_b_id: match.teamBId,
                            score_a: match.scoreA,
                            score_b: match.scoreB,
                            is_completed: match.isCompleted,
                            phase: match.phase
                        }))
                    );

                if (matchesError) throw matchesError;
            }
        } catch (err) {
            console.error('Error creating tournament:', err);
        }
    }, [tournaments]);

    // Update an existing tournament
    const updateTournament = useCallback(async (updated: Tournament) => {
        const newTournaments = tournaments.map(t => t.id === updated.id ? updated : t);
        setTournaments(newTournaments);
        localStorage.setItem('shuttlers_tournaments', JSON.stringify(newTournaments));

        if (!isSupabaseConfigured() || !supabase) return;

        try {
            // Update tournament
            const { error: tournamentError } = await supabase
                .from('tournaments')
                .update({
                    name: updated.name,
                    date: updated.date,
                    point_limit: updated.pointLimit,
                    current_phase: updated.currentPhase,
                    status: updated.status
                })
                .eq('id', updated.id);

            if (tournamentError) throw tournamentError;

            // Upsert matches
            if (updated.matches.length > 0) {
                const { error: matchesError } = await supabase
                    .from('matches')
                    .upsert(
                        updated.matches.map(match => ({
                            id: match.id,
                            tournament_id: updated.id,
                            team_a_id: match.teamAId,
                            team_b_id: match.teamBId,
                            score_a: match.scoreA,
                            score_b: match.scoreB,
                            is_completed: match.isCompleted,
                            phase: match.phase
                        })),
                        { onConflict: 'id' }
                    );

                if (matchesError) throw matchesError;
            }
        } catch (err) {
            console.error('Error updating tournament:', err);
        }
    }, [tournaments]);

    // Delete a tournament
    const deleteTournament = useCallback(async (id: string) => {
        const newTournaments = tournaments.filter(t => t.id !== id);
        setTournaments(newTournaments);
        localStorage.setItem('shuttlers_tournaments', JSON.stringify(newTournaments));

        if (isSupabaseConfigured() && supabase) {
            try {
                await supabase.from('tournaments').delete().eq('id', id);
            } catch (err) {
                console.error('Error deleting tournament:', err);
            }
        }
    }, [tournaments]);

    return {
        tournaments,
        setTournaments: updateTournaments,
        createTournament,
        updateTournament,
        deleteTournament,
        loading,
        error,
        refetch: fetchTournaments
    };
}

// ============ TRANSACTIONS HOOK ============
export function useTransactions(initialTransactions: Transaction[] | (() => Transaction[])) {
    const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = useCallback(async () => {
        if (!isSupabaseConfigured() || !supabase) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                setTransactions(data.map(t => ({
                    id: t.id,
                    playerId: t.player_id,
                    amount: t.amount,
                    description: t.description,
                    date: t.date,
                    type: t.type as 'expense' | 'payment'
                })));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
            console.error('Error fetching transactions:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const updateTransactions = useCallback(async (newTransactions: Transaction[]) => {
        setTransactions(newTransactions);
        localStorage.setItem('shuttlers_transactions', JSON.stringify(newTransactions));

        if (!isSupabaseConfigured() || !supabase) return;

        try {
            // Find new transactions (those not in the current state from Supabase)
            const currentIds = transactions.map(t => t.id);
            const newOnes = newTransactions.filter(t => !currentIds.includes(t.id));

            if (newOnes.length > 0) {
                const { error } = await supabase
                    .from('transactions')
                    .insert(
                        newOnes.map(t => ({
                            id: t.id,
                            player_id: t.playerId,
                            amount: t.amount,
                            description: t.description,
                            date: t.date,
                            type: t.type
                        }))
                    );

                if (error) throw error;
            }

            // Check for deleted transactions
            const newIds = newTransactions.map(t => t.id);
            const deletedIds = currentIds.filter(id => !newIds.includes(id));

            if (deletedIds.length > 0) {
                const { error } = await supabase
                    .from('transactions')
                    .delete()
                    .in('id', deletedIds);

                if (error) throw error;
            }
        } catch (err) {
            console.error('Error updating transactions:', err);
        }
    }, [transactions]);

    return { transactions, setTransactions: updateTransactions, loading, error, refetch: fetchTransactions };
}

// ============ HALL OF FAME HOOK ============
export function useHallOfFame(initialHallOfFame: HallOfFameEntry[] | (() => HallOfFameEntry[])) {
    const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>(initialHallOfFame);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHallOfFame = useCallback(async () => {
        if (!isSupabaseConfigured() || !supabase) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('hall_of_fame')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                setHallOfFame(data.map(h => ({
                    id: h.id,
                    teamName: h.team_name,
                    date: h.date
                })));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch hall of fame');
            console.error('Error fetching hall of fame:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHallOfFame();
    }, [fetchHallOfFame]);

    const updateHallOfFame = useCallback(async (newHallOfFame: HallOfFameEntry[]) => {
        setHallOfFame(newHallOfFame);
        localStorage.setItem('shuttlers_hof', JSON.stringify(newHallOfFame));

        if (!isSupabaseConfigured() || !supabase) return;

        try {
            // Check for new entries
            const currentIds = hallOfFame.map(h => h.id);
            const newOnes = newHallOfFame.filter(h => !currentIds.includes(h.id));

            if (newOnes.length > 0) {
                const { error } = await supabase
                    .from('hall_of_fame')
                    .insert(
                        newOnes.map(h => ({
                            id: h.id,
                            team_name: h.teamName,
                            date: h.date
                        }))
                    );

                if (error) throw error;
            }

            // Check for deleted entries
            const newIds = newHallOfFame.map(h => h.id);
            const deletedIds = currentIds.filter(id => !newIds.includes(id));

            if (deletedIds.length > 0) {
                const { error } = await supabase
                    .from('hall_of_fame')
                    .delete()
                    .in('id', deletedIds);

                if (error) throw error;
            }
        } catch (err) {
            console.error('Error updating hall of fame:', err);
        }
    }, [hallOfFame]);

    return { hallOfFame, setHallOfFame: updateHallOfFame, loading, error, refetch: fetchHallOfFame };
}

// ============ CASUAL MATCHES HOOK ============
export function useCasualMatches(initialMatches: CasualMatch[] | (() => CasualMatch[])) {
    const [matches, setMatches] = useState<CasualMatch[]>(initialMatches);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMatches = useCallback(async () => {
        if (!isSupabaseConfigured() || !supabase) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('casual_matches')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;

            if (data) {
                setMatches(data.map(m => ({
                    id: m.id,
                    date: m.date,
                    teamA: {
                        player1Id: m.team_a_player1_id,
                        player2Id: m.team_a_player2_id,
                        score: m.team_a_score
                    },
                    teamB: {
                        player1Id: m.team_b_player1_id,
                        player2Id: m.team_b_player2_id,
                        score: m.team_b_score
                    },
                    winner: m.winner_team.toUpperCase() as 'A' | 'B',
                    loggedByUserId: m.logged_by_user_id
                })));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch casual matches');
            console.error('Error fetching casual matches:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);

    const addMatch = useCallback(async (match: CasualMatch) => {
        setMatches(prev => [match, ...prev]);

        if (!isSupabaseConfigured() || !supabase) return;

        try {
            const { error } = await supabase
                .from('casual_matches')
                .insert({
                    id: match.id,
                    date: match.date,
                    team_a_player1_id: match.teamA.player1Id,
                    team_a_player2_id: match.teamA.player2Id,
                    team_a_score: match.teamA.score,
                    team_b_player1_id: match.teamB.player1Id,
                    team_b_player2_id: match.teamB.player2Id,
                    team_b_score: match.teamB.score,
                    winner_team: match.winner.toLowerCase(),
                    logged_by_user_id: match.loggedByUserId
                });

            if (error) throw error;
        } catch (err) {
            console.error('Error adding casual match:', err);
        }
    }, []);

    const deleteMatch = useCallback(async (id: string) => {
        setMatches(prev => prev.filter(m => m.id !== id));

        if (!isSupabaseConfigured() || !supabase) return;

        try {
            const { error } = await supabase
                .from('casual_matches')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error('Error deleting casual match:', err);
        }
    }, []);

    return { matches, addMatch, deleteMatch, loading, error, refetch: fetchMatches };
}

