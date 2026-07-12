import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, ExternalLink, Loader2, MessageCircle, Sparkles, Star, Ticket, Users } from 'lucide-react';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import LinkifiedText from '../components/LinkifiedText';
import { getNftCampaign, getNftCampaignPrimaryAllocation, joinNftCampaign, submitNftCampaignContent, verifyNftCampaignTask, type NftCampaign } from '../lib/nftCampaigns';
import { formatCampaignCountdown, getCampaignEndTime } from '../lib/campaignTime';
import { useCreatorProfile } from '../hooks/useCreatorProfile';

const appleEase = [0.16, 1, 0.3, 1] as const;

function nftCampaignTypeLabel(type: string) {
  if (type === 'raffle' || type === 'fcfs') return 'Raffle';
  return 'Content';
}

function isContentCampaign(type: string) {
  return type === 'content' || type === 'all';
}

function verifiedTaskMap(campaign: NftCampaign) {
  const next: Record<string, boolean> = {};
  for (const account of campaign.follow_accounts || []) {
    next[`follow:${account}`] = true;
  }
  for (const link of campaign.retweet_links || []) {
    next[`retweet:${link}`] = true;
  }
  for (const link of campaign.comment_links || []) {
    next[`comment:${link}`] = true;
  }
  for (const link of campaign.engagement_links || []) {
    next[`engagement:${link}`] = true;
  }
  for (const task of campaign.telegram_tasks || []) {
    if (task.chat_id) next[`telegram:${task.chat_id}`] = true;
  }
  return next;
}

export default function CreatorNFTCampaignDetail() {
  const { id, code } = useParams();
  const campaignRef = id || code || '';
  const navigate = useNavigate();
  const { profile: creatorProfile } = useCreatorProfile();
  const [campaign, setCampaign] = useState<NftCampaign | null>(null);
  const [participation, setParticipation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [verifyingTask, setVerifyingTask] = useState('');
  const [verifiedTasks, setVerifiedTasks] = useState<Record<string, boolean>>({});
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submittingContent, setSubmittingContent] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const taskActionPillClass = 'px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors';

  useEffect(() => {
    let isMounted = true;
    if (!campaignRef) return;

    getNftCampaign(campaignRef)
      .then((result) => {
        if (!isMounted) return;
        setCampaign(result.campaign);
        setParticipation(result.participation || null);
        if (result.participation && result.participation.status !== 'rejected') {
          setVerifiedTasks(verifiedTaskMap(result.campaign));
        } else {
          setVerifiedTasks(result.verified_tasks || {});
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'NFT campaign could not be loaded.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [campaignRef]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleJoin = async () => {
    const campaignId = campaign?.id || campaignRef;
    if (!campaignId) return;
    if (!creatorProfile?.wallet_address) {
      setJoinError('Add a wallet address to your creator profile before joining campaigns.');
      return;
    }
    setJoining(true);
    setJoinError('');

    try {
      const result = await joinNftCampaign(campaignId);
      setParticipation(result.participation);
      if (campaign) setVerifiedTasks(verifiedTaskMap(campaign));
    } catch (err: any) {
      setJoinError(err.message || 'Could not join NFT campaign.');
    } finally {
      setJoining(false);
    }
  };

  const taskKey = (type: 'follow' | 'retweet' | 'comment' | 'engagement' | 'telegram', value: string) => `${type}:${value}`;

  const handleVerifyTask = async (type: 'follow' | 'retweet' | 'comment' | 'engagement' | 'telegram', value: string) => {
    const campaignId = campaign?.id || campaignRef;
    if (!campaignId) return;
    if (campaignEnded) return;
    const key = taskKey(type, value);
    setVerifyingTask(key);
    setTaskErrors((current) => ({ ...current, [key]: '' }));

    try {
      await verifyNftCampaignTask(campaignId, { type, value });
      setVerifiedTasks((current) => ({ ...current, [key]: true }));
    } catch (err: any) {
      setVerifiedTasks((current) => ({ ...current, [key]: false }));
      setTaskErrors((current) => ({ ...current, [key]: err.message || 'Task could not be verified yet.' }));
    } finally {
      setVerifyingTask('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A1E] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan animate-spin" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-[#0A0A1E] flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">{error || 'NFT campaign not found'}</h2>
        <button onClick={() => navigate('/creator/nft-campaigns')} className="text-cyan hover:underline">Back to NFT Campaigns</button>
      </div>
    );
  }

  const hasJoined = Boolean(participation && participation.status !== 'rejected');
  const isContent = isContentCampaign(campaign.campaign_type);
  const campaignEndTime = getCampaignEndTime(campaign.end_date);
  const campaignEnded = campaign.status === 'completed' || Boolean(campaignEndTime && campaignEndTime <= now);
  const canVerifyTasks = !campaignEnded;
  const hasWalletAddress = Boolean(creatorProfile?.wallet_address);
  const primaryAllocation = getNftCampaignPrimaryAllocation(campaign);
  const collectionDetails = [
    { label: 'Chain', value: campaign.collection_details?.chain },
    { label: 'Mint Date', value: campaign.collection_details?.mint_date },
    { label: 'Supply', value: campaign.collection_details?.supply },
    { label: 'Mint Price', value: campaign.collection_details?.mint_price }
  ].filter((item) => String(item.value || '').trim());
  const overviewText = String(campaign.overview || '').trim();
  const overviewIsCollectionDetails = collectionDetails.length > 0 && overviewText.startsWith('Collection Details\n');

  const handleSubmitContent = async (event: React.FormEvent) => {
    event.preventDefault();
    const campaignId = campaign?.id || campaignRef;
    if (!campaignId) return;
    setSubmittingContent(true);
    setSubmissionSuccess('');
    setSubmissionError('');

    try {
      await submitNftCampaignContent(campaignId, submissionUrl.trim());
      setSubmissionUrl('');
      setSubmissionSuccess('Content submitted for review.');
    } catch (err: any) {
      setSubmissionError(err.message || 'Content submission failed.');
    } finally {
      setSubmittingContent(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <main className="creator-page-main flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => navigate('/creator/nft-campaigns')}
              className="inline-flex items-center gap-2 text-muted hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to NFT Campaigns
            </button>
            <CreatorTopBar embedded />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase }}
            className="glass-panel rounded-[2rem] border border-white/10 overflow-hidden"
          >
            <div className="w-full aspect-[3/1] bg-white/5 border-b border-white/10 relative overflow-hidden">
              {campaign.background_image_url || campaign.image_url ? (
                <img
                  src={(campaign.background_image_url || campaign.image_url) ?? undefined}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cyan/10 via-white/[0.03] to-blue-500/10" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-[#0A0A1E]/70"></div>
            </div>

            <div className="p-8 flex flex-col md:flex-row md:items-start justify-between gap-8">
              <div className="flex items-start gap-5">
                <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {campaign.image_url ? (
                    <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
                  ) : (
                    <Sparkles className="w-10 h-10 text-cyan" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan/10 text-cyan border border-cyan/20 text-xs font-semibold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" /> NFT
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-bold uppercase text-white">
                      {nftCampaignTypeLabel(campaign.campaign_type)}
                    </span>
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white">{campaign.title}</h1>
                  <p className="text-muted mt-2">{campaign.goal}</p>
                </div>
              </div>

              <button
                onClick={handleJoin}
                disabled={joining || hasJoined || campaignEnded || !hasWalletAddress}
                className={`px-6 py-3 rounded-full font-semibold transition-all inline-flex items-center justify-center gap-2 ${
                  hasJoined
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-default'
                    : campaignEnded
                      ? 'bg-white/5 text-muted border border-white/10 cursor-not-allowed'
                    : hasWalletAddress
                      ? 'bg-cyan text-black hover:scale-[1.02]'
                      : 'bg-white/5 text-muted border border-white/10 cursor-not-allowed'
                } disabled:opacity-70 disabled:hover:scale-100`}
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : hasJoined ? <CheckCircle2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {joining ? 'Joining...' : hasJoined ? 'Joined' : campaignEnded ? 'Campaign Ended' : 'Join Campaign'}
              </button>
            </div>

            {!hasWalletAddress && !hasJoined && (
              <div className="mx-8 mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Add a wallet address to your creator profile before joining campaigns.
              </div>
            )}

            {joinError && (
              <div className="mx-8 mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {joinError}
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <div className="glass-panel min-w-0 rounded-2xl border border-white/10 p-2 sm:p-5">
              <Ticket className="mb-2 h-4 w-4 text-cyan sm:mb-3 sm:h-5 sm:w-5" />
              <div className="text-[0.6rem] leading-tight text-muted sm:text-sm">{primaryAllocation.label}</div>
              <div className="break-words text-[0.85rem] font-bold leading-tight text-white sm:text-2xl sm:font-semibold">{primaryAllocation.value.toLocaleString()}</div>
            </div>
            <div className="glass-panel min-w-0 rounded-2xl border border-white/10 p-2 sm:p-5">
              <Users className="mb-2 h-4 w-4 text-cyan sm:mb-3 sm:h-5 sm:w-5" />
              <div className="text-[0.6rem] leading-tight text-muted sm:text-sm">Participants</div>
              <div className="break-words text-[0.85rem] font-bold leading-tight text-white sm:text-2xl sm:font-semibold">{Number(campaign.stats?.joined_count || 0).toLocaleString()}</div>
            </div>
            <div className="glass-panel min-w-0 rounded-2xl border border-white/10 p-2 sm:p-5">
              <Star className="mb-2 h-4 w-4 text-cyan sm:mb-3 sm:h-5 sm:w-5" />
              <div className="text-[0.6rem] leading-tight text-muted sm:text-sm">Sorsa Score</div>
              <div className="break-words text-[0.85rem] font-bold leading-tight text-white sm:text-2xl sm:font-semibold">{Number(campaign.min_sorsa_score || 0).toLocaleString()}+</div>
            </div>
            <div className="glass-panel min-w-0 rounded-2xl border border-white/10 p-2 sm:p-5">
              <Clock className="mb-2 h-4 w-4 text-cyan sm:mb-3 sm:h-5 sm:w-5" />
              <div className="text-[0.6rem] leading-tight text-muted sm:text-sm">Time Left</div>
              <div className="whitespace-nowrap text-[0.68rem] font-bold leading-tight text-white tabular-nums sm:text-lg sm:font-semibold lg:text-base xl:text-lg">
                {formatCampaignCountdown(campaign.end_date, now)}
              </div>
            </div>
          </div>

          <section className="glass-panel rounded-[2rem] p-8 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Campaign Details</h2>
            {collectionDetails.length ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {collectionDetails.map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {!overviewIsCollectionDetails && (
              <div className="text-muted leading-relaxed whitespace-pre-line">
                <LinkifiedText text={overviewText || 'No campaign brief provided.'} />
              </div>
            )}
          </section>

          <section className="glass-panel rounded-[2rem] p-8 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">{isContent ? 'Content Submission' : 'Eligibility Tasks'}</h2>
            {isContent ? (
              <div className="space-y-6">
                {campaign.follow_accounts?.length ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Join Requirements</h3>
                    {campaign.follow_accounts.map((account) => {
                      const key = taskKey('follow', account);
                      const isVerified = hasJoined || verifiedTasks[key];
                      const isVerifying = verifyingTask === key;

                      return (
                        <div
                          key={account}
                          className={`p-4 rounded-2xl bg-white/5 border transition-colors ${
                            isVerified ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 hover:border-cyan/30'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <p className="text-white font-medium">Follow @{account}</p>
                              <p className="text-xs text-muted mt-1">Required before joining this content campaign.</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <a
                                href={`https://x.com/${account}`}
                                target="_blank"
                                rel="noreferrer"
                                className={taskActionPillClass}
                              >
                                Follow
                              </a>
                              <a
                                href={`https://x.com/${account}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-cyan hover:border-cyan/30 inline-flex items-center justify-center transition-colors"
                                aria-label={`Open @${account} on X`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleVerifyTask('follow', account)}
                                disabled={isVerifying || isVerified || !canVerifyTasks}
                                className={`px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                                  isVerified
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : !canVerifyTasks
                                      ? 'bg-white/5 text-muted border border-white/10 cursor-not-allowed'
                                    : 'bg-cyan text-black hover:bg-cyan/90'
                                } disabled:opacity-80`}
                              >
                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : isVerified ? <CheckCircle2 className="w-4 h-4" /> : null}
                                {isVerifying ? 'Verifying...' : isVerified ? 'Verified' : campaignEnded ? 'Ended' : 'Verify'}
                              </button>
                            </div>
                          </div>
                          {taskErrors[key] ? <p className="text-xs text-red-400 mt-3">{taskErrors[key]}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                <p className="text-muted">This is a content campaign. Join the campaign, then submit your X post link for review.</p>
                <form onSubmit={handleSubmitContent} className="space-y-4">
                  <input
                    value={submissionUrl}
                    onChange={(event) => setSubmissionUrl(event.target.value)}
                    disabled={!hasJoined || submittingContent || campaignEnded}
                    placeholder="https://x.com/account/status/..."
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all disabled:opacity-50"
                  />
                  {submissionError ? <p className="text-sm text-red-400">{submissionError}</p> : null}
                  {submissionSuccess ? <p className="text-sm text-green-400">{submissionSuccess}</p> : null}
                  <button
                    type="submit"
                    disabled={!hasJoined || submittingContent || campaignEnded || !submissionUrl.trim()}
                    className="px-6 py-3 rounded-full bg-cyan text-black font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 inline-flex items-center gap-2"
                  >
                    {submittingContent ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {campaignEnded ? 'Campaign Ended' : hasJoined ? (submittingContent ? 'Submitting...' : 'Submit Content') : 'Join to Submit'}
                  </button>
                </form>
              </div>
            ) : campaign.follow_accounts?.length || campaign.retweet_links?.length || campaign.comment_links?.length || campaign.engagement_links?.length || campaign.telegram_tasks?.length ? (
              <div className="space-y-6">
                {campaign.follow_accounts?.length ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Follow</h3>
                    {campaign.follow_accounts.map((account) => {
                      const key = taskKey('follow', account);
                      const isVerified = hasJoined || verifiedTasks[key];
                      const isVerifying = verifyingTask === key;

                      return (
                        <div
                          key={account}
                          className={`p-4 rounded-2xl bg-white/5 border transition-colors ${
                            isVerified ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 hover:border-cyan/30'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <p className="text-white font-medium">Follow @{account}</p>
                              <p className="text-xs text-muted mt-1">Required before joining this NFT campaign.</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <a
                                href={`https://x.com/${account}`}
                                target="_blank"
                                rel="noreferrer"
                                className={taskActionPillClass}
                              >
                                Follow
                              </a>
                              <a
                                href={`https://x.com/${account}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-cyan hover:border-cyan/30 inline-flex items-center justify-center transition-colors"
                                aria-label={`Open @${account} on X`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleVerifyTask('follow', account)}
                                disabled={isVerifying || isVerified || !canVerifyTasks}
                                className={`px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                                  isVerified
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : !canVerifyTasks
                                      ? 'bg-white/5 text-muted border border-white/10 cursor-not-allowed'
                                    : 'bg-cyan text-black hover:bg-cyan/90'
                                } disabled:opacity-80`}
                              >
                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : isVerified ? <CheckCircle2 className="w-4 h-4" /> : null}
                                {isVerifying ? 'Verifying...' : isVerified ? 'Verified' : campaignEnded ? 'Ended' : 'Verify'}
                              </button>
                            </div>
                          </div>
                          {taskErrors[key] ? <p className="text-xs text-red-400 mt-3">{taskErrors[key]}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {campaign.retweet_links?.length ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Like & Retweet</h3>
                    {campaign.retweet_links.map((link) => {
                      const key = taskKey('retweet', link);
                      const isVerified = hasJoined || verifiedTasks[key];
                      const isVerifying = verifyingTask === key;

                      return (
                        <div
                          key={link}
                          className={`p-4 rounded-2xl bg-white/5 border transition-colors ${
                            isVerified ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 hover:border-cyan/30'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-white font-medium">Like and retweet required post</p>
                              <p className="text-xs text-muted mt-1 break-all">{link}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <a
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className={taskActionPillClass}
                              >
                                Like & Retweet
                              </a>
                              <a
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-cyan hover:border-cyan/30 inline-flex items-center justify-center transition-colors"
                                aria-label="Open required X post"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleVerifyTask('retweet', link)}
                                disabled={isVerifying || isVerified || !canVerifyTasks}
                                className={`px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                                  isVerified
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : !canVerifyTasks
                                      ? 'bg-white/5 text-muted border border-white/10 cursor-not-allowed'
                                    : 'bg-cyan text-black hover:bg-cyan/90'
                                } disabled:opacity-80`}
                              >
                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : isVerified ? <CheckCircle2 className="w-4 h-4" /> : null}
                                {isVerifying ? 'Verifying...' : isVerified ? 'Verified' : campaignEnded ? 'Ended' : 'Verify'}
                              </button>
                            </div>
                          </div>
                          {taskErrors[key] ? <p className="text-xs text-red-400 mt-3">{taskErrors[key]}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {campaign.comment_links?.length ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Like & Comment</h3>
                    {campaign.comment_links.map((link) => {
                      const key = taskKey('comment', link);
                      const isVerified = hasJoined || verifiedTasks[key];
                      const isVerifying = verifyingTask === key;

                      return (
                        <div
                          key={link}
                          className={`p-4 rounded-2xl bg-white/5 border transition-colors ${
                            isVerified ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 hover:border-cyan/30'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-white font-medium">Like and comment on required post</p>
                              <p className="text-xs text-muted mt-1 break-all">{link}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <a
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-cyan hover:border-cyan/30 inline-flex items-center justify-center transition-colors"
                                aria-label="Open required X post"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleVerifyTask('comment', link)}
                                disabled={isVerifying || isVerified || !canVerifyTasks}
                                className={`px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                                  isVerified
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : !canVerifyTasks
                                      ? 'bg-white/5 text-muted border border-white/10 cursor-not-allowed'
                                      : 'bg-cyan text-black hover:bg-cyan/90'
                                } disabled:opacity-80`}
                              >
                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : isVerified ? <CheckCircle2 className="w-4 h-4" /> : null}
                                {isVerifying ? 'Verifying...' : isVerified ? 'Verified' : campaignEnded ? 'Ended' : 'Verify'}
                              </button>
                            </div>
                          </div>
                          {taskErrors[key] ? <p className="text-xs text-red-400 mt-3">{taskErrors[key]}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {campaign.engagement_links?.length ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Like, Retweet & Comment</h3>
                    {campaign.engagement_links.map((link) => {
                      const key = taskKey('engagement', link);
                      const isVerified = hasJoined || verifiedTasks[key];
                      const isVerifying = verifyingTask === key;

                      return (
                        <div
                          key={link}
                          className={`p-4 rounded-2xl bg-white/5 border transition-colors ${
                            isVerified ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 hover:border-cyan/30'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-white font-medium">Like, retweet, and comment on required post</p>
                              <p className="text-xs text-muted mt-1 break-all">{link}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <a
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-cyan hover:border-cyan/30 inline-flex items-center justify-center transition-colors"
                                aria-label="Open required X post"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleVerifyTask('engagement', link)}
                                disabled={isVerifying || isVerified || !canVerifyTasks}
                                className={`px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                                  isVerified
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : !canVerifyTasks
                                      ? 'bg-white/5 text-muted border border-white/10 cursor-not-allowed'
                                      : 'bg-cyan text-black hover:bg-cyan/90'
                                } disabled:opacity-80`}
                              >
                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : isVerified ? <CheckCircle2 className="w-4 h-4" /> : null}
                                {isVerifying ? 'Verifying...' : isVerified ? 'Verified' : campaignEnded ? 'Ended' : 'Verify'}
                              </button>
                            </div>
                          </div>
                          {taskErrors[key] ? <p className="text-xs text-red-400 mt-3">{taskErrors[key]}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {campaign.telegram_tasks?.length ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Telegram</h3>
                    {campaign.telegram_tasks.map((task) => {
                      const key = taskKey('telegram', task.chat_id);
                      const isVerified = hasJoined || verifiedTasks[key];
                      const isVerifying = verifyingTask === key;
                      const joinLink = task.public_link || null;

                      return (
                        <div
                          key={task.chat_id}
                          className={`p-4 rounded-2xl bg-white/5 border transition-colors ${
                            isVerified ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 hover:border-cyan/30'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-white font-medium">Join Telegram group</p>
                              <p className="text-xs text-muted mt-1 break-all">{task.title || task.chat_id}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {joinLink ? (
                                <a
                                  href={joinLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={taskActionPillClass}
                                >
                                  Join <ExternalLink className="w-4 h-4" />
                                </a>
                              ) : (
                                <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-cyan inline-flex items-center justify-center">
                                  <MessageCircle className="w-4 h-4" />
                                </div>
                              )}
                              {!joinLink ? null : (
                                <div className="hidden sm:inline-flex w-10 h-10 rounded-full border border-white/10 bg-white/5 text-cyan items-center justify-center">
                                  <MessageCircle className="w-4 h-4" />
                                </div>
                              )}
                              <button
                                onClick={() => handleVerifyTask('telegram', task.chat_id)}
                                disabled={isVerifying || isVerified || !canVerifyTasks}
                                className={`px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                                  isVerified
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : !canVerifyTasks
                                      ? 'bg-white/5 text-muted border border-white/10 cursor-not-allowed'
                                    : 'bg-cyan text-black hover:bg-cyan/90'
                                } disabled:opacity-80`}
                              >
                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : isVerified ? <CheckCircle2 className="w-4 h-4" /> : null}
                                {isVerifying ? 'Verifying...' : isVerified ? 'Verified' : campaignEnded ? 'Ended' : 'Verify'}
                              </button>
                            </div>
                          </div>
                          {taskErrors[key] ? <p className="text-xs text-red-400 mt-3">{taskErrors[key]}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-muted">No eligibility tasks are required for this campaign.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
