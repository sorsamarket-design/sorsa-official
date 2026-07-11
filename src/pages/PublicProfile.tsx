import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Star, Target, DollarSign, Calendar, ArrowLeft, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCreatorPastCampaignHistory, type CreatorCampaignHistoryItem } from '../lib/creatorCampaignHistory';
import CreatorAvatar from '../components/CreatorAvatar';

const appleEase = [0.16, 1, 0.3, 1] as const;

export default function PublicProfile() {
  const { handle } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [pastCampaigns, setPastCampaigns] = useState<CreatorCampaignHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cleanHandle = (handle || '').replace('@', '');
    if (!cleanHandle) { setLoading(false); return; }
    async function loadProfile() {
      const { data } = await supabase.from('creator_profiles').select('*').eq('x_handle', cleanHandle).maybeSingle();
      setProfile(data);
      if (data?.id) {
        try {
          setPastCampaigns(await getCreatorPastCampaignHistory(data.id));
        } catch (err) {
          console.error('Error fetching public creator campaign history:', err);
          setPastCampaigns([]);
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, [handle]);

  return <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 p-4 md:p-8"><div className="max-w-4xl mx-auto"><Link to="/" className="inline-flex items-center gap-2 text-muted hover:text-white transition-colors mb-8"><ArrowLeft className="w-4 h-4" /> Back to AtlasReach</Link></div>{loading ? <div className="max-w-4xl mx-auto glass-panel rounded-[2rem] p-10 text-center text-muted">Loading profile...</div> : !profile ? <div className="max-w-4xl mx-auto glass-panel rounded-[2rem] p-10 text-center text-muted">Profile not found.</div> : <div className="max-w-4xl mx-auto space-y-8"><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase }} className="glass-panel rounded-[2rem] p-8 border border-white/10 relative overflow-hidden"><div className="relative z-10 flex flex-col md:flex-row gap-8 items-start"><CreatorAvatar src={profile.avatar_url} name={profile.x_handle || 'Creator'} alt={profile.full_name || profile.x_handle} className="w-32 h-32 rounded-[2rem] object-cover border-2 border-white/10" /><div className="flex-1 w-full"><h1 className="text-3xl font-semibold text-white tracking-tight">{profile.full_name || profile.x_handle}</h1><p className="text-cyan font-medium mt-1">@{profile.x_handle}</p>{profile.country && <div className="flex items-center gap-2 text-muted mt-2"><MapPin className="w-4 h-4" /><span className="text-sm">{profile.country}</span></div>}<p className="text-muted leading-relaxed max-w-2xl mt-6">{profile.bio || 'This creator has not added a bio yet.'}</p></div></div></motion.div><div className="grid grid-cols-1 md:grid-cols-3 gap-8"><div className="glass-panel rounded-[2rem] p-8 border border-white/10 text-center"><h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-6">Sorsa Score</h3><div className="text-5xl font-bold text-white">{Math.round(profile.sorsa_score || 0)}</div><p className="text-xs text-cyan font-medium mt-1">/ 1000</p><div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between"><div className="text-left"><div className="text-xs text-muted uppercase tracking-wider font-medium mb-1">Base Reward</div><div className="text-xs text-muted">Based on Sorsa Score</div></div><div className="text-2xl font-bold text-cyan">${((profile.sorsa_score || 0) * 0.1).toFixed(2)}</div></div></div><div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4"><div className="glass-panel rounded-2xl p-5 border border-white/10"><Target className="w-5 h-5 text-muted mb-3" /><div className="text-2xl font-semibold text-white mb-1">{pastCampaigns.length || profile.campaigns_completed || 0}</div><div className="text-xs text-muted font-medium">Campaigns</div></div><div className="glass-panel rounded-2xl p-5 border border-white/10"><DollarSign className="w-5 h-5 text-muted mb-3" /><div className="text-2xl font-semibold text-white mb-1">${profile.total_earned || 0}</div><div className="text-xs text-muted font-medium">Earned</div></div><div className="glass-panel rounded-2xl p-5 border border-white/10"><Star className="w-5 h-5 text-muted mb-3" /><div className="text-2xl font-semibold text-white mb-1">{profile.activity_points || 0}</div><div className="text-xs text-muted font-medium">Points</div></div><div className="glass-panel rounded-2xl p-5 border border-white/10"><Calendar className="w-5 h-5 text-muted mb-3" /><div className="text-lg font-semibold text-white mb-1 mt-1">{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</div><div className="text-xs text-muted font-medium mt-1.5">Joined</div></div></div></div><div className="glass-panel rounded-[2rem] p-6 border border-white/10"><div className="flex items-center justify-between gap-4 mb-4"><h3 className="text-lg font-semibold text-white">Past Campaigns</h3><span className="text-sm text-muted">{pastCampaigns.length} total</span></div>{pastCampaigns.length ? <div className="space-y-3">{pastCampaigns.slice(0, 6).map((item) => <div key={item.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">{item.campaign.image_url ? <img src={item.campaign.image_url} alt="" className="w-full h-full object-cover" /> : item.campaign.is_nft ? <Sparkles className="w-5 h-5 text-cyan" /> : <Target className="w-5 h-5 text-cyan" />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-white font-medium truncate">{item.campaign.title}</p>{item.campaign.is_nft ? <span className="px-2 py-0.5 rounded-full bg-cyan/10 border border-cyan/20 text-cyan text-[10px] font-bold uppercase">NFT</span> : null}</div><p className="text-xs text-muted truncate">{item.campaign.brand_name || item.campaign.brand_profile?.company_name || (item.campaign.is_nft ? 'AtlasReach NFT Campaigns' : 'Campaign')}</p></div><div className="hidden sm:flex items-center gap-2 text-xs text-muted shrink-0"><Calendar className="w-4 h-4" />{item.campaign.end_date ? new Date(item.campaign.end_date).toLocaleDateString() : 'Ended'}</div></div>)}</div> : <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center text-muted text-sm">Completed campaign history will appear here.</div>}</div></div>}</div>;
}
