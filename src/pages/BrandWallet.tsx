import React from 'react';
import { motion } from 'motion/react';
import { Wallet, Lock, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import BrandSidebar from '../components/BrandSidebar';
import TopBar from '../components/TopBar';
import { mockBrandWallet } from '../data/mock';

const appleEase = [0.16, 1, 0.3, 1];

export default function BrandWallet() {
  const { amountSpent, escrow, transactions } = mockBrandWallet;

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <BrandSidebar />
      <TopBar />
      
      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                Manage your connected wallet and track campaign escrow.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
            >
              <ConnectButton 
                chainStatus="icon" 
                showBalance={false} 
                accountStatus="full"
              />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Amount Spent Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
              className="glass-panel rounded-[2rem] p-8 border border-white/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/10 blur-[80px] rounded-full pointer-events-none"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-cyan" />
                  </div>
                  <h2 className="text-lg font-medium text-white">Amount Spent</h2>
                </div>
                <div className="text-5xl font-bold text-white tracking-tight mb-2">
                  ${(amountSpent || 0).toLocaleString()} <span className="text-xl text-muted font-medium">USDC</span>
                </div>
                <p className="text-sm text-cyan mt-6 font-medium">
                  Total amount spent on campaigns
                </p>
              </div>
            </motion.div>

            {/* Escrow Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.3 }}
              className="glass-panel rounded-[2rem] p-8 border border-white/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-medium text-white">Locked in Escrow</h2>
                </div>
                <div className="text-5xl font-bold text-white tracking-tight mb-2">
                  ${escrow.toLocaleString()} <span className="text-xl text-muted font-medium">USDC</span>
                </div>
                <p className="text-sm text-muted mt-8">
                  Funds currently locked in active campaigns. These will be released to creators upon approval.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Transaction History */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.4 }}
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
                    <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider">Campaign / Details</th>
                    <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider">Type</th>
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
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {tx.type === 'Funded' && <Lock className="w-4 h-4 text-purple-400" />}
                          {tx.type === 'Released' && <ArrowUpRight className="w-4 h-4 text-cyan" />}
                          {tx.type === 'Deposit' && <ArrowDownRight className="w-4 h-4 text-green-400" />}
                          <span className={`text-sm font-medium ${
                            tx.type === 'Funded' ? 'text-purple-400' : tx.type === 'Released' ? 'text-cyan' : 'text-green-400'
                          }`}>
                            {tx.type}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className={`font-semibold ${tx.type === 'Deposit' ? 'text-green-400' : 'text-white'}`}>
                          {tx.type === 'Deposit' ? '+' : ''}${tx.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-medium text-muted">
                          {tx.status === 'Completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Clock className="w-3.5 h-3.5" />}
                          {tx.status}
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
