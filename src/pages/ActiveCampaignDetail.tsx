import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, CheckCircle2, AlertCircle, Link as LinkIcon, Send, Clock, Loader2, Sparkles, XCircle, ExternalLink, Target, Zap } from 'lucide-react';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import { useCampaigns } from '../hooks/useCampaigns';
import { useCreatorProfile } from '../hooks/useCreatorProfile';

const appleEase = [0.16, 1, 0.3, 1];

export default function ActiveCampaignDetail() {
  const { id } = useParams(); // This is the participation ID
  const navigate = useNavigate();
  const { getParticipationDetail, submitLink, getParticipationSubmissions } = useCampaigns();
  const { profile: creatorProfile } = useCreatorProfile();
  
  const [participation, setParticipation] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [showBugModal, setShowBugModal] = useState(false);
  const [debugError, setDebugError] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [partData, subsData] = await Promise.all([
        getParticipationDetail(id),
        getParticipationSubmissions(id)
      ]);
      
      if (partData) setParticipation(partData);
      if (subsData) setSubmissions(subsData);
    } catch (err) {
      console.error('Error loading participation:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id, getParticipationDetail, getParticipationSubmissions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!id || !creatorProfile || !participation) return;

    if (submissions.length >= 10) {
      setError('Maximum of 10 links allowed per campaign.');
      return;
    }

    // Basic validation
    const handleWithoutAt = creatorProfile.x_handle.replace('@', '');
    if (!url.toLowerCase().includes(handleWithoutAt.toLowerCase())) {
      setError(`Submit the post link from your bound X account (@${handleWithoutAt}).`);
      return;
    }

    // Check for duplicates
    if (submissions.some(s => s.tweet_url === url)) {
      setError('This link has already been submitted.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitLink(id, participation.campaign_id, url);
      setUrl('');
      await loadData();
    } catch (err: any) {
      console.error('Submission Error:', err);
      setError(err.message || 'Failed to submit link. Click for details.');
      setDebugError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle2 };
      case 'submitted':
        return { label: 'Submitted', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Send };
      case 'revision':
        return { label: 'Needs Revision', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertCircle };
      case 'rejected':
        return { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle };
      default:
        return { label: 'Pending', color: 'text-white/60', bg: 'bg-white/5', border: 'border-white/10', icon: Clock };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A1E] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan animate-spin" />
      </div>
    );
  }

  if (!participation) {
    return (
      <div className="min-h-screen bg-[#0A0A1E] flex flex-col items-center justify-center text-white">
        <h2 className="text-xl mb-4">Participation not found</h2>
        <button onClick={() => navigate('/creator/active')} className="text-cyan hover:underline">Back to My Campaigns</button>
      </div>
    );
  }

  const campaign = participation.campaign;

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan-500/30 flex">
      <CreatorSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/creator/active')}
              className="group flex items-center gap-2 text-muted hover:text-white transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="font-medium">Back to My Campaigns</span>
            </button>
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-cyan/10 border border-cyan/20">
              <Sparkles className="w-4 h-4 text-cyan" />
              <span className="text-sm font-semibold text-cyan">Active Campaign</span>
            </div>
          </div>

          {/* Campaign Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8">
              <div className="w-32 h-32 bg-cyan/10 rounded-full blur-3xl group-hover:bg-cyan/20 transition-colors duration-500" />
            </div>

            <div className="relative flex flex-col md:flex-row gap-8 items-start">
              <img 
                src={campaign?.brand_profile?.logo_url || 'https://picsum.photos/seed/default/100/100'} 
                alt={campaign?.title}
                className="w-20 h-20 rounded-2xl border border-white/10 shadow-2xl"
              />
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    {campaign?.title}
                  </h1>
                  <p className="text-lg text-muted mt-1">{campaign?.brand_profile?.company_name}</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm">
                    <Target className="w-4 h-4 text-cyan" />
                    <span>{campaign?.category}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-green-400">
                    <Zap className="w-4 h-4" />
                    <span>{campaign?.reward_pool} {campaign?.reward_token}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Submissions Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Submission Form */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Proof of Work</h2>
                  <div className="text-sm text-muted">
                    Submissions: <span className={submissions.length >= 10 ? 'text-red-400' : 'text-cyan'}>{submissions.length}/10</span>
                  </div>
                </div>

                {submissions.length < 10 ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted ml-1">Tweet Link</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <LinkIcon className="w-5 h-5 text-muted group-focus-within:text-cyan transition-colors" />
                        </div>
                        <input 
                          type="url"
                          required
                          placeholder="https://x.com/your-handle/status/..."
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/50 transition-all placeholder:text-white/20"
                        />
                      </div>
                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => debugError && setShowBugModal(true)}
                          className="flex items-center gap-2 text-red-400 text-sm mt-2 cursor-pointer hover:underline"
                        >
                          <AlertCircle className="w-4 h-4" />
                          {error}
                        </motion.div>
                      )}
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting || !url}
                      className="w-full py-4 rounded-2xl bg-cyan text-black font-bold text-lg hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit New Link <Send className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-center">
                    You have reached the maximum limit of 10 submissions for this campaign.
                  </div>
                )}
              </motion.div>

              {/* Submissions List */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold ml-1">Your Submissions</h3>
                {submissions.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-muted">
                    No links submitted yet.
                  </div>
                ) : (
                  submissions.map((sub, idx) => {
                    const config = getStatusConfig(sub.status);
                    return (
                      <motion.div 
                        key={sub.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 group hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xs font-mono text-white/40 uppercase">#{submissions.length - idx}</span>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.color} border ${config.border}`}>
                              {config.label}
                            </div>
                          </div>
                          <a 
                            href={sub.tweet_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-cyan hover:underline truncate block"
                          >
                            {sub.tweet_url}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          {sub.feedback && (
                            <button 
                              title={sub.feedback}
                              className="p-2 rounded-lg bg-white/5 text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                            >
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          )}
                          <a 
                            href={sub.tweet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/5 text-muted hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-6"
              >
                <h3 className="font-bold mb-4">Campaign Rules</h3>
                <ul className="space-y-4 text-sm text-muted">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-cyan/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-cyan" />
                    </div>
                    <span>Minimum 1 tweet, Maximum 10 tweets allowed.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-cyan/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-cyan" />
                    </div>
                    <span>All posts must be from your bound X account.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-cyan/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-cyan" />
                    </div>
                    <span>Final rewards will be calculated after brand review.</span>
                  </li>
                </ul>
              </motion.div>

              <div className="p-6 rounded-3xl bg-cyan/5 border border-cyan/10">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-cyan" />
                  <span className="font-bold">Next Steps</span>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  Once you submit your links, our admins will review them. Approved links will be tracked for impressions until the campaign ends.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bug/Error Modal */}
      <AnimatePresence>
        {(debugError) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1A2E] border border-red-500/30 rounded-2xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(239,68,68,0.2)]"
            >
              <div className="flex items-center gap-3 text-red-400 mb-4">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-xl font-bold">Submission Error Detected</h3>
              </div>
              
              <div className="bg-black/40 rounded-xl p-4 mb-6 font-mono text-sm text-red-300/90 break-all overflow-y-auto max-h-48 border border-white/5">
                {typeof debugError === 'object' ? JSON.stringify(debugError, null, 2) : String(debugError)}
              </div>

              <div className="space-y-4">
                <p className="text-sm text-muted">
                  This error usually means the database RLS policies are blocking the update. Please ensure you have created the <code className="text-cyan">campaign_submissions</code> table and its policies.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setError('');
                      setDebugError(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
                  >
                    Dismiss
                  </button>
                  <button 
                    onClick={() => window.location.reload()}
                    className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/30 transition-colors"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
