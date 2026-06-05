import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Clock, DollarSign, Users, Target, Zap, ArrowUpRight, Loader2 } from 'lucide-react';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import { useCampaigns } from '../hooks/useCampaigns';
import { formatCampaignTimeline } from '../lib/campaignTime';

const appleEase = [0.16, 1, 0.3, 1];

const CATEGORIES = ['All', 'DeFi', 'AI', 'NFT', 'ZK', 'DePIN'];
const TIERS = ['All', 'General', 'KOL'];
const SORTS = ['Newest', 'Highest Budget', 'Ending Soon'];

export default function CreatorBrowse() {
  const navigate = useNavigate();
  const { campaigns, loading } = useCampaigns();

  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTier, setActiveTier] = useState('All');
  const [activeSort, setActiveSort] = useState('Newest');
  const [budgetRange, setBudgetRange] = useState(50000); // Max budget filter
  const [activeTab, setActiveTab] = useState<'live' | 'past'>('live');

  // Map Supabase campaigns to the UI schema
  const liveCampaignsMapped = useMemo(() => {
    return campaigns
      .filter(c => c.status === 'live' && c.brand_profile?.company_name && c.end_date)
      .map(c => ({
      id: c.id,
      title: c.title,
      brandName: c.brand_profile!.company_name,
      brandLogo: c.brand_profile?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.brand_profile?.company_name || 'Brand')}`,
            categories: c.categories || [],
      tier: c.campaign_type === 'kol' ? 'KOL' : 'General',
            budget: c.budget,
      stats: c.campaign_stats?.[0] || null,
      baseReward: Math.floor(c.budget * 0.425),
      performanceBonus: Math.floor(c.budget * 0.425),
      deadline: c.end_date!,
      releaseAt: c.release_at,
      createdAt: c.created_at,
      previewText: c.overview ? c.overview.substring(0, 150) + '...' : '',
      brief: {
        objectives: c.overview,
        spotlightRequests: [],
        requirements: c.min_sorsa_score ? [`${c.min_sorsa_score}+ Sorsa score`] : [],
        startDate: c.start_date || c.created_at,
        endDate: c.end_date!
      }
    }));
  }, [campaigns]);

  const pastCampaignsMapped = useMemo(() => {
    return campaigns
      .filter(c => c.status === 'completed' && c.brand_profile?.company_name)
      .map(c => ({
        id: c.id,
        title: c.title,
        brandName: c.brand_profile!.company_name,
        brandLogo: c.brand_profile?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.brand_profile?.company_name || 'Brand')}`,
        categories: c.categories || [],
        tier: c.campaign_type === 'kol' ? 'KOL' : 'General',
        budget: c.budget,
        stats: c.campaign_stats?.[0] || null,
        baseReward: Math.floor(c.budget * 0.425),
        performanceBonus: Math.floor(c.budget * 0.425),
        deadline: c.end_date || c.release_at || c.created_at,
        releaseAt: c.release_at,
        createdAt: c.created_at,
        previewText: c.overview ? c.overview.substring(0, 150) + '...' : '',
        brief: {
          objectives: c.overview,
          spotlightRequests: [],
          requirements: c.min_sorsa_score ? [`${c.min_sorsa_score}+ Sorsa score`] : [],
          startDate: c.start_date || c.created_at,
          endDate: c.end_date || c.release_at || c.created_at
        }
      }));
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    const sourceData = activeTab === 'live' ? liveCampaignsMapped : pastCampaignsMapped;
    let result = [...sourceData];

    if (activeCategory !== 'All') {
      result = result.filter(c => c.categories.includes(activeCategory));
    }

    if (activeTier !== 'All') {
      result = result.filter(c => c.tier === activeTier);
    }

    result = result.filter(c => c.budget <= budgetRange);

    switch (activeSort) {
      case 'Highest Budget':
        result.sort((a, b) => b.budget - a.budget);
        break;
      case 'Ending Soon':
        result.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        break;
      case 'Newest':
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return result;
  }, [activeCategory, activeTier, activeSort, budgetRange, activeTab, liveCampaignsMapped, pastCampaignsMapped]);

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <CreatorTopBar />

      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header & Toggle */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
                className="text-3xl font-semibold tracking-tight text-white"
              >
                Browse Campaigns
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
                className="text-muted mt-1"
              >
                {activeTab === 'live'
                  ? "Discover and apply to high-quality Web3 campaigns."
                  : "Explore past successful campaigns on SorsaMarket."}
              </motion.p>
            </div>

            {/* Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
              className="inline-flex bg-white/5 p-1.5 rounded-full border border-white/10"
            >
              <button
                onClick={() => setActiveTab('live')}
                className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === 'live' ? 'text-black' : 'text-muted hover:text-white'
                }`}
              >
                {activeTab === 'live' && (
                  <motion.div
                    layoutId="browseTabBg"
                    className="absolute inset-0 bg-white rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${activeTab === 'live' ? 'bg-green-500' : 'bg-transparent'}`} />
                  Live
                </span>
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === 'past' ? 'text-black' : 'text-muted hover:text-white'
                }`}
              >
                {activeTab === 'past' && (
                  <motion.div
                    layoutId="browseTabBg"
                    className="absolute inset-0 bg-white rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Past</span>
              </button>
            </motion.div>
          </div>

          {/* Filters Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
            className="glass-panel rounded-2xl p-4 border border-white/10 flex flex-col xl:flex-row xl:items-center gap-6"
          >
            {/* Categories */}
            <div className="flex-1 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted mr-2 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Category
              </span>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat
                      ? 'bg-cyan text-black shadow-[0_0_15px_rgba(0,212,255,0.3)]'
                      : 'bg-white/5 text-muted hover:text-white hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-6">
              {/* Tier */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted">Tier</span>
                <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                  {TIERS.map(tier => (
                    <button
                      key={tier}
                      onClick={() => setActiveTier(tier)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        activeTier === tier ? 'bg-white/10 text-white' : 'text-muted hover:text-white'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Slider */}
              <div className="flex items-center gap-3 w-48">
                <span className="text-sm font-medium text-muted whitespace-nowrap">Max Budget</span>
                <div className="flex-1 flex flex-col gap-1">
                  <input
                    type="range"
                    min="1000"
                    max="50000"
                    step="1000"
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(Number(e.target.value))}
                    className="w-full accent-cyan"
                  />
                  <div className="text-xs text-right text-cyan font-medium">${budgetRange.toLocaleString()}</div>
                </div>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted">Sort</span>
                <select
                  value={activeSort}
                  onChange={(e) => setActiveSort(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan/50 appearance-none pr-8 relative"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
                >
                  {SORTS.map(sort => (
                    <option key={sort} value={sort} className="bg-[#0A0A1E]">{sort}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.3 }}
          >
            {loading && activeTab === 'live' ? (
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-cyan animate-spin mb-4" />
                <p className="text-muted">Loading live campaigns...</p>
              </div>
            ) : filteredCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredCampaigns.map((campaign) => (
                    <motion.div
                      key={campaign.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4, ease: appleEase }}
                      onClick={() => navigate(`/creator/campaigns/${campaign.id}`)}
                      className="group glass-panel rounded-2xl p-6 border border-white/10 hover:border-cyan/50 hover:shadow-[0_0_30px_rgba(0,212,255,0.15)] transition-all duration-300 cursor-pointer flex flex-col h-full relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-cyan/10 transition-colors"></div>

                      <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <img
                            src={campaign.brandLogo}
                            alt={campaign.brandName}
                            className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h3 className="font-semibold text-white group-hover:text-cyan transition-colors line-clamp-1">{campaign.title}</h3>
                            <p className="text-sm text-muted">{campaign.brandName}</p>
                          </div>
                        </div>
                        {(() => {
                          let isFull = false;
                          if (activeTab === 'live' && (campaign as any).stats) {
                            const stats = (campaign as any).stats;
                            isFull = stats.allocated_base_pool >= stats.max_base_pool;
                          }
                          const timeline = formatCampaignTimeline(campaign.deadline, (campaign as any).releaseAt);
                          const isEnded = timeline.phase === 'payment' || timeline.phase === 'ready';
                          return (
                            <div className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                              activeTab === 'past'
                                ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                : isEnded
                                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                : isFull
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-green-500/10 text-green-400 border border-green-500/20'
                            }`}>
                              {activeTab === 'past' ? 'Completed' : (isEnded ? 'Ended' : (isFull ? 'Full' : 'Available'))}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="mb-4 relative z-10">
                        <p className="text-sm text-muted line-clamp-2 leading-relaxed">
                          {campaign.previewText}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                        {campaign.categories.map(cat => (
                          <span key={cat} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-medium text-muted">
                            {cat}
                          </span>
                        ))}
                      </div>

                      <div className="mt-auto space-y-4 relative z-10">
                        {(() => {
                          let progress = 0;
                          if (activeTab === 'live' && (campaign as any).stats) {
                            const stats = (campaign as any).stats;
                            // 50% is reserved for performance. 50% is the base pool.
                            // If max_base_pool is 0 (shouldn't happen), avoid NaN
                            const allocatedRatio = stats.max_base_pool > 0 ? (stats.allocated_base_pool / stats.max_base_pool) : 0;
                            // Progress starts at 50% and fills up the remaining 50% based on allocated base pool
                            progress = 50 + (allocatedRatio * 50);
                            // Cap at 100% just in case
                            progress = Math.min(progress, 100);
                          }
                          return (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs font-medium">
                                <span className="text-muted">Budget Taken</span>
                                <span className="text-cyan">{Math.round(progress)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-cyan to-blue-500 rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })()}
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                              Pool ${campaign.budget.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-white flex items-center gap-1 group-hover:text-cyan transition-colors">
                            <Clock className="w-4 h-4 text-muted" />
                            {new Date(campaign.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="glass-panel rounded-2xl p-12 border border-white/10 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-muted" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No campaigns found</h3>
                <p className="text-muted max-w-md">
                  We couldn't find any campaigns matching your current filters. Try adjusting your category, tier, or budget range.
                </p>
                <button
                  onClick={() => {
                    setActiveCategory('All');
                    setActiveTier('All');
                    setBudgetRange(50000);
                  }}
                  className="mt-6 px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </motion.div>

        </div>
      </main>
    </div>
  );
}
