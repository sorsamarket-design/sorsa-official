import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, CheckCircle2, DollarSign } from 'lucide-react';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import BindWalletButton from '../components/BindWalletButton';
import { useCreatorProfile } from '../hooks/useCreatorProfile';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const appleEase = [0.16, 1, 0.3, 1] as const;

function formatTxHash(hash?: string | null) {
  if (!hash) return '-';
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function getTxUrl(hash?: string | null) {
  if (!hash) return null;
  return `https://sepolia.basescan.org/tx/${hash}`;
}

export default function CreatorWallet() {
  const { user } = useAuth();
  const { profile } = useCreatorProfile();
  const [participations, setParticipations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchPayoutTransactions() {
      if (!user) {
        setParticipations([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('campaign_participants')
        .select(`
          *,
          campaign:campaigns (
            id,
            title
          )
        `)
        .eq('creator_id', user.id)
        .eq('status', 'paid')
        .not('payout_tx_hash', 'is', null)
        .order('paid_at', { ascending: false });

      if (!mounted) return;
      if (error) {
        console.error('Error fetching creator payout transactions:', error);
        setParticipations([]);
      } else {
        setParticipations(data || []);
      }
      setLoading(false);
    }

    fetchPayoutTransactions();
    return () => {
      mounted = false;
    };
  }, [user]);

  const totalEarned = Number(profile?.total_earned || 0);
  const transactions = participations.map(p => ({
    id: p.id,
    date: p.paid_at || p.approved_at || p.joined_at,
    campaign: p.campaign?.title || 'Campaign',
    amount: Number(p.calculated_reward || 0),
    status: 'Paid',
    txHash: p.payout_tx_hash,
    txUrl: getTxUrl(p.payout_tx_hash)
  }));
  return (
    <div className="flex min-h-screen bg-[#0A0A1E] font-sans text-[#F5F5F7] selection:bg-cyan/30">
      <CreatorSidebar />
      <CreatorTopBar embedded />

      <main className="creator-page-main flex-1 p-4 md:ml-64 md:p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase }}
              className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-white"
            >
              Wallet
            </motion.h1>
            <p className="mt-2 text-muted">Track confirmed onchain campaign payouts.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-6">
            <div className="glass-panel flex min-w-0 flex-col items-center rounded-2xl border border-white/10 p-4 text-center md:items-start md:rounded-[2rem] md:p-8 md:text-left">
              <div className="mb-3 flex flex-col items-center gap-2 md:mb-4 md:flex-row md:gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan/10 md:h-10 md:w-10">
                  <Wallet className="h-4 w-4 text-cyan md:h-5 md:w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-white md:text-lg">Bound Wallet</h2>
                  <p className="text-[0.68rem] text-muted md:text-xs">Permanent Address</p>
                </div>
              </div>
              <BindWalletButton />
            </div>

            <div className="glass-panel min-w-0 rounded-2xl border border-white/10 p-4 md:rounded-[2rem] md:p-8">
              <div className="mb-3 flex flex-col items-start gap-2 md:mb-4 md:flex-row md:items-center md:gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan/10 md:h-10 md:w-10">
                  <DollarSign className="h-4 w-4 text-cyan md:h-5 md:w-5" />
                </div>
                <h2 className="text-sm font-medium text-white md:text-lg">Total Earned</h2>
              </div>
              <div className="mb-2 break-words text-2xl font-bold tracking-tight text-white md:text-5xl">
                ${totalEarned.toLocaleString()} <span className="text-xs font-medium text-muted md:text-xl">USDC</span>
              </div>
              <p className="mt-4 text-xs text-muted md:mt-8 md:text-sm">Total confirmed USDC paid from campaigns.</p>
            </div>
          </div>

          <div className="glass-panel overflow-hidden rounded-[2rem] border border-white/10">
            <div className="border-b border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white">Transaction History</h2>
            </div>
            {loading ? (
              <div className="p-8 text-center text-muted">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-muted">No confirmed creator payout transactions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted">Date</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted">Campaign</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted">Transaction Hash</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted">Amount</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 text-sm text-muted">{new Date(tx.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-medium text-white">{tx.campaign}</td>
                        <td className="px-6 py-4 font-mono text-sm text-cyan">
                          {tx.txUrl ? (
                            <a href={tx.txUrl} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-white hover:underline" title={tx.txHash}>
                              {formatTxHash(tx.txHash)}
                            </a>
                          ) : (
                            formatTxHash(tx.txHash)
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-cyan">+${tx.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
