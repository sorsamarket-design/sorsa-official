import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Star, Target, DollarSign, ArrowUpRight, Loader2 } from 'lucide-react';

import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import { useLeaderboard } from '../hooks/useLeaderboard';

const appleEase = [0.16, 1, 0.3, 1];

type SortType = 'sorsaScore' | 'points' | 'campaignsCompleted';

export default function Leaderboard() {
  const [activeSort, setActiveSort] = useState<SortType>('sorsaScore');
  const { leaderboard, loading, currentUserId } = useLeaderboard();

  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => b[activeSort] - a[activeSort]);
  }, [activeSort, leaderboard]);

  const top3 = sortedLeaderboard.slice(0, 3);
  const rest = sortedLeaderboard.slice(3);

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]'; // Gold
      case 1: return 'text-gray-300 drop-shadow-[0_0_10px_rgba(209,213,219,0.5)]'; // Silver
      case 2: return 'text-amber-600 drop-shadow-[0_0_10px_rgba(217,119,6,0.5)]'; // Bronze
      default: return 'text-muted';
    }
  };

  const getSortLabel = (sort: SortType) => {
    switch (sort) {
      case 'points': return 'Activity Points';
      case 'campaignsCompleted': return 'Campaigns';
      case 'sorsaScore':
      default: return 'Sorsa Score';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <CreatorTopBar />
      
      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* Header & Toggles */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
                className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3"
              >
                <Trophy className="w-8 h-8 text-cyan" /> Leaderboard
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
                className="text-muted mt-2"
              >
                Top creators ranked by {getSortLabel(activeSort).toLowerCase()}.
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
              className="flex bg-white/5 rounded-xl p-1 border border-white/10"
            >
              <button
                onClick={() => setActiveSort('sorsaScore')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSort === 'sorsaScore' ? 'bg-white/10 text-white shadow-sm' : 'text-muted hover:text-white'
                }`}
              >
                By Sorsa Score
              </button>
              <button
                onClick={() => setActiveSort('points')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSort === 'points' ? 'bg-white/10 text-white shadow-sm' : 'text-muted hover:text-white'
                }`}
              >
                By Activity Points
              </button>
              <button
                onClick={() => setActiveSort('campaignsCompleted')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSort === 'campaignsCompleted' ? 'bg-white/10 text-white shadow-sm' : 'text-muted hover:text-white'
                }`}
              >
                By Campaigns
              </button>
            </motion.div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 text-cyan animate-spin mb-4" />
              <p className="text-muted">Loading leaderboard data...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 border border-white/10 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8 text-muted" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No creators found</h3>
              <p className="text-muted">There are no creators on the platform yet.</p>
            </div>
          ) : (
            <>
              {/* Top 3 Hero Display */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end"
              >
                {/* 2nd Place */}
                {top3[1] ? (
                  <div className="order-2 md:order-1 glass-panel rounded-[2rem] p-6 border border-white/10 flex flex-col items-center text-center relative overflow-hidden h-[280px] justify-end pb-8">
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-gray-300/10 to-transparent pointer-events-none"></div>
                    <Medal className={`w-10 h-10 mb-4 ${getMedalColor(1)}`} />
                    <a href={`https://x.com/${top3[1].handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="relative group mb-3">
                      <img src={top3[1].avatar} alt={top3[1].handle} className="w-20 h-20 rounded-full border-2 border-gray-300/50 object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ArrowUpRight className="w-5 h-5 text-white" />
                      </div>
                    </a>
                    <h3 className="text-lg font-semibold text-white">{top3[1].handle}</h3>
                    <p className="text-2xl font-bold text-cyan mt-2">{top3[1][activeSort].toLocaleString()}</p>
                    <p className="text-xs text-muted font-medium uppercase tracking-wider mt-1">{getSortLabel(activeSort)}</p>
                  </div>
                ) : <div className="order-2 md:order-1 hidden md:block"></div>}

                {/* 1st Place */}
                {top3[0] && (
                  <div className="order-1 md:order-2 glass-panel rounded-[2rem] p-8 border border-cyan/30 flex flex-col items-center text-center relative overflow-hidden h-[320px] justify-end pb-10 shadow-[0_0_30px_rgba(0,212,255,0.1)]">
                    <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-yellow-400/20 to-transparent pointer-events-none"></div>
                    <Medal className={`w-14 h-14 mb-4 ${getMedalColor(0)}`} />
                    <a href={`https://x.com/${top3[0].handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="relative group mb-4">
                      <img src={top3[0].avatar} alt={top3[0].handle} className="w-24 h-24 rounded-full border-4 border-yellow-400/50 object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ArrowUpRight className="w-6 h-6 text-white" />
                      </div>
                    </a>
                    <h3 className="text-xl font-bold text-white">{top3[0].handle}</h3>
                    <p className="text-3xl font-bold text-cyan mt-2">{top3[0][activeSort].toLocaleString()}</p>
                    <p className="text-xs text-muted font-medium uppercase tracking-wider mt-1">{getSortLabel(activeSort)}</p>
                  </div>
                )}

                {/* 3rd Place */}
                {top3[2] ? (
                  <div className="order-3 md:order-3 glass-panel rounded-[2rem] p-6 border border-white/10 flex flex-col items-center text-center relative overflow-hidden h-[260px] justify-end pb-6">
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-amber-600/10 to-transparent pointer-events-none"></div>
                    <Medal className={`w-8 h-8 mb-4 ${getMedalColor(2)}`} />
                    <a href={`https://x.com/${top3[2].handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="relative group mb-3">
                      <img src={top3[2].avatar} alt={top3[2].handle} className="w-16 h-16 rounded-full border-2 border-amber-600/50 object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ArrowUpRight className="w-4 h-4 text-white" />
                      </div>
                    </a>
                    <h3 className="text-base font-semibold text-white">{top3[2].handle}</h3>
                    <p className="text-xl font-bold text-cyan mt-2">{top3[2][activeSort].toLocaleString()}</p>
                    <p className="text-[10px] text-muted font-medium uppercase tracking-wider mt-1">{getSortLabel(activeSort)}</p>
                  </div>
                ) : <div className="order-3 md:order-3 hidden md:block"></div>}
              </motion.div>

              {/* Full Ranked Table */}
              {rest.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: appleEase, delay: 0.4 }}
                  className="glass-panel rounded-[2rem] border border-white/10 overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                          <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider w-20 text-center">Rank</th>
                          <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider">Creator</th>
                          <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider text-right">
                            <div className="flex items-center justify-end gap-1.5"><Star className="w-3.5 h-3.5" /> Sorsa Score</div>
                          </th>
                          <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider text-right">
                            <div className="flex items-center justify-end gap-1.5"><Target className="w-3.5 h-3.5" /> Activity Points</div>
                          </th>
                          <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider text-right">
                            <div className="flex items-center justify-end gap-1.5"><Trophy className="w-3.5 h-3.5" /> Campaigns</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {rest.map((creator, index) => {
                          const rank = index + 4; // Since top 3 are extracted
                          const isCurrentUser = creator.id === currentUserId;

                          return (
                            <tr 
                              key={creator.id} 
                              className={`transition-colors hover:bg-white/5 ${isCurrentUser ? 'bg-cyan/10 relative' : ''}`}
                            >
                              {isCurrentUser && (
                                <td className="absolute left-0 top-0 bottom-0 w-1 bg-cyan"></td>
                              )}
                              <td className="py-4 px-6 text-center">
                                <span className={`text-sm font-bold ${isCurrentUser ? 'text-cyan' : 'text-muted'}`}>#{rank}</span>
                              </td>
                              <td className="py-4 px-6">
                                <a href={`https://x.com/${creator.handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group w-max">
                                  <img src={creator.avatar} alt={creator.handle} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                                  <span className={`font-medium transition-colors ${isCurrentUser ? 'text-cyan' : 'text-white group-hover:text-cyan'}`}>
                                    {creator.handle}
                                  </span>
                                </a>
                              </td>
                              <td className={`py-4 px-6 text-right font-semibold ${activeSort === 'sorsaScore' ? 'text-cyan' : 'text-white'}`}>
                                {creator.sorsaScore}
                              </td>
                              <td className={`py-4 px-6 text-right font-semibold ${activeSort === 'points' ? 'text-cyan' : 'text-white'}`}>
                                {creator.points.toLocaleString()}
                              </td>
                              <td className={`py-4 px-6 text-right font-semibold ${activeSort === 'campaignsCompleted' ? 'text-cyan' : 'text-white'}`}>
                                {creator.campaignsCompleted}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
}
