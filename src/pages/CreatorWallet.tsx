import React from 'react';
import { motion } from 'motion/react';
import { Wallet, ArrowUpRight, Clock, CheckCircle2, DollarSign } from 'lucide-react';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import { mockCreatorWallet } from '../data/mock';
import BindWalletButton from '../components/BindWalletButton';

const appleEase = [0.16, 1, 0.3, 1];

export default function CreatorWallet() {
  const { totalEarned, pendingRewards, transactions } = mockCreatorWallet;

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <CreatorTopBar />
      
      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
                className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3"
              >
                <Wallet className="w-8 h-8 text-cyan" /> Wallet
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
                className="text-muted mt-2"
              >
                Track your earnings and manage your connected wallet.
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
              className="flex flex-col items-end"
            >
              <div className="glass-panel rounded-2xl p-4 border border-white/10 flex flex-col gap-2 items-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-cyan/10 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5 text-cyan" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">Binded Wallet</h3>
                    <p className="text-xs text-muted">Permanent Address</p>
                  </div>
                </div>
                <BindWalletButton />
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Total Earned Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.3 }}
              className="glass-panel rounded-[2rem] p-8 border border-white/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/10 blur-[80px] rounded-full pointer-events-none"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-cyan" />
                  </div>
                  <h2 className="text-lg font-medium text-white">Total Earned (Lifetime)</h2>
                </div>
                <div className="text-5xl font-bold text-white tracking-tight mb-2">
                  ${totalEarned.toLocaleString()} <span className="text-xl text-muted font-medium">USDC</span>
                </div>
                <p className="text-sm text-muted mt-8">
                  Total USDC earned across all completed campaigns on SorsaMarket.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Transaction History */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.5 }}
            className="glass-panel rounded-[2rem] border border-white/10 overflow-hidden"
          >
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Transaction History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
                    <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider">Campaign</th>
                    <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider text-right">Amount</th>
                    <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="transition-colors hover:bg-white/5">
                      <td className="py-4 px-6 text-sm text-muted">
                        {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-medium text-white">{tx.campaign}</span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className={`font-semibold ${tx.status === 'Released' ? 'text-cyan' : 'text-white'}`}>
                          +${tx.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${
                          tx.status === 'Released' 
                            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                        }`}>
                          {tx.status === 'Released' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {tx.status === 'Released' ? 'Paid' : tx.status}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
