import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Player, Tournament, Transaction, HallOfFameEntry } from '../types';
import { Download, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface DataMigrationProps {
    players: Player[];
    tournaments: Tournament[];
    transactions: Transaction[];
    hallOfFame: HallOfFameEntry[];
    onImportComplete: () => void;
}

interface ExportData {
    version: '1.0';
    exportedAt: string;
    players: Player[];
    tournaments: Tournament[];
    transactions: Transaction[];
    hallOfFame: HallOfFameEntry[];
    attendance: string[];
}

const DataMigration: React.FC<DataMigrationProps> = ({
    players,
    tournaments,
    transactions,
    hallOfFame,
    onImportComplete
}) => {
    const [importing, setImporting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    // Export all localStorage data to JSON file
    const handleExport = () => {
        try {
            const attendance = localStorage.getItem('shuttlers_attendance');

            const exportData: ExportData = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                players,
                tournaments,
                transactions,
                hallOfFame,
                attendance: attendance ? JSON.parse(attendance) : []
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shuttlers-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setStatus({ type: 'success', message: 'Data exported successfully! Check your downloads.' });
        } catch (err) {
            setStatus({ type: 'error', message: 'Failed to export data.' });
        }
    };

    // Import JSON file to Supabase
    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!isSupabaseConfigured() || !supabase) {
            setStatus({ type: 'error', message: 'Supabase is not configured. Please add your API keys.' });
            return;
        }

        setImporting(true);
        setStatus({ type: 'info', message: 'Importing data...' });

        try {
            const text = await file.text();
            const data: ExportData = JSON.parse(text);

            if (!data.version || !data.players) {
                throw new Error('Invalid backup file format');
            }

            // Import players
            if (data.players.length > 0) {
                const { error: playersError } = await supabase
                    .from('players')
                    .upsert(
                        data.players.map(p => ({
                            id: p.id,
                            name: p.name,
                            points: p.points,
                            rank: p.rank,
                            previous_rank: p.previousRank
                        })),
                        { onConflict: 'id' }
                    );

                if (playersError) throw playersError;
            }

            // Import hall of fame
            if (data.hallOfFame.length > 0) {
                const { error: hofError } = await supabase
                    .from('hall_of_fame')
                    .upsert(
                        data.hallOfFame.map(h => ({
                            id: h.id,
                            team_name: h.teamName,
                            date: h.date
                        })),
                        { onConflict: 'id' }
                    );

                if (hofError) throw hofError;
            }

            // Import transactions
            if (data.transactions.length > 0) {
                const { error: transactionsError } = await supabase
                    .from('transactions')
                    .upsert(
                        data.transactions.map(t => ({
                            id: t.id,
                            player_id: t.playerId,
                            amount: t.amount,
                            description: t.description,
                            date: t.date,
                            type: t.type
                        })),
                        { onConflict: 'id' }
                    );

                if (transactionsError) throw transactionsError;
            }

            // Import tournaments (more complex due to nested structure)
            for (const tournament of data.tournaments) {
                // Insert tournament
                const { error: tournamentError } = await supabase
                    .from('tournaments')
                    .upsert({
                        id: tournament.id,
                        name: tournament.name,
                        date: tournament.date,
                        point_limit: tournament.pointLimit,
                        current_phase: tournament.currentPhase,
                        status: tournament.status
                    }, { onConflict: 'id' });

                if (tournamentError) throw tournamentError;

                // Insert teams
                if (tournament.teams.length > 0) {
                    const { error: teamsError } = await supabase
                        .from('teams')
                        .upsert(
                            tournament.teams.map(team => ({
                                id: team.id,
                                tournament_id: tournament.id,
                                player1_id: team.player1.id,
                                player2_id: team.player2.id
                            })),
                            { onConflict: 'id' }
                        );

                    if (teamsError) throw teamsError;
                }

                // Insert matches
                if (tournament.matches.length > 0) {
                    const { error: matchesError } = await supabase
                        .from('matches')
                        .upsert(
                            tournament.matches.map(match => ({
                                id: match.id,
                                tournament_id: tournament.id,
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
            }

            setStatus({ type: 'success', message: `Successfully imported ${data.players.length} players, ${data.tournaments.length} tournaments, ${data.transactions.length} transactions, and ${data.hallOfFame.length} hall of fame entries!` });
            onImportComplete();
        } catch (err) {
            console.error('Import error:', err);
            setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to import data' });
        } finally {
            setImporting(false);
            event.target.value = '';
        }
    };

    return (
        <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Data Migration</h3>

            {!isSupabaseConfigured() && (
                <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
                    <p className="text-amber-200 text-xs">
                        Supabase is not configured. You can still export data, but import requires Supabase credentials.
                    </p>
                </div>
            )}

            {status && (
                <div className={`rounded-lg p-3 flex items-start gap-2 ${status.type === 'success' ? 'bg-green-900/30 border border-green-700/50' :
                        status.type === 'error' ? 'bg-red-900/30 border border-red-700/50' :
                            'bg-blue-900/30 border border-blue-700/50'
                    }`}>
                    {status.type === 'success' ? (
                        <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                    ) : status.type === 'error' ? (
                        <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                    ) : (
                        <Loader2 className="text-blue-500 flex-shrink-0 mt-0.5 animate-spin" size={16} />
                    )}
                    <p className={`text-xs ${status.type === 'success' ? 'text-green-200' :
                            status.type === 'error' ? 'text-red-200' :
                                'text-blue-200'
                        }`}>
                        {status.message}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={handleExport}
                    className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-3 px-4 rounded-lg transition-colors"
                >
                    <Download size={18} />
                    <span className="text-sm font-medium">Export Data</span>
                </button>

                <label className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors cursor-pointer ${isSupabaseConfigured() && !importing
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}>
                    {importing ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Upload size={18} />
                    )}
                    <span className="text-sm font-medium">
                        {importing ? 'Importing...' : 'Import to Cloud'}
                    </span>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        disabled={!isSupabaseConfigured() || importing}
                        className="hidden"
                    />
                </label>
            </div>

            <p className="text-[10px] text-zinc-500 text-center">
                Export downloads your data as JSON. Import uploads it to Supabase cloud.
            </p>
        </div>
    );
};

export default DataMigration;
