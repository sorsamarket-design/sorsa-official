import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, CheckCircle2, Clock, Trophy, DollarSign, Target, Star, ArrowUpRight, Zap, Megaphone } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import BindWalletButton from '../components/BindWalletButton';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';

const appleEase = [0.16, 1, 0.3, 1];

const mockActiveCampaigns = [
  { id: '1', name: 'Summer Collection Launch', brand: 'Nike', deadline: '2 Days', status: 'Pending Review' },
  { id: '2', name: 'DeFi Protocol V2', brand: 'Aave', deadline: '5 Days', status: 'Drafting' },
];

const mockRecentPoints = [
  { id: '1', title: 'Campaign Completed', desc: 'Fitness App Collab', points: '+250', date: 'Today', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
  { id: '2', title: 'High Impression Bonus', desc: 'Over 50k views reached', points: '+100', date: 'Yesterday', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { id: '3', title: 'Daily Login', desc: 'Consecutive streak: 5 days', points: '+10', date: 'Yesterday', icon: Star, color: 'text-cyan', bg: 'bg-cyan/10' },
];

import { useCreatorProfile } from '../hooks/useCreatorProfile';

export default function CreatorDashboard() {
  const { profile, loading } = useCreatorProfile();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A1E] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan/20 border-t-cyan rounded-full animate-spin mb-4"></div>
        <p className="text-white/60 animate-pulse font-medium tracking-wide">Syncing your Sorsa profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <CreatorTopBar />
      
      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header & Wallet */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
                className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3"
              >
                Welcome back, {profile?.x_handle || 'Creator'}
              </motion.h1>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
              className="flex flex-col items-end"
            >
              <BindWalletButton />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Score & Stats */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Sorsa Score Banner */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.3 }}
                className="glass-panel rounded-[2rem] p-8 border border-white/10 relative overflow-hidden flex items-center justify-between"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/10 blur-[100px] rounded-full pointer-events-none"></div>
                
                <div className="relative z-10">
                  <h2 className="text-lg font-medium text-white mb-1">Your Sorsa Score</h2>
                  <p className="text-muted text-sm max-w-sm mb-6">Sorsa score is a measures of the strength of your influence by analyzing who follows you and not just how many, but how impactful they are. It prioritizes high-value connections across leading crypto voices, projects, and VC networks, where quality outweighs quantity.</p>
                  <button className="text-cyan text-sm font-semibold flex items-center gap-1 hover:underline">
                    How is this calculated? <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative z-10 flex items-center justify-center shrink-0">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                    <circle 
                      cx="64" cy="64" r="56" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="351.86" 
                      strokeDashoffset={351.86 - (351.86 * (profile?.sorsa_score || 0)) / 1000} 
                      className="text-cyan drop-shadow-[0_0_10px_rgba(0,212,255,0.5)]" 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white tracking-tighter">{Math.round(profile?.sorsa_score || 0)}</span>
                    <span className="text-[10px] text-cyan font-medium uppercase tracking-wider">
                      {profile?.sorsa_score >= 800 ? 'Elite' : profile?.sorsa_score >= 500 ? 'Pro' : 'Emerging'}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Stat Cards */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.4 }}
                className="grid grid-cols-2 gap-4"
              >
                <div className="glass-panel rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-2 text-muted text-sm font-medium mb-3">
                    <Target className="w-4 h-4" /> Campaigns Completed
                  </div>
                  <div className="text-3xl font-semibold text-white tracking-tight">{profile?.campaigns_completed || 0}</div>
                </div>
                <div className="glass-panel rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-2 text-muted text-sm font-medium mb-3 uppercase tracking-wider">
                    <DollarSign className="w-4 h-4" /> Total Earned
                  </div>
                  <div className="text-3xl font-semibold text-white tracking-tight">${profile?.total_earned?.toLocaleString() || '0'}</div>
                </div>
                <div className="glass-panel rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-2 text-muted text-sm font-medium mb-3 uppercase tracking-wider">
                    <Star className="w-4 h-4" /> Sorsa Points
                  </div>
                  <div className="text-3xl font-semibold text-white tracking-tight">{profile?.sorsa_points?.toLocaleString() || 0}</div>
                </div>
                <div className="glass-panel rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-2 text-muted text-sm font-medium mb-3 uppercase tracking-wider">
                    <Trophy className="w-4 h-4" /> Ranking
                  </div>
                  <div className="text-3xl font-semibold text-white tracking-tight">#{profile?.rank || '—'}</div>
                </div>
              </motion.div>

              {/* Active Campaigns */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.5 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Active Campaigns</h2>
                  <button className="text-sm text-cyan hover:underline">View All</button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {mockActiveCampaigns.map(campaign => (
                    <div key={campaign.id} className="glass-panel rounded-2xl p-5 border border-white/10 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                          <Megaphone className="w-5 h-5 text-muted" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{campaign.name}</h3>
                          <p className="text-sm text-muted">{campaign.brand}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Deadline</p>
                          <p className="text-sm text-white flex items-center gap-1"><Clock className="w-3 h-3" /> {campaign.deadline}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Status</p>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-medium inline-block ${
                            campaign.status === 'Pending Review' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-white/10 text-white border border-white/20'
                          }`}>
                            {campaign.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

            </div>

            {/* Right Column: Recent Points */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.6 }}
              className="glass-panel rounded-[2rem] p-6 border border-white/10 h-fit"
            >
              <h2 className="text-xl font-semibold text-white mb-6">Recent Points</h2>
              <div className="space-y-6">
                {mockRecentPoints.map(point => (
                  <div key={point.id} className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${point.bg}`}>
                      <point.icon className={`w-5 h-5 ${point.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-white text-sm">{point.title}</h4>
                        <span className={`font-bold ${point.color}`}>{point.points}</span>
                      </div>
                      <p className="text-xs text-muted mb-1">{point.desc}</p>
                      <p className="text-[10px] text-muted/60 uppercase tracking-wider">{point.date}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                View Point History
              </button>
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  );
}
