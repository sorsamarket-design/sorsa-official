import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, ArrowLeft, Calendar, Check, Clock, Copy, Download, Loader2, Sparkles, Star, Ticket, Users } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopBar from '../components/AdminTopBar';
import AppLoadingScreen from '../components/AppLoadingScreen';
import LinkifiedText from '../components/LinkifiedText';
import { finalizeAdminRaffle, getAdminRaffle, getNftCampaignPrimaryAllocation, listAdminRaffles, type NftCampaign, type RaffleWinner } from '../lib/nftCampaigns';
import { formatCampaignCountdown, getCampaignEndTime } from '../lib/campaignTime';
import { createXlsxBlob, downloadBlob } from '../lib/xlsxExport';

const appleEase = [0.16, 1, 0.3, 1] as const;

type RaffleParticipant = {
  id: string;
  creator_id: string;
  status: string;
  joined_at: string | null;
  approved_at?: string | null;
  base_reward?: number | null;
  creator_profile?: {
    x_handle?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    sorsa_score?: number | null;
    follower_count?: number | null;
    wallet_address?: string | null;
  } | null;
};

function statusClass(status: string) {
  if (status === 'approved') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (status === 'rejected') return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (status === 'submitted') return 'bg-cyan/10 text-cyan border-cyan/20';
  return 'bg-white/10 text-white border-white/20';
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not set';
}

function nftCampaignStatusLabel(status?: string | null) {
  if (status === 'draft') return 'Live';
  if (status === 'completed') return 'Past';
  return status || 'Live';
}

function filenameSafe(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'raffle';
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard copy failed');
}

export default function AdminRaffles() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<NftCampaign[]>([]);
  const [campaign, setCampaign] = useState<NftCampaign | null>(null);
  const [participants, setParticipants] = useState<RaffleParticipant[]>([]);
  const [stats, setStats] = useState({ joined_count: 0, approved_count: 0, rejected_count: 0 });
  const [winners, setWinners] = useState<RaffleWinner[]>([]);
  const [finalizedAt, setFinalizedAt] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState('');
  const [downloadStatus, setDownloadStatus] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'live' | 'past'>('live');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');

    const request = id
      ? getAdminRaffle(id).then((result) => {
          if (!isMounted) return;
          setCampaign(result.campaign);
          setParticipants(result.participants || []);
          setStats(result.stats || { joined_count: 0, approved_count: 0, rejected_count: 0 });
          setWinners(result.campaign?.raffle_results || []);
          setFinalizedAt(result.campaign?.raffle_finalized_at || null);
        })
      : listAdminRaffles().then((result) => {
          if (!isMounted) return;
          setCampaigns(result.campaigns || []);
        });

    request
      .catch((err) => {
        if (isMounted) setError(err.message || 'Raffle campaigns could not be loaded.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const pendingCount = useMemo(
    () => Math.max(0, stats.joined_count - stats.approved_count - stats.rejected_count),
    [stats]
  );
  const raffleEndTime = getCampaignEndTime(campaign?.end_date);
  const raffleEnded = Boolean(raffleEndTime && raffleEndTime <= now);
  const visibleCampaigns = useMemo(() => {
    return campaigns.filter((item) => {
      const endTime = getCampaignEndTime(item.end_date);
      const isPast = item.status === 'completed' || Boolean(endTime && endTime <= now);
      return activeTab === 'past' ? isPast : !isPast;
    });
  }, [activeTab, campaigns, now]);

  const handleFinalizeRaffle = async () => {
    if (!id || !campaign) return;
    if (!confirm(`Finalize ${campaign.title}? This will randomly select winners from eligible joined creators and lock the result.`)) return;

    setFinalizing(true);
    setFinalizeError('');
    try {
      const result = await finalizeAdminRaffle(id);
      setWinners(result.winners || []);
      setFinalizedAt(result.finalized_at || new Date().toISOString());
      setCampaign((current) => current ? {
        ...current,
        status: 'completed',
        raffle_results: result.winners || [],
        raffle_finalized_at: result.finalized_at || null
      } : current);
    } catch (err: any) {
      setFinalizeError(err.message || 'Raffle could not be finalized.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownloadWinners = () => {
    if (!campaign || winners.length === 0) return;

    const walletRows = winners
      .map((winner) => String(winner.wallet_address || '').trim())
      .filter(Boolean)
      .map((wallet) => [wallet]);

    const blob = createXlsxBlob('Winning Wallets', [['Wallet Address'], ...walletRows]);
    const datePart = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `${filenameSafe(campaign.title)}-winning-wallets-${datePart}.xlsx`);
    setDownloadStatus('Download started.');
    window.setTimeout(() => setDownloadStatus(''), 3000);
  };

  const handleCopyWinners = async () => {
    const walletRows = winners
      .map((winner) => String(winner.wallet_address || '').trim())
      .filter(Boolean);
    if (walletRows.length === 0) return;

    try {
      await copyText(walletRows.join('\n'));
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 3000);
    } catch {
      setCopyStatus('error');
    }
  };

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] flex">
        <AdminSidebar />
        <main className="flex-1 md:ml-64 p-8 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">{error}</h1>
            <button onClick={() => navigate('/admin/raffles')} className="text-purple-300 hover:text-purple-200">Back to Raffle</button>
          </div>
        </main>
      </div>
    );
  }

  const selectedCampaignAllocation = campaign ? getNftCampaignPrimaryAllocation(campaign) : null;

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-purple-500/30 flex">
      <AdminSidebar />
      <AdminTopBar />
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {id && campaign ? (
            <>
              <button
                onClick={() => navigate('/admin/raffles')}
                className="inline-flex items-center gap-2 text-muted hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Raffle
              </button>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
                className="glass-panel rounded-[2rem] border border-white/10 overflow-hidden"
              >
                <div className="w-full aspect-[3/1] bg-white/5 border-b border-white/10 relative overflow-hidden">
                  {campaign.background_image_url || campaign.image_url ? (
                    <img src={campaign.background_image_url || campaign.image_url || ''} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500/20 via-white/[0.03] to-cyan/10" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-[#0A0A1E]/70" />
                </div>

                <div className="p-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex items-start gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                      {campaign.image_url ? (
                        <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
                      ) : (
                        <Ticket className="w-9 h-9 text-purple-300" />
                      )}
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-bold uppercase tracking-wider mb-3">
                        <Ticket className="w-3.5 h-3.5" /> Raffle
                      </div>
                      <h1 className="text-3xl font-semibold tracking-tight text-white">{campaign.title}</h1>
                      <p className="text-muted mt-2">{campaign.goal}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold uppercase text-white w-fit">
                    {nftCampaignStatusLabel(campaign.status)}
                  </span>
                </div>
              </motion.div>

              <div className="grid grid-cols-4 gap-1.5 sm:gap-4">
                <div className="glass-panel min-w-0 rounded-2xl border border-white/10 p-2 sm:p-5">
                  <Users className="mb-2 h-4 w-4 text-purple-300 sm:mb-3 sm:h-5 sm:w-5" />
                  <div className="text-[0.6rem] leading-tight text-muted sm:text-sm">Participants</div>
                  <div className="break-words text-[0.85rem] font-bold leading-tight text-white sm:text-2xl sm:font-semibold">{stats.joined_count}</div>
                </div>
                <div className="glass-panel min-w-0 rounded-2xl border border-white/10 p-2 sm:p-5">
                  <Ticket className="mb-2 h-4 w-4 text-purple-300 sm:mb-3 sm:h-5 sm:w-5" />
                  <div className="text-[0.6rem] leading-tight text-muted sm:text-sm">{selectedCampaignAllocation?.label || 'Total WL'}</div>
                  <div className="break-words text-[0.85rem] font-bold leading-tight text-white sm:text-2xl sm:font-semibold">{Number(selectedCampaignAllocation?.value || 0).toLocaleString()}</div>
                </div>
                <div className="glass-panel min-w-0 rounded-2xl border border-white/10 p-2 sm:p-5">
                  <Star className="mb-2 h-4 w-4 text-purple-300 sm:mb-3 sm:h-5 sm:w-5" />
                  <div className="text-[0.6rem] leading-tight text-muted sm:text-sm">Sorsa Threshold</div>
                  <div className="break-words text-[0.85rem] font-bold leading-tight text-white sm:text-2xl sm:font-semibold">{Number(campaign.min_sorsa_score || 0).toLocaleString()}+</div>
                </div>
                <div className="glass-panel min-w-0 rounded-2xl border border-white/10 p-2 sm:p-5">
                  <Clock className="mb-2 h-4 w-4 text-purple-300 sm:mb-3 sm:h-5 sm:w-5" />
                  <div className="text-[0.6rem] leading-tight text-muted sm:text-sm">Time Left</div>
                  <div className="whitespace-nowrap text-[0.68rem] font-bold leading-tight text-white tabular-nums sm:text-lg sm:font-semibold lg:text-base xl:text-lg">{formatCampaignCountdown(campaign.end_date, now)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <section className="lg:col-span-2 glass-panel rounded-[2rem] p-8 border border-white/10">
                  <h2 className="text-xl font-semibold text-white mb-4">Campaign Details</h2>
                  <div className="text-muted leading-relaxed whitespace-pre-line">
                    <LinkifiedText text={campaign.overview || 'No campaign brief provided.'} />
                  </div>
                </section>
                <section className="glass-panel rounded-[2rem] p-8 border border-white/10">
                  <h2 className="text-xl font-semibold text-white mb-4">Raffle Stats</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm"><span className="text-muted">Pending</span><span className="text-white font-semibold">{pendingCount}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted">Approved</span><span className="text-green-400 font-semibold">{stats.approved_count}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted">Rejected</span><span className="text-red-400 font-semibold">{stats.rejected_count}</span></div>
                    <div className="pt-4 border-t border-white/10 flex justify-between text-sm"><span className="text-muted">Ends</span><span className="text-white">{formatDate(campaign.end_date)}</span></div>
                  </div>
                  <button
                    type="button"
                    onClick={handleFinalizeRaffle}
                    disabled={finalizing || winners.length > 0 || !raffleEnded}
                    className="mt-6 w-full px-5 py-3 rounded-xl bg-purple-500 text-white font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 inline-flex items-center justify-center gap-2"
                  >
                    {finalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {winners.length > 0 ? 'Raffle Finalized' : finalizing ? 'Finalizing...' : raffleEnded ? 'Finalize Raffle' : 'Finalize After End Date'}
                  </button>
                  {!raffleEnded && !winners.length ? <p className="text-xs text-muted mt-3 text-center">Finalization unlocks when the campaign ends.</p> : null}
                  {finalizedAt ? <p className="text-xs text-muted mt-3 text-center">Finalized {new Date(finalizedAt).toLocaleString()}</p> : null}
                  {finalizeError ? <p className="text-sm text-red-400 mt-3">{finalizeError}</p> : null}
                </section>
              </div>

              <section className="glass-panel rounded-[2rem] overflow-hidden border border-white/10">
                <div className="p-6 border-b border-white/10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-semibold text-white">Raffle Results</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-muted">{winners.length} selected</span>
                    {winners.length ? (
                      <>
                        <button
                          type="button"
                          onClick={handleCopyWinners}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-purple-400/40 hover:bg-purple-500/10"
                        >
                          {copyStatus === 'copied' ? <Check className="h-4 w-4 text-green-300" /> : <Copy className="h-4 w-4 text-purple-300" />}
                          {copyStatus === 'copied' ? 'Copied' : 'Copy Wallets'}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadWinners}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-purple-400/40 hover:bg-purple-500/10"
                        >
                          <Download className="h-4 w-4 text-purple-300" />
                          Download Winners
                        </button>
                      </>
                    ) : null}
                  </div>
                {downloadStatus || copyStatus === 'error' ? (
                  <p className={`text-xs sm:text-right ${copyStatus === 'error' ? 'text-red-400' : 'text-cyan'}`}>
                    {copyStatus === 'error' ? 'Could not copy wallets automatically.' : downloadStatus}
                  </p>
                ) : null}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Name</th>
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">X Account</th>
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Wallet Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {winners.length ? winners.map((winner) => (
                        <tr key={winner.participant_id} className="hover:bg-white/5 transition-colors">
                          <td className="p-6 text-white font-medium">{winner.name || 'Creator'}</td>
                          <td className="p-6 text-cyan font-medium">{winner.x_account ? `@${winner.x_account}` : 'Not set'}</td>
                          <td className="p-6 text-muted font-mono text-xs">{winner.wallet_address || 'Not set'}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={3} className="p-12 text-center text-muted">Finalize this raffle to generate the selected WL winners.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="glass-panel rounded-[2rem] overflow-hidden border border-white/10">
                <div className="p-6 border-b border-white/10 flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-white">Joined Users</h2>
                  <span className="text-sm text-muted">{participants.length} total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Creator</th>
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Sorsa Score</th>
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Joined</th>
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {participants.length ? participants.map((participant) => (
                        <tr key={participant.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center text-xs font-bold text-purple-300">
                                {participant.creator_profile?.avatar_url ? (
                                  <img src={participant.creator_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  (participant.creator_profile?.x_handle || 'CR').slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div>
                                <p className="text-white font-medium">@{participant.creator_profile?.x_handle || participant.creator_id}</p>
                                <p className="text-xs text-muted">{participant.creator_profile?.full_name || 'Creator'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6 text-cyan font-semibold">{Number(participant.creator_profile?.sorsa_score || 0).toLocaleString()}</td>
                          <td className="p-6 text-muted">{formatDate(participant.joined_at)}</td>
                          <td className="p-6">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${statusClass(participant.status)}`}>
                              {participant.status}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="p-12 text-center text-muted">No users have joined this raffle yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: appleEase }}
                    className="text-purple-400 text-sm font-semibold tracking-wider uppercase mb-1"
                  >
                    Admin NFT Campaigns
                  </motion.div>
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
                    className="text-3xl font-semibold tracking-tight text-white"
                  >
                    Raffle
                  </motion.h1>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
                  className="ml-auto inline-flex w-fit self-start bg-white/5 p-1.5 rounded-full border border-white/10"
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab('live')}
                    className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeTab === 'live' ? 'text-black' : 'text-muted hover:text-white'
                    }`}
                  >
                    {activeTab === 'live' && (
                      <motion.div
                        layoutId="adminRaffleTabBg"
                        className="absolute inset-0 bg-white rounded-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${activeTab === 'live' ? 'bg-green-500' : 'bg-transparent'}`} />
                      Live
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('past')}
                    className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeTab === 'past' ? 'text-black' : 'text-muted hover:text-white'
                    }`}
                  >
                    {activeTab === 'past' && (
                      <motion.div
                        layoutId="adminRaffleTabBg"
                        className="absolute inset-0 bg-white rounded-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">Past</span>
                  </button>
                </motion.div>
              </div>

              {visibleCampaigns.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visibleCampaigns.map((item) => {
                    const primaryAllocation = getNftCampaignPrimaryAllocation(item);
                    return (
                    <motion.button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(`/admin/raffles/${item.id}`)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: appleEase }}
                      className="text-left glass-panel rounded-2xl border border-white/10 hover:border-purple-500/40 transition-all overflow-hidden group"
                    >
                      <div className="w-full aspect-[4/1] bg-white/5 border-b border-white/10 overflow-hidden">
                        {item.background_image_url || item.image_url ? (
                          <img src={item.background_image_url || item.image_url || ''} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500/20 via-white/[0.03] to-cyan/10" />
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold uppercase tracking-wider mb-2">
                              <Ticket className="w-3.5 h-3.5" /> Raffle
                            </div>
                            <h2 className="text-base font-semibold text-white group-hover:text-purple-200 transition-colors line-clamp-1">{item.title}</h2>
                            <p className="text-xs text-muted mt-1 line-clamp-2">{item.goal}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold uppercase text-white shrink-0">
                            {nftCampaignStatusLabel(item.status)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                            <Users className="w-3.5 h-3.5 text-purple-300 mb-1.5" />
                            <p className="text-base font-semibold text-white">{item.stats?.joined_count || 0}</p>
                            <p className="text-[9px] text-muted uppercase tracking-wider">Participants</p>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                            <Ticket className="w-3.5 h-3.5 text-purple-300 mb-1.5" />
                            <p className="text-base font-semibold text-white">{primaryAllocation.value.toLocaleString()}</p>
                            <p className="text-[9px] text-muted uppercase tracking-wider">{primaryAllocation.label}</p>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                            <Calendar className="w-3.5 h-3.5 text-purple-300 mb-1.5" />
                            <p className="text-xs font-semibold text-white">{formatCampaignCountdown(item.end_date, now)}</p>
                            <p className="text-[9px] text-muted uppercase tracking-wider">Left</p>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="glass-panel rounded-[2rem] p-12 border border-dashed border-white/10 text-center">
                  <Ticket className="w-12 h-12 text-muted mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-white mb-2">No {activeTab} raffle campaigns</h2>
                  <p className="text-muted">Raffle NFT campaigns created by admins will appear here.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
