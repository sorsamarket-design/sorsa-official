import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, AlertCircle, CheckCircle2, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopBar from '../components/AdminTopBar';
import { useCampaigns } from '../hooks/useCampaigns';

const appleEase = [0.16, 1, 0.3, 1] as const;

export default function AdminDashboard() {
  const { getAllSubmissions, updateSubmissionStatus } = useCampaigns();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const data = await getAllSubmissions('submitted');
      setSubmissions(data || []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'revision' | 'rejected') => {
    let feedback = '';
    if (status === 'revision') {
      feedback = prompt('Enter revision feedback:') || '';
      if (!feedback) return;
    }

    setProcessingId(id);
    try {
      await updateSubmissionStatus(id, status, feedback);
      await fetchSubmissions();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-purple-500/30 flex">
      <AdminSidebar />
      <AdminTopBar />

      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold">Admin Overview</h1>
              <p className="text-muted mt-1">Review and manage creator post submissions.</p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase }}
              className="ml-auto text-right"
            >
              <div className="text-xs font-medium text-yellow-400">Pending Approvals</div>
              <div className="text-2xl font-bold text-white leading-tight">{submissions.length}</div>
            </motion.div>
          </header>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Post Review Queue</h2>
              <button 
                onClick={fetchSubmissions}
                className="text-sm text-cyan hover:underline"
              >
                Refresh
              </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="whitespace-nowrap px-2 py-4 text-[11px] font-bold uppercase tracking-wider text-muted sm:px-6 sm:text-xs">Campaign</th>
                      <th className="whitespace-nowrap px-2 py-4 text-[11px] font-bold uppercase tracking-wider text-muted sm:px-6 sm:text-xs">Creator</th>
                      <th className="whitespace-nowrap px-2 py-4 text-[11px] font-bold uppercase tracking-wider text-muted sm:px-6 sm:text-xs">Entry</th>
                      <th className="whitespace-nowrap px-2 py-4 text-[11px] font-bold uppercase tracking-wider text-muted sm:px-6 sm:text-xs">Time</th>
                      <th className="whitespace-nowrap px-2 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-muted sm:px-6 sm:text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-2 py-12 text-center sm:px-6">
                          <Loader2 className="w-8 h-8 text-cyan animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : submissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-2 py-12 text-center text-muted sm:px-6">
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle2 className="w-8 h-8 text-green-400" />
                            <p>No pending submissions to review.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      submissions.map((sub) => (
                        <tr key={sub.id} className="group hover:bg-white/5 transition-colors">
                          <td className="px-2 py-4 sm:px-6">
                            <div className="text-sm font-medium">{sub.campaign?.title}</div>
                          </td>
                          <td className="px-2 py-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                {sub.creator_profile?.avatar_url ? (
                                  <img src={sub.creator_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Users className="w-4 h-4 text-muted" />
                                )}
                              </div>
                              <span className="text-sm">@{sub.creator_profile?.x_handle}</span>
                            </div>
                          </td>
                          <td className="px-2 py-4 sm:px-6">
                            <a 
                              href={sub.tweet_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-cyan hover:underline flex items-center gap-1 max-w-[200px] truncate"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              {sub.tweet_url}
                            </a>
                          </td>
                          <td className="px-2 py-4 sm:px-6">
                            <div className="text-xs text-muted">
                              {new Date(sub.submitted_at).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-2 py-4 text-right sm:px-6">
                            <div className="flex items-center justify-end gap-2">
                              {processingId === sub.id ? (
                                <Loader2 className="w-5 h-5 animate-spin text-cyan" />
                              ) : (
                                <>
                                  <button 
                                    onClick={() => handleUpdateStatus(sub.id, 'approved')}
                                    className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                                    title="Approve"
                                  >
                                    <CheckCircle2 className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateStatus(sub.id, 'revision')}
                                    className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-400/20 transition-colors"
                                    title="Request Revision"
                                  >
                                    <AlertCircle className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateStatus(sub.id, 'rejected')}
                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                    title="Reject"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
