import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertCircle, CheckCircle2, Send, History, Loader2, Sparkles } from 'lucide-react';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import { useCampaigns } from '../hooks/useCampaigns';
import { listCreatorNftParticipations } from '../lib/nftCampaigns';
import { formatCampaignTimeline, isCampaignEndingSoon } from '../lib/campaignTime';

const appleEase = [0.16, 1, 0.3, 1] as const;

export default function ActiveCampaigns() {
  const navigate = useNavigate();
  const { getCreatorActiveCampaigns, getCreatorPastCampaigns } = useCampaigns();

  const [activeTab, setActiveTab] = useState<'live' | 'past'>('live');
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [pastCampaigns, setPastCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setClockTick] = useState(0);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [activeData, pastData] = await Promise.all([
        getCreatorActiveCampaigns(),
        getCreatorPastCampaigns()
      ]);
      const nftData = await listCreatorNftParticipations().catch((err) => {
        console.error('Failed to load creator NFT campaigns', err);
        return { active: [], past: [] };
      });
      setActiveCampaigns([...(activeData || []), ...((nftData.active || []).map((item: any) => ({ ...item, isNft: true })))]);
      setPastCampaigns([...(pastData || []), ...((nftData.past || []).map((item: any) => ({ ...item, isNft: true })))]);
    } catch (err) {
      console.error('Failed to load creator campaigns', err);
    } finally {
      setIsLoading(false);
    }
  }, [getCreatorActiveCampaigns, getCreatorPastCampaigns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = window.setInterval(() => setClockTick((tick) => tick + 1), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle2 };
      case 'submitted':
        return { label: 'Submitted', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Send };
      case 'revision':
        return { label: 'Needs Revision', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertCircle };
      case 'active':
      default:
        return { label: 'Not Submitted', color: 'text-white', bg: 'bg-white/10', border: 'border-white/20', icon: Clock };
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <CreatorTopBar embedded />
      <main className="creator-page-main flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header & Toggle */}
          <div className="flex flex-col gap-2">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
                className="min-w-0 truncate text-[1.55rem] font-semibold tracking-tight text-white sm:text-3xl"
              >
                My Campaigns {(activeTab === 'live' ? activeCampaigns.length : pastCampaigns.length) > 0 && `(${activeTab === 'live' ? activeCampaigns.length : pastCampaigns.length})`}
              </motion.h1>
              <div className="flex shrink-0 items-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
                  className="inline-flex shrink-0 rounded-full border border-white/10 bg-white/5 p-1"
                >
                  <button
                    onClick={() => setActiveTab('live')}
                    className={`relative rounded-full px-3 py-1.5 text-[13px] font-medium leading-none transition-colors ${
                      activeTab === 'live' ? 'text-black' : 'text-muted hover:text-white'
                    }`}
                  >
                    {activeTab === 'live' && (
                      <motion.div
                        layoutId="activeTabBg"
                        className="absolute inset-0 rounded-full bg-white"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
                      <div className={`h-1.5 w-1.5 rounded-full ${activeTab === 'live' ? 'bg-green-500' : 'bg-transparent'}`} />
                      Live
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('past')}
                    className={`relative rounded-full px-3 py-1.5 text-[13px] font-medium leading-none transition-colors ${
                      activeTab === 'past' ? 'text-black' : 'text-muted hover:text-white'
                    }`}
                  >
                    {activeTab === 'past' && (
                      <motion.div
                        layoutId="activeTabBg"
                        className="absolute inset-0 rounded-full bg-white"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 whitespace-nowrap">Past</span>
                  </button>
                </motion.div>
              </div>
            </div>
            <div>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
                className="text-muted"
              >
                {activeTab === 'live'
                  ? "Track your progress and submit proofs for campaigns you've joined."
                  : "Review your completed campaigns and earnings history."}
              </motion.p>
            </div>
          </div>

          {/* Grid */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: appleEase }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {isLoading ? (
              <div className="md:col-span-2 flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-cyan animate-spin" />
              </div>
            ) : activeTab === 'live' ? (
              activeCampaigns.length > 0 ? (
                activeCampaigns.map((item) => {
                  const campaign = item.campaign;
                  const statusConfig = getStatusConfig(item.status);
                  const timeline = formatCampaignTimeline(campaign?.end_date, campaign?.release_at);
                  const endingSoon = isCampaignEndingSoon(campaign?.end_date);

                  if (item.isNft) {
                    return (
                      <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => navigate(`/creator/nft-campaigns/${campaign.id}`)}
                        className="group glass-panel rounded-2xl p-6 border border-white/10 hover:border-cyan/50 hover:shadow-[0_0_30px_rgba(0,212,255,0.15)] transition-all duration-300 cursor-pointer flex flex-col h-full relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-cyan/10 transition-colors"></div>

                        <div className="flex items-start justify-between mb-6 relative z-10">
                          <div className="flex items-center gap-4">
                            <img
                              src={campaign?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(campaign?.title || 'NFT')}`}
                              alt={campaign?.title}
                              className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan/10 text-cyan border border-cyan/20 text-[10px] font-bold uppercase tracking-wider mb-2">
                                <Sparkles className="w-3 h-3" /> NFT
                              </div>
                              <h3 className="font-semibold text-white text-lg group-hover:text-cyan transition-colors line-clamp-1">{campaign?.title}</h3>
                              <p className="text-sm text-muted">{campaign?.campaign_type === 'content' ? 'Content Campaign' : 'Raffle Campaign'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto space-y-4 relative z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted">
                              <Clock className="w-4 h-4" />
                              <span className={endingSoon ? 'text-yellow-400 font-medium' : ''}>{timeline.label}</span>
                            </div>
                            <div className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-green-500/10 text-green-400 border border-green-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Joined
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => navigate(`/creator/active/${item.id}`)}
                      className="group glass-panel rounded-2xl p-6 border border-white/10 hover:border-cyan/50 hover:shadow-[0_0_30px_rgba(0,212,255,0.15)] transition-all duration-300 cursor-pointer flex flex-col h-full relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-cyan/10 transition-colors"></div>

                      <div className="flex items-start justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-4">
                          <img
                            src={campaign?.brand_profile?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(campaign?.brand_profile?.company_name || 'Brand')}`}
                            alt={campaign?.brand_profile?.company_name}
                            className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h3 className="font-semibold text-white text-lg group-hover:text-cyan transition-colors line-clamp-1">{campaign?.title}</h3>
                            <p className="text-sm text-muted">{campaign?.brand_profile?.company_name}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted">
                            <Clock className="w-4 h-4" />
                            <span className={endingSoon || timeline.phase === 'payment' ? 'text-yellow-400 font-medium' : timeline.phase === 'ready' ? 'text-green-400 font-medium' : ''}>
                              {timeline.label}
                            </span>
                          </div>

                          <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}>
                            <statusConfig.icon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="md:col-span-2 text-center py-20">
                  <History className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Active Campaigns</h3>
                  <p className="text-muted">Browse and join campaigns to get started.</p>
                  <button
                    onClick={() => navigate('/creator/campaigns')}
                    className="mt-6 px-6 py-2 rounded-xl bg-cyan text-black font-semibold hover:scale-105 transition-transform"
                  >
                    Browse Campaigns
                  </button>
                </div>
              )
            ) : pastCampaigns.length > 0 ? (
              pastCampaigns.map((item) => {
                const campaign = item.campaign;
                const earned = Number(item.calculated_reward || 0);

                if (item.isNft) {
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => navigate(`/creator/nft-campaigns/${campaign.id}`)}
                      className="group glass-panel rounded-2xl p-6 border border-white/10 hover:border-cyan/50 hover:shadow-[0_0_30px_rgba(0,212,255,0.15)] transition-all duration-300 cursor-pointer flex flex-col h-full relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-cyan/10 transition-colors"></div>

                      <div className="flex items-start justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-4">
                          <img
                            src={campaign?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(campaign?.title || 'NFT')}`}
                            alt={campaign?.title}
                            className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan/10 text-cyan border border-cyan/20 text-[10px] font-bold uppercase tracking-wider mb-2">
                              <Sparkles className="w-3 h-3" /> NFT
                            </div>
                            <h3 className="font-semibold text-white text-lg group-hover:text-cyan transition-colors line-clamp-1">{campaign?.title}</h3>
                            <p className="text-sm text-muted">{campaign?.campaign_type === 'content' ? 'Content Campaign' : 'Raffle Campaign'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted">
                            {campaign?.status === 'completed' ? 'Completed' : 'Ended'}
                          </div>

                          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-green-500/10 text-green-400 border border-green-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Past
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => navigate(`/creator/campaigns/${campaign.id}`)}
                    className="group glass-panel rounded-2xl p-6 border border-white/10 hover:border-cyan/50 hover:shadow-[0_0_30px_rgba(0,212,255,0.15)] transition-all duration-300 cursor-pointer flex flex-col h-full relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-cyan/10 transition-colors"></div>

                    <div className="flex items-start justify-between mb-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <img
                          src={campaign?.brand_profile?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(campaign?.brand_profile?.company_name || 'Brand')}`}
                          alt={campaign?.brand_profile?.company_name}
                          className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h3 className="font-semibold text-white text-lg group-hover:text-cyan transition-colors line-clamp-1">{campaign?.title}</h3>
                          <p className="text-sm text-muted">{campaign?.brand_profile?.company_name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto space-y-4 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted">
                          {earned > 0 ? `${earned.toLocaleString()} USDC earned` : 'Completed'}
                        </div>

                        <div className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-green-500/10 text-green-400 border border-green-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completed
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
                <div className="md:col-span-2 text-center py-20">
                  <History className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Past Campaigns</h3>
                  <p className="text-muted">Completed campaigns will appear here.</p>
                </div>
            )}
          </motion.div>

        </div>
      </main>
    </div>
  );
}
