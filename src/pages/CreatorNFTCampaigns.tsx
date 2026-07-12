import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Clock, Loader2, Sparkles, Ticket, Users } from 'lucide-react';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import { getNftCampaignPrimaryAllocation, listNftCampaigns } from '../lib/nftCampaigns';
import { formatCampaignCountdown, getCampaignEndTime } from '../lib/campaignTime';
import { getCampaignShortPath } from '../lib/campaignShortLinks';

function nftCampaignTypeLabel(type: string) {
  if (type === 'raffle' || type === 'fcfs') return 'Raffle';
  return 'Content';
}

export default function CreatorNFTCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'past'>('live');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let isMounted = true;

    listNftCampaigns()
      .then((result) => {
        if (isMounted) setCampaigns(result.campaigns || []);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Could not load NFT campaigns.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isPastCampaign = (campaign: any) => {
    if (campaign.status === 'completed') return true;
    const endTime = getCampaignEndTime(campaign.end_date);
    return Boolean(endTime && endTime <= now);
  };
  const visibleCampaigns = campaigns.filter((campaign) =>
    activeTab === 'past' ? isPastCampaign(campaign) : !isPastCampaign(campaign)
  );

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <main className="creator-page-main flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white mb-3">NFT Campaigns</h1>
              <p className="text-muted max-w-2xl leading-relaxed">
                Browse NFT-focused creator campaigns, complete raffle tasks, or submit content for review.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center">
              <CreatorTopBar embedded />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const, delay: 0.2 }}
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
                      layoutId="nftBrowseTabBg"
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
                      layoutId="nftBrowseTabBg"
                      className="absolute inset-0 bg-white rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">Past</span>
                </button>
              </motion.div>
            </div>
          </div>

          {error && (
            <div className="glass-panel rounded-2xl p-5 border border-red-500/20 bg-red-500/10 text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="glass-panel rounded-[2rem] p-12 border border-white/10 text-center">
              <Loader2 className="w-8 h-8 text-cyan animate-spin mx-auto" />
            </div>
          ) : visibleCampaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleCampaigns.map((campaign) => {
                const primaryAllocation = getNftCampaignPrimaryAllocation(campaign);
                return (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => navigate(getCampaignShortPath(campaign))}
                  className="group text-left glass-panel rounded-2xl border border-white/10 hover:border-cyan/50 hover:shadow-[0_0_30px_rgba(0,212,255,0.15)] transition-all duration-300 cursor-pointer flex flex-col h-full relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-cyan/10 transition-colors"></div>

                  <div className="w-full aspect-[3/1] bg-white/5 border-b border-white/10 relative overflow-hidden">
                    {campaign.background_image_url || campaign.image_url ? (
                      <img
                        src={campaign.background_image_url || campaign.image_url}
                        alt=""
                        className="w-full h-full object-contain opacity-90"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan/10 via-white/[0.03] to-blue-500/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0A0A1E]/45"></div>
                  </div>

                  <div className="p-6 flex flex-col flex-1 relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {campaign.image_url ? (
                          <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
                        ) : (
                          <Sparkles className="w-6 h-6 text-cyan" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white group-hover:text-cyan transition-colors line-clamp-1">{campaign.title}</h3>
                        <p className="text-sm text-muted line-clamp-2">{campaign.goal || 'NFT Campaign'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-2.5 py-1 rounded-md bg-cyan/10 border border-cyan/20 text-xs font-semibold text-cyan">
                      NFT
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-medium text-muted uppercase">
                      {nftCampaignTypeLabel(campaign.campaign_type)}
                    </span>
                    {(campaign.categories || []).filter((category: string) => category.toLowerCase() !== 'nft').map((category: string) => (
                      <span key={category} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-medium text-muted">
                        {category}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                          <Ticket className="w-4 h-4 text-muted" />
                          {primaryAllocation.value.toLocaleString()} {primaryAllocation.suffix}
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-white">
                          <Users className="w-4 h-4 text-muted" />
                          {Number(campaign.stats?.joined_count || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-white flex items-center gap-1 group-hover:text-cyan transition-colors">
                        <Clock className="w-4 h-4 text-muted" />
                        {formatCampaignCountdown(campaign.end_date, now)}
                      </div>
                    </div>
                  </div>
                  </div>
                </button>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel rounded-[2rem] p-12 border border-white/10 text-center">
              <Sparkles className="w-10 h-10 text-muted mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No {activeTab === 'live' ? 'live' : 'past'} NFT campaigns</h2>
              <p className="text-muted">NFT-focused creator campaigns will appear here when available.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
