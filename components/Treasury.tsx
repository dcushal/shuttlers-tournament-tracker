
import React, { useState, useMemo } from 'react';
import { Player, Transaction } from '../types';
import { Wallet, Plus, Receipt, UserCheck, Users, Trash2, CheckCircle, IndianRupee, History, UserPlus } from 'lucide-react';

interface Props {
  players: Player[];
  checkedInIds: string[];
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  user: { role: 'admin' | 'member'; name: string };
}

const Treasury: React.FC<Props> = ({ players, checkedInIds, transactions, setTransactions, user }) => {
  const [amount, setAmount] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [manualPayerId, setManualPayerId] = useState('');
  const [manualAmount, setManualAmount] = useState('');

  const ledger = useMemo(() => {
    const balances: Record<string, number> = {};
    players.forEach(p => balances[p.id] = 0);
    transactions.forEach(t => {
      if (balances[t.playerId] !== undefined) {
        balances[t.playerId] += t.amount;
      }
    });
    return balances;
  }, [players, transactions]);

  const addShuttleExpense = () => {
    const total = parseFloat(amount);
    if (isNaN(total) || total <= 0) return;
    if (!buyerId) {
      alert("Please select who purchased the box.");
      return;
    }

    const targetIds = players.map(p => p.id);
    if (targetIds.length === 0) {
      alert("No players available for splitting.");
      return;
    }

    const buyerName = players.find(p => p.id === buyerId)?.name || "Member";
    const perHead = Math.ceil(total / targetIds.length);

    const creditTransaction: Transaction = {
      id: crypto.randomUUID(),
      playerId: buyerId,
      amount: -total,
      description: `Purchased Shuttle Box`,
      date: new Date().toISOString(),
      type: 'payment'
    };

    const debtTransactions: Transaction[] = targetIds.map(pid => ({
      id: crypto.randomUUID(),
      playerId: pid,
      amount: perHead,
      description: `Split for box bought by ${buyerName}`,
      date: new Date().toISOString(),
      type: 'expense'
    }));

    setTransactions(prev => [...prev, creditTransaction, ...debtTransactions]);
    setAmount('');
    setBuyerId('');
  };

  const settlePlayer = (playerId: string) => {
    const balance = ledger[playerId];
    if (balance <= 0) return;

    const purchaserId = Object.entries(ledger)
      .sort((a, b) => a[1] - b[1])[0]?.[0];

    const payerPayment: Transaction = {
      id: crypto.randomUUID(),
      playerId,
      amount: -balance,
      description: "Settled Dues",
      date: new Date().toISOString(),
      type: 'payment'
    };

    const newTransactions = [payerPayment];

    if (purchaserId && purchaserId !== playerId) {
      newTransactions.push({
        id: crypto.randomUUID(),
        playerId: purchaserId,
        amount: balance,
        description: `Collection from ${players.find(p => p.id === playerId)?.name}`,
        date: new Date().toISOString(),
        type: 'expense' // Re-using expense type for receiving back money (increasing balance)
      });
    }

    setTransactions(prev => [...prev, ...newTransactions]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addManualPayment = () => {
    const val = parseFloat(manualAmount);
    if (isNaN(val) || val <= 0 || !manualPayerId) return;

    const purchaserId = Object.entries(ledger)
      .sort((a, b) => a[1] - b[1])[0]?.[0];

    const payerPayment: Transaction = {
      id: crypto.randomUUID(),
      playerId: manualPayerId,
      amount: -val,
      description: "Manual Payment Entry",
      date: new Date().toISOString(),
      type: 'payment'
    };

    const newTransactions = [payerPayment];

    if (purchaserId && purchaserId !== manualPayerId) {
      newTransactions.push({
        id: crypto.randomUUID(),
        playerId: purchaserId,
        amount: val,
        description: `Manual Collection from ${players.find(p => p.id === manualPayerId)?.name}`,
        date: new Date().toISOString(),
        type: 'expense'
      });
    }

    setTransactions(prev => [...prev, ...newTransactions]);
    setManualAmount('');
    setManualPayerId('');
  };

  // Filter players for Member View
  const visiblePlayers = user.role === 'admin'
    ? players
    : players.filter(p => p.name === user.name);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
          <Wallet size={22} className="text-green-500" /> Club Treasury
        </h2>
      </div>

      {/* Admin Only: Log Expense Card */}
      {user.role === 'admin' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Receipt size={64} className="text-green-500" />
          </div>

          <div className="space-y-4 relative z-10">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Log Shuttle Box Purchase</p>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-zinc-600 uppercase ml-2 flex items-center gap-1">
                  <UserPlus size={10} /> Purchased By
                </label>
                <select
                  value={buyerId}
                  onChange={(e) => setBuyerId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-4 text-sm font-bold text-white focus:outline-none focus:border-green-500 transition-all appearance-none"
                >
                  <option value="" className="text-zinc-700">Select Purchaser...</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-[8px] font-black text-zinc-600 uppercase ml-2">Total Amount (₹)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-10 pr-4 text-xl font-black text-white focus:outline-none focus:border-green-500 transition-all"
                    />
                    <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={addShuttleExpense}
                disabled={!amount || !buyerId}
                className="w-full bg-green-500 text-zinc-950 py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-20 hover:bg-green-400 active:scale-95 transition-all shadow-xl shadow-green-500/10"
              >
                Log & Split <Plus size={16} strokeWidth={3} />
              </button>
            </div>

            <p className="text-[8px] text-zinc-600 font-bold uppercase text-center">
              Per Head: ₹{amount ? Math.ceil(parseFloat(amount) / players.length) : 0}
              ({players.length} members)
            </p>
          </div>
        </div>
      )}

      {/* Admin Only: Manual Payment Card */}
      {user.role === 'admin' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <UserCheck size={64} className="text-blue-500" />
          </div>

          <div className="space-y-4 relative z-10">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Manual Payment record</p>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-zinc-600 uppercase ml-2 flex items-center gap-1">
                  Member
                </label>
                <select
                  value={manualPayerId}
                  onChange={(e) => setManualPayerId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="" className="text-zinc-700">Select Member...</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-zinc-600 uppercase ml-2">Amount Paid (₹)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-10 pr-4 text-xl font-black text-white focus:outline-none focus:border-blue-500 transition-all"
                  />
                  <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                </div>
              </div>
            </div>

            <button
              onClick={addManualPayment}
              disabled={!manualAmount || !manualPayerId}
              className="w-full bg-blue-500 text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-20 hover:bg-blue-400 active:scale-95 transition-all shadow-xl shadow-blue-500/10"
            >
              Record Payment <CheckCircle size={16} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}

      {/* Balance List */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">Member Ledger</h3>
        <div className="space-y-2">
          {visiblePlayers.map(player => {
            const balance = ledger[player.id];
            return (
              <div key={player.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${balance > 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                    }`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white uppercase">{player.name}</p>
                    <p className={`text-[10px] font-black uppercase ${balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {balance > 0 ? `Owes ₹${balance}` : balance < 0 ? `Credit ₹${Math.abs(balance)}` : 'Settled'}
                    </p>
                  </div>
                </div>
                {user.role === 'admin' && balance > 0 && (
                  <button
                    onClick={() => settlePlayer(player.id)}
                    className="bg-zinc-800 hover:bg-green-500 hover:text-zinc-950 text-zinc-500 p-2.5 rounded-xl transition-all active:scale-95 shadow-sm"
                    title="Mark Paid"
                  >
                    <CheckCircle size={18} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {user.role === 'admin' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden">
          <div className="bg-zinc-950 p-4 border-b border-zinc-800 flex justify-between items-center">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <History size={14} /> Transaction History
            </h3>
          </div>
          <div className="divide-y divide-zinc-800 max-h-60 overflow-y-auto scrollbar-hide">
            {transactions.slice().reverse().map(t => {
              const player = players.find(p => p.id === t.playerId);
              return (
                <div key={t.id} className="p-4 flex items-center justify-between group hover:bg-zinc-950/40 transition-colors">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-white uppercase">{player?.name || 'Unknown'}</p>
                    <p className="text-[8px] text-zinc-600 font-bold uppercase">{t.description} • {new Date(t.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black ${t.amount > 0 ? 'text-red-400' : 'text-green-500'}`}>
                      {t.amount > 0 ? `+₹${t.amount}` : `-₹${Math.abs(t.amount)}`}
                    </span>
                    <button onClick={() => deleteTransaction(t.id)} className="text-zinc-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Treasury;
