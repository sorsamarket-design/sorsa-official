import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Star, Target, ArrowUpRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import { useLeaderboard } from '../hooks/useLeaderboard';
import CreatorAvatar from '../components/CreatorAvatar';

const appleEase = [0.16, 1, 0.3, 1] as const;

type SortType = 'sorsaScore' | 'points' | 'campaignsCompleted';
const MOBILE_PAGE_SIZE = 20;

export default function Leaderboard() {
  const [activeSort, setActiveSort] = useState<SortType>('sorsaScore');
  const [currentPage, setCurrentPage] = useState(1);
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const { leaderboard, loading, currentUserId } = useLeaderboard();

  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => b[activeSort] - a[activeSort]);
  }, [activeSort, leaderboard]);

  const top3 = sortedLeaderboard.slice(0, 3);
  const rest = sortedLeaderboard.slice(3);
  const totalPages = Math.max(1, Math.ceil(sortedLeaderboard.length / MOBILE_PAGE_SIZE));
  const mobilePageItems = useMemo(() => {
    const pageStart = (currentPage - 1) * MOBILE_PAGE_SIZE;

    return sortedLeaderboard
      .slice(pageStart, pageStart + MOBILE_PAGE_SIZE)
      .map((creator, index) => ({
        creator,
        rank: pageStart + index + 1,
      }))
      .filter(({ rank }) => rank > 3);
  }, [currentPage, sortedLeaderboard]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSortChange = (sort: SortType) => {
    setActiveSort(sort);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);

    if (nextPage === currentPage) return;

    setCurrentPage(nextPage);
    window.setTimeout(() => {
      listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

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
      <main className="creator-page-main flex-1 min-w-0 md:ml-64 p-3 sm:p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-12">
          
          {/* Header & Toggles */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
                className="text-2xl md:text-3xl font-semibold tracking-tight text-white flex items-center gap-2.5 md:gap-3"
              >
                <Trophy className="w-6 h-6 md:w-8 md:h-8 text-cyan" /> Leaderboard
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

            <div className="flex w-full items-center gap-3 md:w-auto">
              <CreatorTopBar embedded />
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
                className="grid min-w-0 flex-1 grid-cols-3 bg-white/5 rounded-xl p-1 border border-white/10 md:flex-none"
              >
              <button
                onClick={() => handleSortChange('sorsaScore')}
                className={`min-w-0 px-2 sm:px-3 md:px-4 py-2 rounded-lg text-[11px] sm:text-xs md:text-sm leading-tight font-medium transition-all ${
                  activeSort === 'sorsaScore' ? 'bg-white/10 text-white shadow-sm' : 'text-muted hover:text-white'
                }`}
              >
                <span className="sm:hidden">Score</span>
                <span className="hidden sm:inline">By Sorsa Score</span>
              </button>
              <button
                onClick={() => handleSortChange('points')}
                className={`min-w-0 px-2 sm:px-3 md:px-4 py-2 rounded-lg text-[11px] sm:text-xs md:text-sm leading-tight font-medium transition-all ${
                  activeSort === 'points' ? 'bg-white/10 text-white shadow-sm' : 'text-muted hover:text-white'
                }`}
              >
                <span className="sm:hidden">Activity</span>
                <span className="hidden sm:inline">By Activity Points</span>
              </button>
              <button
                onClick={() => handleSortChange('campaignsCompleted')}
                className={`min-w-0 px-2 sm:px-3 md:px-4 py-2 rounded-lg text-[11px] sm:text-xs md:text-sm leading-tight font-medium transition-all ${
                  activeSort === 'campaignsCompleted' ? 'bg-white/10 text-white shadow-sm' : 'text-muted hover:text-white'
                }`}
              >
                <span className="sm:hidden">Campaigns</span>
                <span className="hidden sm:inline">By Campaigns</span>
              </button>
              </motion.div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[260px] md:min-h-[400px]">
              <Loader2 className="w-8 h-8 text-cyan animate-spin mb-4" />
              <p className="text-muted">Loading leaderboard data...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 md:p-12 border border-white/10 text-center flex flex-col items-center justify-center min-h-[260px] md:min-h-[400px]">
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
                className="flex items-stretch gap-2 md:grid md:grid-cols-3 md:items-end md:gap-6"
              >
                {/* 2nd Place */}
                {top3[1] ? (
                  <div className="order-1 flex min-w-0 flex-1 items-end md:order-1 md:block">
                    <div className="glass-panel relative flex h-[170px] w-full flex-col items-center justify-center overflow-hidden rounded-[14px] border border-[#1f2937] px-2 py-3 text-center md:h-[280px] md:justify-end md:rounded-[2rem] md:border-white/10 md:p-6 md:pb-8">
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-gray-300/10 to-transparent pointer-events-none"></div>
                    <Medal aria-label="Second place" className={`relative mb-1 h-[1.1rem] w-[1.1rem] md:mb-4 md:h-10 md:w-10 ${getMedalColor(1)}`} />
                    <a href={`https://x.com/${top3[1].handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="relative group mb-2 md:mb-3">
                      <CreatorAvatar src={top3[1].avatar} name={top3[1].handle} alt={top3[1].handle} className="h-10 w-10 rounded-full border-2 border-gray-300/50 object-cover md:h-20 md:w-20" />
                      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ArrowUpRight className="w-5 h-5 text-white" />
                      </div>
                    </a>
                    <h3 className="relative w-full truncate text-[0.72rem] font-semibold text-white md:text-lg">{top3[1].handle}</h3>
                    <p className="relative mt-1 text-[0.95rem] font-bold tabular-nums text-cyan md:mt-2 md:text-2xl">{top3[1][activeSort].toLocaleString()}</p>
                    <p className="relative mt-1 text-[0.52rem] font-medium uppercase tracking-[0.08em] text-muted md:text-xs md:tracking-wider">{getSortLabel(activeSort)}</p>
                    </div>
                  </div>
                ) : <div className="order-1 hidden flex-1 md:block"></div>}

                {/* 1st Place */}
                {top3[0] && (
                  <div className="order-2 flex min-w-0 flex-1 items-end md:block">
                  <div className="glass-panel relative flex min-h-[210px] w-full flex-col items-center justify-center overflow-hidden rounded-[14px] border border-[#f59e0b44] px-2 py-3 text-center shadow-[0_0_24px_rgba(245,158,11,0.12)] md:h-[320px] md:justify-end md:rounded-[2rem] md:border-cyan/30 md:p-8 md:pb-10 md:shadow-none">
                    <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-yellow-400/20 to-transparent pointer-events-none"></div>
                    <Medal aria-label="First place" className={`relative mb-2 h-6 w-6 md:mb-4 md:h-14 md:w-14 ${getMedalColor(0)}`} />
                    <a href={`https://x.com/${top3[0].handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="relative group mb-3 md:mb-4">
                      <CreatorAvatar src={top3[0].avatar} name={top3[0].handle} alt={top3[0].handle} className="h-14 w-14 rounded-full border-[3px] border-yellow-400/50 object-cover md:h-24 md:w-24 md:border-4" />
                      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ArrowUpRight className="w-6 h-6 text-white" />
                      </div>
                    </a>
                    <h3 className="relative w-full truncate px-1 text-[0.78rem] font-bold leading-tight text-white md:min-h-7 md:text-xl md:leading-7">
                      {top3[0].handle}
                    </h3>
                    <p className="relative mt-1 text-[1.2rem] font-bold tabular-nums text-cyan md:mt-2 md:text-3xl">{top3[0][activeSort].toLocaleString()}</p>
                    <p className="relative mt-1 text-[0.55rem] font-medium uppercase tracking-[0.08em] text-muted md:text-xs md:tracking-wider">{getSortLabel(activeSort)}</p>
                  </div>
                  </div>
                )}

                {/* 3rd Place */}
                {top3[2] ? (
                  <div className="order-3 flex min-w-0 flex-1 items-end md:block">
                  <div className="glass-panel relative flex h-[170px] w-full flex-col items-center justify-center overflow-hidden rounded-[14px] border border-[#1f2937] px-2 py-3 text-center md:h-[260px] md:justify-end md:rounded-[2rem] md:border-white/10 md:p-6 md:pb-6">
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-amber-600/10 to-transparent pointer-events-none"></div>
                    <Medal aria-label="Third place" className={`relative mb-1 h-[1.1rem] w-[1.1rem] md:mb-4 md:h-8 md:w-8 ${getMedalColor(2)}`} />
                    <a href={`https://x.com/${top3[2].handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="relative group mb-2 md:mb-3">
                      <CreatorAvatar src={top3[2].avatar} name={top3[2].handle} alt={top3[2].handle} className="h-10 w-10 rounded-full border-2 border-amber-600/50 object-cover md:h-16 md:w-16" />
                      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ArrowUpRight className="w-4 h-4 text-white" />
                      </div>
                    </a>
                    <h3 className="relative w-full truncate text-[0.72rem] font-semibold text-white md:text-base">{top3[2].handle}</h3>
                    <p className="relative mt-1 text-[0.95rem] font-bold tabular-nums text-cyan md:mt-2 md:text-xl">{top3[2][activeSort].toLocaleString()}</p>
                    <p className="relative mt-1 text-[0.52rem] font-medium uppercase tracking-[0.08em] text-muted md:text-[10px] md:tracking-wider">{getSortLabel(activeSort)}</p>
                  </div>
                  </div>
                ) : <div className="order-3 hidden flex-1 md:block"></div>}
              </motion.div>

              {/* Full Ranked Table */}
              <div ref={listTopRef} className="scroll-mt-24" />
              {rest.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: appleEase, delay: 0.4 }}
                  className="glass-panel rounded-2xl md:rounded-[2rem] border border-white/10 overflow-hidden"
                >
                  <div className="md:hidden divide-y divide-white/5">
                    {mobilePageItems.map(({ creator, rank }) => {
                      const isCurrentUser = creator.id === currentUserId;

                      return (
                        <a
                          key={creator.id}
                          href={`https://x.com/${creator.handle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3.5 ${
                            isCurrentUser ? 'bg-cyan/10' : 'hover:bg-white/5'
                          }`}
                        >
                          <span className={`w-10 shrink-0 text-xs font-bold tabular-nums ${isCurrentUser ? 'text-cyan' : 'text-muted'}`}>
                            #{rank}
                          </span>
                          <div className="flex min-w-0 items-center gap-2.5">
                            <CreatorAvatar src={creator.avatar} name={creator.handle} alt={creator.handle} className="w-9 h-9 rounded-full object-cover shrink-0" />
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-medium ${isCurrentUser ? 'text-cyan' : 'text-white'}`}>
                                {creator.handle}
                              </p>
                              <p className="truncate text-[11px] text-muted">
                                {creator.campaignsCompleted} campaigns
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums text-cyan">
                              {creator[activeSort].toLocaleString()}
                            </p>
                            <p className="text-[10px] text-muted">{getSortLabel(activeSort)}</p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                  {totalPages > 1 && (
                    <div className="md:hidden flex items-center justify-center gap-2 border-t border-white/10 p-3">
                      <button
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Previous leaderboard page"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => goToPage(page)}
                            aria-current={currentPage === page ? 'page' : undefined}
                            className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold tabular-nums transition-colors ${
                              currentPage === page
                                ? 'bg-cyan text-black'
                                : 'border border-white/10 bg-white/5 text-muted hover:text-white'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Next leaderboard page"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[820px] table-fixed text-left border-collapse whitespace-nowrap">
                      <colgroup>
                        <col className="w-1/5" />
                        <col className="w-1/5" />
                        <col className="w-1/5" />
                        <col className="w-1/5" />
                        <col className="w-1/5" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                          <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider text-left">Rank</th>
                          <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider">Creator</th>
                          <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider text-center">
                            <div className="flex items-center justify-center gap-1.5"><Star className="w-3.5 h-3.5" /> Sorsa Score</div>
                          </th>
                          <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider text-center">
                            <div className="flex items-center justify-center gap-1.5"><Target className="w-3.5 h-3.5" /> Activity Points</div>
                          </th>
                          <th className="py-4 px-6 text-xs font-semibold text-muted uppercase tracking-wider text-center">
                            <div className="flex items-center justify-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Campaigns</div>
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
                              className={`transition-colors hover:bg-white/5 ${isCurrentUser ? 'bg-cyan/10 border-l-2 border-cyan' : 'border-l-2 border-transparent'}`}
                            >
                              <td className="py-4 px-6 text-left align-middle">
                                <span className={`inline-flex text-sm font-bold tabular-nums ${isCurrentUser ? 'text-cyan' : 'text-muted'}`}>#{rank}</span>
                              </td>
                              <td className="py-4 px-6 align-middle">
                                <a href={`https://x.com/${creator.handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 group w-max max-w-full">
                                  <CreatorAvatar src={creator.avatar} name={creator.handle} alt={creator.handle} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                  <span className={`font-medium transition-colors truncate ${isCurrentUser ? 'text-cyan' : 'text-white group-hover:text-cyan'}`}>
                                    {creator.handle}
                                  </span>
                                </a>
                              </td>
                              <td className={`py-4 px-6 text-center align-middle font-semibold tabular-nums ${activeSort === 'sorsaScore' ? 'text-cyan' : 'text-white'}`}>
                                {creator.sorsaScore}
                              </td>
                              <td className={`py-4 px-6 text-center align-middle font-semibold tabular-nums ${activeSort === 'points' ? 'text-cyan' : 'text-white'}`}>
                                {creator.points.toLocaleString()}
                              </td>
                              <td className={`py-4 px-6 text-center align-middle font-semibold tabular-nums ${activeSort === 'campaignsCompleted' ? 'text-cyan' : 'text-white'}`}>
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
