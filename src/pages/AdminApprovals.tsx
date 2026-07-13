import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Search, Filter, CheckCircle2, XCircle, 
  AlertCircle, ExternalLink, Menu, Loader2, Clock, 
  ChevronRight, Users, ArrowUpDown
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopBar from '../components/AdminTopBar';
import { useCampaigns } from '../hooks/useCampaigns';

const appleEase = [0.16, 1, 0.3, 1] as const;

export default function AdminApprovals() {
  const { getAllSubmissions } = useCampaigns();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected' | 'revision' | 'submitted'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch all submissions (not just 'submitted' ones)
        // We'll need a new hook function or update the existing one
        const data = await getAllSubmissions(); 
        setSubmissions(data || []);
      } catch (err) {
        console.error('Failed to load submissions:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [getAllSubmissions]);

  const filteredSubmissions = submissions.filter(sub => {
    const matchesFilter = filter === 'all' || sub.status === filter;
    const matchesSearch = 
      sub.campaign?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.creator_profile?.x_handle?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold uppercase">Approved</span>;
      case 'rejected':
        return <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold uppercase">Rejected</span>;
      case 'revision':
        return <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs font-bold uppercase">Revision</span>;
      case 'submitted':
        return <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase">Pending</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-white/5 text-muted border border-white/10 text-xs font-bold uppercase">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-purple-500/30 flex">
      <AdminSidebar />
      <AdminTopBar />

      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <header>
            <h1 className="text-3xl font-bold">Submission Approvals</h1>
            <p className="text-muted mt-1">Review the complete history of creator submissions.</p>
          </header>

          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="inline-flex w-fit max-w-full self-start bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto">
              {(['all', 'submitted', 'approved', 'revision', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all whitespace-nowrap ${
                    filter === f ? 'bg-purple-500 text-white shadow-lg' : 'text-muted hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input 
                type="text"
                placeholder="Search campaign or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-max table-auto text-left border-collapse sm:w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="whitespace-nowrap px-1.5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted sm:px-6 sm:py-4 sm:text-xs">Creator</th>
                    <th className="whitespace-nowrap px-1.5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted sm:px-6 sm:py-4 sm:text-xs">Campaign</th>
                    <th className="whitespace-nowrap px-1.5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted sm:px-6 sm:py-4 sm:text-xs">Status</th>
                    <th className="whitespace-nowrap px-1.5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted sm:px-6 sm:py-4 sm:text-xs">Date</th>
                    <th className="whitespace-nowrap px-1.5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted sm:px-6 sm:py-4 sm:text-xs">View Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-12 text-center sm:px-6">
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-12 text-center text-muted sm:px-6">
                        No submissions found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => (
                      <tr key={sub.id} className="group hover:bg-white/5 transition-colors">
                        <td className="px-1.5 py-3 sm:px-6 sm:py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center overflow-hidden">
                              {sub.creator_profile?.avatar_url ? (
                                <img src={sub.creator_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-5 h-5 text-muted" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="max-w-[96px] truncate font-medium sm:max-w-none">@{sub.creator_profile?.x_handle}</div>
                              <div className="max-w-[96px] truncate text-xs text-muted sm:max-w-none">{sub.creator_profile?.company_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-1.5 py-3 sm:px-6 sm:py-4">
                          <div className="max-w-[120px] truncate text-sm font-medium sm:max-w-none">{sub.campaign?.title}</div>
                          <div className="text-xs text-muted">Budget: ${sub.campaign?.budget}</div>
                        </td>
                        <td className="px-1.5 py-3 sm:px-6 sm:py-4">
                          {getStatusBadge(sub.status)}
                        </td>
                        <td className="px-1.5 py-3 sm:px-6 sm:py-4">
                          <div className="flex flex-col whitespace-nowrap">
                            <span className="text-sm">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                            <span className="text-xs text-muted">{new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="px-1.5 py-3 text-right sm:px-6 sm:py-4">
                          <a 
                            href={sub.tweet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-sm hover:bg-white/10 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Tweet
                          </a>
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
