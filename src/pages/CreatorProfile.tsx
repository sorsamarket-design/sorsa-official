import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wallet, MapPin, Star, Target, DollarSign, Sparkles, Calendar } from 'lucide-react';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';

const appleEase = [0.16, 1, 0.3, 1] as const;

import { useCreatorProfile } from '../hooks/useCreatorProfile';
import { useAuth } from '../context/AuthContext';
import { resolveCreatorAvatarUrl } from '../lib/avatars';
import CreatorAvatar from '../components/CreatorAvatar';
import { getCreatorPastCampaignHistory, type CreatorCampaignHistoryItem } from '../lib/creatorCampaignHistory';

export default function CreatorProfile() {
  const { user } = useAuth();
  const { profile, loading } = useCreatorProfile();
  const [pastCampaigns, setPastCampaigns] = useState<CreatorCampaignHistoryItem[]>([]);
  const sorsaScore = Math.round(profile?.sorsa_score || 0);
  const baseReward = ((profile?.sorsa_score || 0) * 0.1).toFixed(2);
  const walletAddress = profile?.wallet_address || '';
  const truncatedWallet = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : 'Not bound';

  useEffect(() => {
    if (!user) return;
    getCreatorPastCampaignHistory(user.id)
      .then(setPastCampaigns)
      .catch((err) => {
        console.error('Error fetching creator campaign history:', err);
        setPastCampaigns([]);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A1E] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan/20 border-t-cyan rounded-full animate-spin mb-4"></div>
        <p className="text-white/60 animate-pulse font-medium tracking-wide">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <CreatorTopBar />

      <main className="creator-page-main flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase }}
            className="glass-panel rounded-[2rem] p-8 border border-white/10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
              <div className="flex min-w-0 flex-1 flex-row items-start gap-4 md:gap-8">
                <div className="relative shrink-0 group">
                  <CreatorAvatar
                    src={resolveCreatorAvatarUrl(profile?.avatar_url, user?.user_metadata?.avatar_url)}
                    name={profile?.x_handle || 'Creator'}
                    alt={profile?.full_name || profile?.x_handle || 'Creator'}
                    className="h-24 w-24 rounded-2xl border border-white/10 object-cover sm:h-32 sm:w-32 md:h-40 md:w-40"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="w-full">
                      <div className="flex items-start justify-between w-full">
                        <h1 className="text-xl sm:text-3xl font-semibold text-white tracking-tight truncate">
                          {profile?.full_name || profile?.x_handle || 'Creator Account'}
                        </h1>
                        <button className="text-muted hover:text-white p-1 -mt-1 -mr-1">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                        </button>
                      </div>
                      <p className="text-cyan text-sm sm:text-base font-medium mt-1 truncate">@{profile?.x_handle || 'username'}</p>

                      {profile?.country && (
                        <div className="flex items-center gap-1.5 text-muted mt-2">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-xs sm:text-sm">{profile.country}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-6">
                    <p className="text-muted text-sm sm:text-base leading-relaxed line-clamp-2 sm:line-clamp-none">{profile?.bio || 'This creator hasn\'t added a bio yet.'}</p>
                  </div>
                </div>
              </div>

              <div className="w-full shrink-0 border-t border-white/10 pt-5 lg:w-72 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <div className="flex items-stretch">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted">Sorsa Score</p>
                    <p className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">{sorsaScore}</p>
                  </div>

                  <div className="mx-5 w-px bg-white/10"></div>

                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted">Base Reward</p>
                    <p className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight text-emerald-400">${baseReward}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <Wallet className="h-4 w-4 shrink-0 text-cyan" />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-white">{truncatedWallet}</span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted">Base</span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="space-y-8">

              {/* Stats Row */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.3 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4"
              >
                <div className="glass-panel rounded-2xl p-5 border border-white/10">
                  <Target className="w-5 h-5 text-muted mb-3" />
                  <div className="text-2xl font-semibold text-white mb-1">{pastCampaigns.length || profile?.campaigns_completed || 0}</div>
                  <div className="text-xs text-muted font-medium">Campaigns</div>
                </div>
                <div className="glass-panel rounded-2xl p-5 border border-white/10">
                  <DollarSign className="w-5 h-5 text-muted mb-3" />
                  <div className="text-2xl font-semibold text-white mb-1">${profile?.total_earned?.toLocaleString() || 0}</div>
                  <div className="text-xs text-muted font-medium">Earned</div>
                </div>
                <div className="glass-panel rounded-2xl p-5 border border-white/10">
                  <Star className="w-5 h-5 text-muted mb-3" />
                  <div className="text-2xl font-semibold text-white mb-1">{profile?.activity_points?.toLocaleString() || 0}</div>
                  <div className="text-xs text-muted font-medium">Points</div>
                </div>
                <div className="glass-panel rounded-2xl p-5 border border-white/10">
                  <span className="text-muted font-bold text-sm block mb-3">X</span>
                  <div className="text-2xl font-semibold text-white mb-1">{profile?.follower_count?.toLocaleString() || 0}</div>
                  <div className="text-xs text-muted font-medium">Followers</div>
                </div>
              </motion.div>

              {/* Past Campaigns */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.4 }}
                className="glass-panel rounded-[2rem] p-6 border border-white/10"
              >
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="text-lg font-semibold text-white">Past Campaigns</h3>
                  <span className="text-sm text-muted">{pastCampaigns.length} total</span>
                </div>
                {pastCampaigns.length ? (
                  <div className={`space-y-3 ${pastCampaigns.length > 5 ? 'max-h-[21rem] overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.25)_transparent] [scrollbar-width:thin] md:max-h-none md:overflow-visible md:pr-0' : ''}`}>
                    {pastCampaigns.map((item) => (
                      <div key={item.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                          {item.campaign.image_url ? (
                            <img src={item.campaign.image_url} alt="" className="w-full h-full object-cover" />
                          ) : item.campaign.is_nft ? (
                            <Sparkles className="w-5 h-5 text-cyan" />
                          ) : (
                            <Target className="w-5 h-5 text-cyan" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium truncate">{item.campaign.title}</p>
                            {item.campaign.is_nft ? (
                              <span className="px-2 py-0.5 rounded-full bg-cyan/10 border border-cyan/20 text-cyan text-[10px] font-bold uppercase">NFT</span>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted truncate">
                            {item.campaign.brand_name || item.campaign.brand_profile?.company_name || (item.campaign.is_nft ? 'AtlasReach NFT Campaigns' : 'Campaign')}
                          </p>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-xs text-muted shrink-0">
                          <Calendar className="w-4 h-4" />
                          {item.campaign.end_date ? new Date(item.campaign.end_date).toLocaleDateString() : 'Ended'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center text-muted text-sm">
                    Completed campaign history will appear here.
                  </div>
                )}
              </motion.div>

          </div>
        </div>
      </main>
    </div>
  );
}
