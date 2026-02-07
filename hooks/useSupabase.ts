import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Player, Tournament, Team, Match, Transaction, HallOfFameEntry } from '../types';

// ============ PLAYERS HOOK ============
export function usePlayers(initialPlayers: Player[] | (() => Player[])) {
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch players from Supabase
    const fetchPlayers = useCallback(async () => {
        if (!isSupabaseConfigured() || !supabase) {
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
                setPlayers(data.map(p => ({
                    id: p.id,
                    name: p.name,
                    points: p.points,
                    rank: p.rank,
                    previousRank: p.previous_rank,
                    isCheckedIn: p.is_checked_in
                })));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch players');
            console.error('Error fetching players:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers]);

    // Update players in Supabase
    const updatePlayers = useCallback(async (newPlayers: Player[]) => {
        setPlayers(newPlayers);

        // Also save to localStorage as backup
        localStorage.setItem('shuttlers_players', JSON.stringify(newPlayers));

        if (!isSupabaseConfigured() || !supabase) return;

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
                        is_checked_in: p.isCheckedIn
                    })),
                    { onConflict: 'id' }
                );

            if (error) throw error;
        } catch (err) {
            console.error('Error updating players:', err);
        }
    }, []);

    // Add a new player
    const addPlayer = useCallback(async (player: Player) => {
        const newPlayers = [...players, player];
        await updatePlayers(newPlayers);
    }, [players, updatePlayers]);

    // Delete a player
    const deletePlayer = useCallback(async (playerId: string) => {
        const newPlayers = players.filter(p => p.id !== playerId);
        await updatePlayers(newPlayers);

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

    return { players, setPlayers: updatePlayers, addPlayer, deletePlayer, toggleCheckIn, loading, error, refetch: fetchPlayers };
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
