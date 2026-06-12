import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Users, DollarSign, Clock, Star, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import BrandSidebar from '../components/BrandSidebar';
import TopBar from '../components/TopBar';
import LinkifiedText from '../components/LinkifiedText';
import { useCampaigns } from '../hooks/useCampaigns';
import { splitCampaignBrief } from '../lib/campaignBrief';

const appleEase = [0.16, 1, 0.3, 1];

export default function CampaignDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getCampaign, getCampaignParticipants, getAllSubmissions } = useCampaigns();
  const [activeTab, setActiveTab] = useState<'creators' | 'submissions' | 'brief'>('creators');
  const [campaign, setCampaign] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [campaignRow, participantRows, submissionRows] = await Promise.all([
        getCampaign(id),
        getCampaignParticipants(id).catch(() => []),
        getAllSubmissions().catch(() => [])
      ]);
      setCampaign(campaignRow);
      setParticipants(participantRows || []);
      setSubmissions((submissionRows || []).filter((s: any) => s.campaign_id === id));
    } finally {
      setLoading(false);
    }
  }, [id, getCampaign, getCampaignParticipants, getAllSubmissions]);

  useEffect(() => { loadData(); }, [loadData]);

  const daysRemaining = campaign?.end_date ? Math.max(0, Math.ceil((new Date(campaign.end_date).getTime() - Date.now()) / 86400000)) : 0;
  const campaignBrief = splitCampaignBrief(campaign?.overview);
  const spotlightRequests = campaignBrief.spotlightRequests;

  return <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex"><BrandSidebar /><TopBar /><main className="flex-1 md:ml-64 mt-20 p-4 md:p-8"><div className="max-w-6xl mx-auto">{loading ? <div className="glass-panel rounded-[2rem] p-10 flex items-center justify-center"><Loader2 className="w-8 h-8 text-cyan animate-spin" /></div> : !campaign ? <div className="glass-panel rounded-[2rem] p-10 text-center text-muted">Campaign not found.</div> : <>
    <div className="flex items-center gap-4 mb-8"><motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: appleEase }} onClick={() => navigate('/brand/dashboard')} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors"><ArrowLeft className="w-5 h-5" /></motion.button><div className="flex-1 flex items-center justify-between"><div className="flex items-center gap-4"><img src={campaign.brand_profile?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(campaign.brand_profile?.company_name || campaign.title)}`} alt={campaign.brand_profile?.company_name || campaign.title} className="w-12 h-12 rounded-2xl object-cover border border-white/20" /><div><h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">{campaign.title}<span className="px-3 py-1 rounded-full text-xs font-medium border bg-cyan/10 text-cyan border-cyan/20">{campaign.status}</span></h1><div className="flex items-center gap-2 mt-2">{(campaign.categories || []).map((cat: string) => <span key={cat} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-muted font-medium">{cat}</span>)}</div></div></div></div></div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8"><div className="glass-panel rounded-2xl p-4 border border-white/10"><div className="flex items-center gap-2 text-muted text-xs font-medium mb-2 uppercase tracking-wider"><Users className="w-4 h-4" /> Creators Joined</div><div className="text-2xl font-semibold text-white">{participants.length}</div></div><div className="glass-panel rounded-2xl p-4 border border-white/10"><div className="flex items-center gap-2 text-muted text-xs font-medium mb-2 uppercase tracking-wider"><DollarSign className="w-4 h-4" /> Budget</div><div className="text-2xl font-semibold text-white">${Number(campaign.budget || 0).toLocaleString()}</div></div><div className="glass-panel rounded-2xl p-4 border border-white/10"><div className="flex items-center gap-2 text-muted text-xs font-medium mb-2 uppercase tracking-wider"><Clock className="w-4 h-4" /> Days Remaining</div><div className="text-2xl font-semibold text-white">{daysRemaining}</div></div></div>
    <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-px">{[{ id: 'creators', label: 'Creators' }, { id: 'submissions', label: 'Submissions' }, { id: 'brief', label: 'Campaign Brief' }].map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-3 text-sm font-medium transition-all relative ${activeTab === tab.id ? 'text-white' : 'text-muted hover:text-white'}`}>{tab.label}{activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan" />}</button>)}</div>
    {activeTab === 'creators' && <div className="glass-panel rounded-[2rem] overflow-hidden border border-white/10"><div className="overflow-x-auto"><table className="w-full text-left border-collapse whitespace-nowrap"><thead><tr className="border-b border-white/10 bg-white/5"><th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Creator</th><th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Sorsa Score</th><th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Joined Date</th><th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Status</th></tr></thead><tbody className="divide-y divide-white/5">{participants.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-muted">No creators have joined yet.</td></tr> : participants.map((item: any) => <tr key={item.id} className="hover:bg-white/5"><td className="p-6 text-white font-medium">@{item.creator_profile?.x_handle || item.creator_id}</td><td className="p-6"><span className="flex items-center gap-1 text-cyan font-semibold"><Star className="w-4 h-4 fill-cyan text-cyan" /> {item.creator_profile?.sorsa_score || 0}</span></td><td className="p-6 text-muted">{item.joined_at ? new Date(item.joined_at).toLocaleDateString() : 'Unknown'}</td><td className="p-6"><span className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">{item.status}</span></td></tr>)}</tbody></table></div></div>}
    {activeTab === 'submissions' && <div className="space-y-4">{submissions.length === 0 ? <div className="glass-panel rounded-2xl p-8 border border-white/10 text-center text-muted">No submissions yet.</div> : submissions.map((sub: any) => <div key={sub.id} className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><h3 className="text-lg font-semibold text-white">@{sub.creator_profile?.x_handle || sub.creator_id}</h3><span className="px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 border bg-cyan/10 text-cyan border-cyan/20">{sub.status}</span></div>{sub.tweet_url && <a href={sub.tweet_url} target="_blank" rel="noreferrer" className="text-sm text-cyan hover:underline flex items-center gap-1 w-fit">View Submission <ExternalLink className="w-3 h-3" /></a>}</div></div>)}</div>}
    {activeTab === 'brief' && <div className="glass-panel rounded-[2rem] p-8 border border-white/10 space-y-8"><div><h3 className="text-lg font-semibold text-white mb-3">Campaign Brief</h3><p className="text-muted leading-relaxed whitespace-pre-wrap"><LinkifiedText text={campaignBrief.overview} /></p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div><h3 className="text-lg font-semibold text-white mb-3">Campaign Goals</h3><ul className="space-y-2"><li className="flex items-start gap-2 text-muted"><CheckCircle2 className="w-5 h-5 text-cyan shrink-0 mt-0.5" /><span><LinkifiedText text={campaign.goal} /></span></li>{spotlightRequests.map((req, i) => <li key={i} className="flex items-start gap-2 text-muted"><CheckCircle2 className="w-5 h-5 text-cyan shrink-0 mt-0.5" /><span><LinkifiedText text={req} /></span></li>)}</ul></div><div><h3 className="text-lg font-semibold text-white mb-3">Requirements</h3><ul className="space-y-2">{campaign.min_sorsa_score && <li className="flex items-start gap-2 text-muted"><AlertCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" /><span>{campaign.min_sorsa_score}+ Sorsa score</span></li>}{campaign.language && <li className="flex items-start gap-2 text-muted"><AlertCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" /><span>{campaign.language}</span></li>}</ul></div></div><div className="pt-6 border-t border-white/10 flex items-center gap-8"><div><p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Start Date</p><p className="text-white font-medium">{campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'Not set'}</p></div><div><p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">End Date</p><p className="text-white font-medium">{campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Not set'}</p></div></div></div>}
  </>}</div></main></div>;
}
