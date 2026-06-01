import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, CheckCircle2, Users, Star, ArrowRight, X } from 'lucide-react';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';

const appleEase = [0.16, 1, 0.3, 1];

export default function CreatorReferral() {
  const [copied, setCopied] = useState(false);
  const [showPointScale, setShowPointScale] = useState(false);
  const referralLink = "https://sorsa.market/ref/crypto_khalid";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mockReferrals = [
    { id: 1, username: '@nft_sarah', score: 120, date: 'April 5, 2026', status: 'Active', points: 50 },
    { id: 2, username: '@defi_degen', score: 0, date: 'April 2, 2026', status: 'Awaiting Participation', points: '-' },
    { id: 3, username: '@web3_guru', score: 450, date: 'March 28, 2026', status: 'Active', points: 150 },
  ];

  const pointScale = [
    { scoreRange: '0 - 100', points: 10 },
    { scoreRange: '101 - 250', points: 50 },
    { scoreRange: '251 - 500', points: 150 },
    { scoreRange: '501 - 750', points: 300 },
    { scoreRange: '751 - 1000', points: 500 },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <CreatorTopBar />
      
      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase }}
            className="glass-panel rounded-[2rem] p-8 md:p-12 border border-white/10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan/10 blur-[120px] rounded-full pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex-1 space-y-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-2">Refer and Earn</h1>
                  <p className="text-muted text-lg leading-relaxed">
                    Invite new creators using your referral link. They'll earn points after completing a campaign, and you'll earn points based on their Sorsa Score.
                  </p>
                </div>

                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'Copied!' : 'Generate & copy Referral link'}
                </button>

                <div className="flex gap-4 pt-4">
                  <div className="glass-panel rounded-2xl p-5 border border-white/10 flex-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10"><Star className="w-12 h-12" /></div>
                    <div className="text-3xl font-bold text-cyan mb-1">200</div>
                    <div className="text-sm text-muted font-medium">Total Points from Referral</div>
                  </div>
                  <div className="glass-panel rounded-2xl p-5 border border-white/10 flex-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10"><Users className="w-12 h-12" /></div>
                    <div className="text-3xl font-bold text-white mb-1">2</div>
                    <div className="text-sm text-muted font-medium">Eligible Referrals</div>
                  </div>
                </div>
              </div>

              {/* Illustration Placeholder */}
              <div className="w-64 h-64 shrink-0 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan/20 to-purple/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Users className="w-32 h-32 text-white/80 drop-shadow-[0_0_15px_rgba(0,212,255,0.5)]" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Check User Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Check Last 30 Days Referrals</h2>
              <button 
                onClick={() => setShowPointScale(true)}
                className="text-sm text-cyan hover:underline"
              >
                Point System
              </button>
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Type a username..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-6 pr-16 py-4 text-white focus:outline-none focus:border-cyan/50 transition-colors"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Referral Activity Table */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-cyan mb-4">Referral Activity</h2>
            <div className="glass-panel rounded-[2rem] overflow-hidden border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Username</th>
                      <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Sorsa Score</th>
                      <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Referred on</th>
                      <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                      <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {mockReferrals.map((ref) => (
                      <tr key={ref.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-6 text-white font-medium">{ref.username}</td>
                        <td className="p-6 text-white">{ref.score}</td>
                        <td className="p-6 text-muted">{ref.date}</td>
                        <td className="p-6">
                          <span className={`text-sm font-medium ${
                            ref.status === 'Active' ? 'text-green-400' : 'text-yellow-400'
                          }`}>
                            {ref.status}
                          </span>
                        </td>
                        <td className="p-6 text-right text-white font-semibold">{ref.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      {/* Point Scale Modal */}
      <AnimatePresence>
        {showPointScale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPointScale(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: appleEase }}
              className="relative w-full max-w-md glass-panel rounded-[2rem] p-8 border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan/10 blur-[60px] rounded-full pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-xl font-semibold text-white">Referral Point Scale</h3>
                <button 
                  onClick={() => setShowPointScale(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-muted hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                <p className="text-sm text-muted mb-4">
                  You earn points based on the Sorsa Score of the creators you refer, once they complete their first campaign.
                </p>
                
                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider">Referred User Score</th>
                        <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider text-right">Points Earned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pointScale.map((tier, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-sm text-white font-medium">{tier.scoreRange}</td>
                          <td className="py-3 px-4 text-sm text-cyan font-semibold text-right">+{tier.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
