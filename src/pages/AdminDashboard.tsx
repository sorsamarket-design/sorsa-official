import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Megaphone, ShieldCheck, AlertCircle, CheckCircle2, XCircle, ExternalLink, Loader2 } from 'lucide-react';
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

      <main className="admin-page-main flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Admin Overview</h1>
              <p className="text-muted mt-1">Review and manage creator post submissions.</p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShieldCheck className="w-12 h-12" />
              </div>
              <div className="flex items-center gap-3 text-yellow-400 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Pending Approvals</span>
              </div>
              <div className="text-4xl font-bold">{submissions.length}</div>
            </motion.div>
          </div>

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
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Campaign</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Creator</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Submission Link</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Time</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <Loader2 className="w-8 h-8 text-cyan animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : submissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted">
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle2 className="w-8 h-8 text-green-400" />
                            <p>No pending submissions to review.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      submissions.map((sub) => (
                        <tr key={sub.id} className="group hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium">{sub.campaign?.title}</div>
                          </td>
                          <td className="px-6 py-4">
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
                          <td className="px-6 py-4">
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
                          <td className="px-6 py-4">
                            <div className="text-xs text-muted">
                              {new Date(sub.submitted_at).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
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
