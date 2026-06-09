import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Target, Zap, Clock, Users, DollarSign, CheckCircle2, ChevronRight, ExternalLink, X, Loader2, AlertCircle, Send } from 'lucide-react';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import LinkifiedText from '../components/LinkifiedText';
import { useCampaigns, Campaign } from '../hooks/useCampaigns';
import { useAuth } from '../context/AuthContext';
import { useCreatorProfile } from '../hooks/useCreatorProfile';
import sorsaApi from '../lib/sorsaApi';
import { formatCampaignTimeline } from '../lib/campaignTime';
import { splitCampaignBrief } from '../lib/campaignBrief';

const appleEase = [0.16, 1, 0.3, 1];

export default function CreatorCampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCampaign, joinCampaign, checkParticipation } = useCampaigns();
  const { user } = useAuth();
  const { profile: creatorProfile } = useCreatorProfile();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [participationId, setParticipationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [, setClockTick] = useState(0);
  const campaignBrief = splitCampaignBrief(campaign?.overview);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const [campaignData, participationData] = await Promise.all([
          getCampaign(id),
          checkParticipation(id)
        ]);

        if (campaignData) {
          setCampaign(campaignData);
        } else {
          setError('Campaign not found');
        }

        if (participationData) {
          setHasJoined(true);
          setParticipationId(participationData.id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id, getCampaign, checkParticipation]);

  useEffect(() => {
    const interval = window.setInterval(() => setClockTick((tick) => tick + 1), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const handleVerifyAndJoin = async () => {
    if (!id || !campaign || !creatorProfile?.x_handle) {
      if (!creatorProfile?.x_handle) {
        alert('Please complete your profile with an X handle first.');
      }
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const brandHandle = campaign.brand_profile?.twitter_handle;
      if (!brandHandle) {
        // If brand has no X handle set, skip follow check
        console.warn('Brand has no twitter handle set, skipping follow check.');
      } else {
        const isFollowing = await sorsaApi.checkFollow(creatorProfile.x_handle, cleanBrandHandle);

        if (!isFollowing) {
          setVerificationError(`You haven't followed @${cleanBrandHandle} yet. Please follow them and try again.`);
          setIsVerifying(false);
          return;
        }
      }

      // Proceed to join
      const newParticipation = await joinCampaign(id);
      if (newParticipation) {
        setHasJoined(true);
        setParticipationId(newParticipation.id);
      }
      setIsJoinModalOpen(false);
    } catch {
      setVerificationError('Unable to verify');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A1E] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan animate-spin" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-[#0A0A1E] flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">{error || 'Something went wrong'}</h2>
        <button onClick={() => navigate('/creator/campaigns')} className="text-cyan hover:underline">Back to Campaigns</button>
      </div>
    );
  }
  const userSorsaScore = creatorProfile?.sorsa_score ?? 0;

  // Determine required score
  const requiredScore = campaign.min_sorsa_score || 0;
  const meetsScoreRequirement = userSorsaScore >= requiredScore;

  const timeline = formatCampaignTimeline(campaign.end_date, campaign.release_at);
  const displayStatus = timeline.phase === 'payment' || timeline.phase === 'ready' ? 'ended' : campaign.status;

  const getCleanHandle = (handle: string | undefined) => {
    if (!handle) return '';
    // If it's a full URL, get the last part
    if (handle.includes('x.com/') || handle.includes('twitter.com/')) {
      return handle.split('/').filter(Boolean).pop() || '';
    }
    return handle.replace('@', '');
  };

  const cleanBrandHandle = getCleanHandle(campaign.brand_profile?.twitter_handle);
  const stats = campaign.campaign_stats?.[0];
  const allocatedRatio = stats?.max_base_pool ? stats.allocated_base_pool / stats.max_base_pool : 0;
  const budgetProgress = Math.min(100, stats ? 50 + allocatedRatio * 50 : 0);
  const poolAmount = Number(
    campaign.escrowed_budget ?? campaign.net_budget ?? Number(campaign.budget || 0) * 0.85
  ).toLocaleString(undefined, {
    maximumFractionDigits: 2
  });

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <CreatorTopBar />

      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">

          <button
            onClick={() => navigate('/creator/campaigns')}
            className="inline-flex items-center gap-2 text-muted hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Campaigns
          </button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase }}
            className="glass-panel rounded-[2rem] p-8 border border-white/10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start justify-between">
              <div className="flex items-start gap-6">
                <img
                  src={campaign.brand_profile?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(campaign.brand_profile?.company_name || 'Brand')}`}
                  alt={campaign.brand_profile?.company_name}
                  className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-semibold text-white tracking-tight">{campaign.title}</h1>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      displayStatus === 'ended'
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        : campaign.status === 'live'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-white/10 text-white border border-white/20'
                    }`}>
                      {displayStatus}
                    </span>
                  </div>
                  <p className="text-lg text-muted mb-4">{campaign.brand_profile?.company_name}</p>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      campaign.campaign_type === 'kol' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-white/10 text-white border border-white/20'
                    }`}>
                      {campaign.campaign_type === 'kol' ? 'KOL' : 'General'} Tier
                    </span>
                    {(campaign.categories || []).map(cat => (
                      <span key={cat} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-sm font-medium text-muted">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-64 flex flex-col gap-4">
                <div className="text-sm text-muted font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" /> {timeline.label}
                </div>
                <div className="space-y-3 rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted">
                      <DollarSign className="w-4 h-4 text-cyan" />
                      Pool
                    </div>
                    <div className="text-lg font-semibold text-white">${poolAmount}</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted">Budget Taken</span>
                      <span className="text-cyan">{Math.round(budgetProgress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${budgetProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Left Column: Details */}
            <div className="md:col-span-2 space-y-8">

              {/* Brief */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
                className="glass-panel rounded-[2rem] p-8 border border-white/10"
              >
                <h2 className="text-xl font-semibold text-white mb-4">Campaign Brief</h2>
                <div className="text-muted leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                  <LinkifiedText text={campaignBrief.overview} />
                </div>
              </motion.div>

              {/* Campaign Goals */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
                className="glass-panel rounded-[2rem] p-8 border border-white/10"
              >
                <h2 className="text-xl font-semibold text-white mb-6">Campaign Goals</h2>
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-5 h-5 rounded-full bg-cyan/10 flex items-center justify-center shrink-0">
                        <Target className="w-3 h-3 text-cyan" />
                      </div>
                      <p className="text-white text-sm md:text-base leading-relaxed">{campaign.goal}</p>
                    </div>
                    {campaignBrief.spotlightRequests.map((request, index) => (
                      <div key={`${request}-${index}`} className="flex items-start gap-3">
                        <div className="mt-1 w-5 h-5 rounded-full bg-cyan/10 flex items-center justify-center shrink-0">
                          <Target className="w-3 h-3 text-cyan" />
                        </div>
                        <p className="text-white text-sm md:text-base leading-relaxed">
                          <LinkifiedText text={request} />
                        </p>
                      </div>
                    ))}
                </div>
              </motion.div>

              {/* Requirements & X Follow */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.3 }}
                className="glass-panel rounded-[2rem] p-8 border border-white/10"
              >
                <h2 className="text-xl font-semibold text-white mb-6">Requirements</h2>
                <div className="space-y-4">
                  {campaign.min_sorsa_score && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan shrink-0"></div>
                      <p className="text-white text-sm md:text-base font-medium">{campaign.min_sorsa_score}+ Sorsa Score Required</p>
                    </div>
                  )}
                  {campaign.language && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan shrink-0"></div>
                      <p className="text-white text-sm md:text-base font-medium">Language: {campaign.language}</p>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan shrink-0"></div>
                    <p className="text-white text-sm md:text-base font-medium">
                      Follow @{cleanBrandHandle || 'Brand'} on X
                    </p>
                  </div>
                </div>
              </motion.div>

            </div>

            {/* Right Column: Action */}
            <div className="space-y-8">

              {/* Action Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.5 }}
                className="glass-panel rounded-[2rem] p-6 border border-white/10"
              >
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Start Date</span>
                    <span className="text-white font-medium">{campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Immediate'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">End Date</span>
                    <span className="text-white font-medium">
                      {campaign.end_date
                        ? new Date(campaign.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'No set end date'}
                    </span>
                  </div>
                </div>

                {(() => {
                  const stats = campaign.campaign_stats?.[0];
                  const isFull = stats ? stats.allocated_base_pool >= stats.max_base_pool : false;

                  if (hasJoined) {
                    return (
                      <div className="space-y-4">
                        <div className="w-full py-4 rounded-xl bg-green-400/10 border border-green-400/20 text-green-400 font-bold text-lg flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-5 h-5" /> Joined Successfully
                        </div>
                        {participationId && (
                          <button
                            onClick={() => navigate(`/creator/active/${participationId}`)}
                            className="w-full py-4 rounded-xl bg-cyan text-black font-bold text-lg hover:scale-[1.02] transition-all duration-300 shadow-[0_0_20px_rgba(0,212,255,0.3)] flex items-center justify-center gap-2"
                          >
                            Submit Post Link <Send className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (isFull) {
                    return (
                      <div className="w-full py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-lg flex items-center justify-center gap-2 cursor-not-allowed">
                        Campaign Full
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <button
                        onClick={() => meetsScoreRequirement && setIsJoinModalOpen(true)}
                        disabled={!meetsScoreRequirement}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 ${
                          meetsScoreRequirement
                            ? 'bg-cyan text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.5)]'
                            : 'bg-white/5 text-muted border border-white/10 cursor-not-allowed'
                        }`}
                      >
                        Join Campaign <ChevronRight className="w-5 h-5" />
                      </button>
                      {!meetsScoreRequirement && (
                        <p className="text-red-400 text-xs text-center font-medium">
                          You don't have enough Sorsa score to join this campaign.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </motion.div>

            </div>
          </div>
        </div>
      </main>

      {/* Join Modal */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass-panel border border-white/10 rounded-2xl overflow-hidden bg-[#11112A] shadow-2xl"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-white tracking-tight">Join Campaign</h3>
                  <button
                    onClick={() => setIsJoinModalOpen(false)}
                    className="text-muted hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <p className="text-muted text-sm leading-relaxed">
                    To join the <span className="text-white font-medium">{campaign.title}</span> campaign, you need to follow the brand on X. We will verify this using the Sorsa API.
                  </p>

                  <div className="bg-white/5 rounded-xl border border-white/10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={campaign.brand_profile?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(campaign.brand_profile?.company_name || 'Brand')}`}
                        alt={campaign.brand_profile?.company_name}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="text-white font-medium">{campaign.brand_profile?.company_name}</p>
                        <p className="text-sm text-cyan">@{cleanBrandHandle}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => window.open(`https://x.com/${cleanBrandHandle}`, '_blank')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-sm font-medium transition-colors border border-blue-500/20"
                    >
                      Follow <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {verificationError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {verificationError}
                    </motion.div>
                  )}

                  <button
                    onClick={handleVerifyAndJoin}
                    disabled={isVerifying}
                    className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      isVerifying
                        ? 'bg-white/10 text-muted cursor-not-allowed'
                        : 'bg-cyan text-black hover:scale-[1.02] shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                    }`}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Verifying...
                      </>
                    ) : (
                      'Verify & Join'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
