import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, ExternalLink, FileText, Search, Sparkles, Users, Wallet } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopBar from '../components/AdminTopBar';
import AppLoadingScreen from '../components/AppLoadingScreen';
import { getAdminNftContentCampaign, listAdminNftContentCampaigns, type NftCampaign } from '../lib/nftCampaigns';
import { formatCampaignCountdown, getCampaignEndTime } from '../lib/campaignTime';

const appleEase = [0.16, 1, 0.3, 1] as const;

type CreatorProfile = {
  full_name?: string | null;
  x_handle?: string | null;
  wallet_address?: string | null;
  avatar_url?: string | null;
  sorsa_score?: number | null;
};

type CampaignParticipant = {
  id: string;
  creator_id: string;
  status: string;
  joined_at: string | null;
  creator_profile?: CreatorProfile | null;
};

function isPastCampaign(campaign: NftCampaign, now = Date.now()) {
  if (campaign?.status === 'completed') return true;
  const endTime = getCampaignEndTime(campaign?.end_date);
  return Boolean(endTime && endTime <= now);
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not set';
}

function getStatusBadge(status?: string | null) {
  switch (status) {
    case 'approved':
      return <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold uppercase">Approved</span>;
    case 'rejected':
      return <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold uppercase">Rejected</span>;
    case 'submitted':
      return <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase">Pending</span>;
    case 'active':
      return <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-bold uppercase">Joined</span>;
    default:
      return <span className="px-3 py-1 rounded-full bg-white/5 text-muted border border-white/10 text-xs font-bold uppercase">{status || 'Unknown'}</span>;
  }
}

export default function AdminNFTSubmissions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<NftCampaign[]>([]);
  const [campaign, setCampaign] = useState<NftCampaign | null>(null);
  const [participants, setParticipants] = useState<CampaignParticipant[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'live' | 'past'>('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (id) {
        const result = await getAdminNftContentCampaign(id);
        setCampaign(result.campaign || null);
        setParticipants((result.participants || []) as CampaignParticipant[]);
        setSubmissions(result.submissions || []);
      } else {
        const result = await listAdminNftContentCampaigns();
        setCampaigns(result.campaigns || []);
      }
    } catch (err: any) {
      console.error('Failed to load NFT submissions:', err);
      setError(err.message || 'NFT submissions could not be loaded.');
    } finally {
      setHasLoaded(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleCampaigns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return campaigns.filter((item) => {
      const past = isPastCampaign(item, now);
      const matchesTab = activeTab === 'past' ? past : !past;
      const matchesSearch = !query ||
        item.title?.toLowerCase().includes(query) ||
        item.goal?.toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });
  }, [activeTab, campaigns, searchQuery, now]);

  const submissionsByParticipant = useMemo(() => {
    const map = new Map<string, any>();
    submissions.forEach((submission) => {
      if (!submission.participation_id) return;
      const existing = map.get(submission.participation_id);
      const existingTime = existing?.submitted_at ? new Date(existing.submitted_at).getTime() : 0;
      const currentTime = submission.submitted_at ? new Date(submission.submitted_at).getTime() : 0;
      if (!existing || currentTime > existingTime) map.set(submission.participation_id, submission);
    });
    return map;
  }, [submissions]);

  if (isLoading && !hasLoaded) {
    return <AppLoadingScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] flex">
        <AdminSidebar />
        <main className="flex-1 md:ml-64 p-8 flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">{error}</h1>
            <button onClick={() => navigate('/admin/nft-submissions')} className="text-purple-300 hover:text-purple-200">Back to NFT Submissions</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-purple-500/30 flex">
      <AdminSidebar />
      <AdminTopBar />

      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {id && campaign ? (
            <>
              <button
                onClick={() => navigate('/admin/nft-submissions')}
                className="inline-flex items-center gap-2 text-muted hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to NFT Submissions
              </button>

              <motion.header
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
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan/10 text-cyan border border-cyan/20 text-xs font-bold uppercase tracking-wider mb-3">
                      <FileText className="w-3.5 h-3.5" /> Content
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-white">{campaign.title}</h1>
                    <p className="text-muted mt-2">{campaign.goal}</p>
                  </div>
                  <button
                    onClick={fetchData}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white hover:bg-white/10 transition-colors w-fit"
                  >
                    Refresh
                  </button>
                </div>
              </motion.header>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel rounded-2xl p-5 border border-white/10">
                  <Users className="w-5 h-5 text-purple-300 mb-3" />
                  <div className="text-sm text-muted">Participants</div>
                  <div className="text-2xl font-semibold text-white">{participants.length}</div>
                </div>
                <div className="glass-panel rounded-2xl p-5 border border-white/10">
                  <FileText className="w-5 h-5 text-purple-300 mb-3" />
                  <div className="text-sm text-muted">Submissions</div>
                  <div className="text-2xl font-semibold text-white">{submissions.length}</div>
                </div>
                <div className="glass-panel rounded-2xl p-5 border border-white/10">
                  <Sparkles className="w-5 h-5 text-purple-300 mb-3" />
                  <div className="text-sm text-muted">Approved</div>
                  <div className="text-2xl font-semibold text-white">{submissions.filter((submission) => submission.status === 'approved').length}</div>
                </div>
                <div className="glass-panel rounded-2xl p-5 border border-white/10">
                  <Calendar className="w-5 h-5 text-purple-300 mb-3" />
                  <div className="text-sm text-muted">Time Left</div>
                  <div className="whitespace-nowrap text-lg font-semibold text-white tabular-nums">{formatCampaignCountdown(campaign.end_date, now)}</div>
                </div>
              </div>

              <section className="glass-panel rounded-[2rem] overflow-hidden border border-white/10">
                <div className="p-6 border-b border-white/10 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Joined Users</h2>
                    <p className="text-sm text-muted mt-1">Creators who joined this NFT content campaign.</p>
                  </div>
                  <span className="text-sm text-muted">{participants.length} total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Name</th>
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">X Account</th>
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Wallet Address</th>
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Joined</th>
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Submission</th>
                        <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Content</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {participants.length ? participants.map((participant) => {
                        const profile = participant.creator_profile;
                        const submission = submissionsByParticipant.get(participant.id);
                        return (
                          <tr key={participant.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center text-xs font-bold text-purple-300">
                                  {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    (profile?.full_name || profile?.x_handle || 'CR').slice(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <p className="text-white font-medium">{profile?.full_name || 'Creator'}</p>
                                  <p className="text-xs text-muted">Score {Number(profile?.sorsa_score || 0).toLocaleString()}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-6 text-cyan font-medium">{profile?.x_handle ? `@${profile.x_handle}` : 'Not set'}</td>
                            <td className="p-6">
                              <div className="inline-flex items-center gap-2 text-muted font-mono text-xs max-w-[280px] truncate">
                                <Wallet className="w-4 h-4 shrink-0" />
                                {profile?.wallet_address || 'Not set'}
                              </div>
                            </td>
                            <td className="p-6 text-muted">{formatDate(participant.joined_at)}</td>
                            <td className="p-6">{submission ? getStatusBadge(submission.status) : getStatusBadge(participant.status)}</td>
                            <td className="p-6">
                              {submission?.tweet_url ? (
                                <a
                                  href={submission.tweet_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sm text-cyan hover:underline max-w-[220px] truncate"
                                >
                                  <ExternalLink className="w-4 h-4 shrink-0" />
                                  View
                                </a>
                              ) : (
                                <span className="text-muted text-sm">Not submitted</span>
                              )}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-muted">No users have joined this NFT content campaign yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <>
              <div>
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
                      NFT Submissions
                    </motion.h1>
                    <p className="text-muted mt-2">Select a content campaign to view joined creators and submission details.</p>
                  </div>
                  <div className="ml-auto inline-flex w-fit self-start bg-white/5 p-1.5 rounded-full border border-white/10">
                    <button
                      type="button"
                      onClick={() => setActiveTab('live')}
                      className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                        activeTab === 'live' ? 'text-black' : 'text-muted hover:text-white'
                      }`}
                    >
                      {activeTab === 'live' && (
                        <motion.div layoutId="adminNftSubmissionTabBg" className="absolute inset-0 bg-white rounded-full" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
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
                        <motion.div layoutId="adminNftSubmissionTabBg" className="absolute inset-0 bg-white rounded-full" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                      )}
                      <span className="relative z-10">Past</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={fetchData}
                  className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white hover:bg-white/10 transition-colors w-fit"
                >
                  Refresh
                </button>
              </div>

              <div className="flex justify-end">
                <div className="relative w-full lg:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Search campaigns..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>
              </div>

              {visibleCampaigns.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visibleCampaigns.map((item) => (
                    <motion.button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(`/admin/nft-submissions/${item.id}`)}
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
                            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-cyan/10 text-cyan border border-cyan/20 text-[10px] font-bold uppercase tracking-wider mb-2">
                              <FileText className="w-3.5 h-3.5" /> Content
                            </div>
                            <h2 className="text-base font-semibold text-white group-hover:text-purple-200 transition-colors line-clamp-1">{item.title}</h2>
                            <p className="text-xs text-muted mt-1 line-clamp-2">{item.goal}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                            <Users className="w-3.5 h-3.5 text-purple-300 mb-1.5" />
                            <p className="text-base font-semibold text-white">{item.stats?.joined_count || 0}</p>
                            <p className="text-[9px] text-muted uppercase tracking-wider">Participants</p>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                            <FileText className="w-3.5 h-3.5 text-purple-300 mb-1.5" />
                            <p className="text-base font-semibold text-white">{item.stats?.approved_count || 0}</p>
                            <p className="text-[9px] text-muted uppercase tracking-wider">Approved</p>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                            <Calendar className="w-3.5 h-3.5 text-purple-300 mb-1.5" />
                            <p className="text-xs font-semibold text-white">{formatCampaignCountdown(item.end_date, now)}</p>
                            <p className="text-[9px] text-muted uppercase tracking-wider">Left</p>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="glass-panel rounded-[2rem] p-12 border border-dashed border-white/10 text-center">
                  <FileText className="w-12 h-12 text-muted mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-white mb-2">No {activeTab} NFT content campaigns</h2>
                  <p className="text-muted">Admin-created NFT content campaigns will appear here.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
