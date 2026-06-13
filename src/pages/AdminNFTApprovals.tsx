import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { useCampaigns } from '../hooks/useCampaigns';

const appleEase = [0.16, 1, 0.3, 1] as const;

function isNftContentSubmission(submission: any) {
  const campaign = submission?.campaign;
  if (!campaign) return false;
  const campaignType = String(campaign.campaign_type || '').toLowerCase();
  const categories = Array.isArray(campaign.categories) ? campaign.categories : [];
  const hasNftCategory = categories.some((category: string) => String(category).toLowerCase() === 'nft');

  let hasNftMetadata = false;
  try {
    hasNftMetadata = Boolean(campaign.language && JSON.parse(campaign.language)?.nft);
  } catch {
    hasNftMetadata = false;
  }

  return ['content', 'all'].includes(campaignType) && (hasNftCategory || hasNftMetadata);
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'approved':
      return <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold uppercase">Approved</span>;
    case 'rejected':
      return <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold uppercase">Rejected</span>;
    case 'submitted':
      return <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase">Pending</span>;
    default:
      return <span className="px-3 py-1 rounded-full bg-white/5 text-muted border border-white/10 text-xs font-bold uppercase">{status}</span>;
  }
}

export default function AdminNFTApprovals() {
  const { getAllSubmissions, updateSubmissionStatus } = useCampaigns();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('submitted');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const data = await getAllSubmissions();
      setSubmissions((data || []).filter(isNftContentSubmission));
    } catch (err) {
      console.error('Failed to load NFT submissions:', err);
      setSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const feedback = status === 'rejected'
      ? prompt('Optional rejection feedback:') || ''
      : '';

    setProcessingId(id);
    try {
      await updateSubmissionStatus(id, status, feedback);
      await fetchSubmissions();
    } catch (err) {
      console.error('Error updating NFT submission:', err);
      alert(err instanceof Error ? err.message : 'Failed to update NFT submission');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const matchesFilter = filter === 'all' || submission.status === filter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      submission.campaign?.title?.toLowerCase().includes(query) ||
      submission.creator_profile?.x_handle?.toLowerCase().includes(query) ||
      submission.tweet_url?.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-purple-500/30 flex">
      <AdminSidebar />

      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: appleEase }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <div className="inline-flex items-center gap-2 text-purple-400 text-sm font-semibold tracking-wider uppercase mb-2">
                <Sparkles className="w-4 h-4" />
                Admin NFT Campaigns
              </div>
              <h1 className="text-3xl font-bold">NFT Approvals</h1>
              <p className="text-muted mt-1">Review content submissions from admin-created NFT campaigns.</p>
            </div>
            <button
              onClick={fetchSubmissions}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white hover:bg-white/10 transition-colors"
            >
              Refresh
            </button>
          </motion.header>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full md:w-auto overflow-x-auto">
              {(['all', 'submitted', 'approved', 'rejected'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all whitespace-nowrap ${
                    filter === item ? 'bg-purple-500 text-white shadow-lg' : 'text-muted hover:text-white'
                  }`}
                >
                  {item === 'submitted' ? 'Pending' : item}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search campaign, creator, or link..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Creator</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">NFT Campaign</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Submitted</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Content Link</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted">
                        <div className="flex flex-col items-center gap-2">
                          <ShieldCheck className="w-8 h-8 text-white/20" />
                          <p>No NFT content submissions found.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((submission) => (
                      <tr key={submission.id} className="group hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan/20 border border-white/10 flex items-center justify-center overflow-hidden">
                              {submission.creator_profile?.avatar_url ? (
                                <img src={submission.creator_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-5 h-5 text-muted" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">@{submission.creator_profile?.x_handle || 'creator'}</div>
                              <div className="text-xs text-muted">{submission.creator_profile?.full_name || 'Creator'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium">{submission.campaign?.title}</div>
                          <div className="text-xs text-muted">Total WL: {Number(submission.campaign?.budget || 0).toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(submission.status)}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm">{new Date(submission.submitted_at).toLocaleDateString()}</span>
                            <span className="text-xs text-muted">{new Date(submission.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={submission.tweet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-cyan hover:underline max-w-[220px] truncate"
                          >
                            <ExternalLink className="w-4 h-4 shrink-0" />
                            {submission.tweet_url}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {processingId === submission.id ? (
                            <Loader2 className="w-5 h-5 animate-spin text-cyan ml-auto" />
                          ) : submission.status === 'submitted' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleUpdateStatus(submission.id, 'approved')}
                                className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                                title="Approve"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(submission.id, 'rejected')}
                                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
