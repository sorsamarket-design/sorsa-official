import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Activity, DollarSign, Users, Star, Megaphone, Loader2 } from 'lucide-react';
import BrandSidebar from '../components/BrandSidebar';
import TopBar from '../components/TopBar';
import { useCampaigns } from '../hooks/useCampaigns';

const appleEase = [0.16, 1, 0.3, 1] as const;

export default function BrandDashboard() {
  const navigate = useNavigate();
  const { campaigns, loading } = useCampaigns();
  const recentCampaigns = campaigns.slice(0, 5);
  const confirmedCampaigns = campaigns.filter((c: any) => c.status !== 'draft' && c.escrow_tx_hash);
  const activeCampaigns = confirmedCampaigns.filter(c => c.status === 'live').length;
  const totalSpent = confirmedCampaigns.reduce((sum, c) => sum + Number(c.budget || 0), 0);
  const creatorsEngaged = campaigns.reduce((sum, c: any) => sum + Number(c.campaign_stats?.[0]?.participants_count || 0), 0);
  const avgSorsaScore = campaigns.length ? Math.round(campaigns.reduce((sum, c: any) => sum + Number(c.avg_sorsa_score || 0), 0) / campaigns.length) : 0;
  const statCards = [
    { title: 'Active Campaigns', value: activeCampaigns, icon: Activity, color: 'text-cyan', bg: 'bg-cyan/10' },
    { title: 'Total USDC Spent', value: `$${totalSpent.toLocaleString()}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
    { title: 'Creators Engaged', value: creatorsEngaged, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { title: 'Avg Sorsa Score', value: avgSorsaScore, icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <BrandSidebar /><TopBar />
      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8"><div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-10">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase }} className="text-3xl font-semibold tracking-tight text-white">Dashboard</motion.h1>
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }} onClick={() => navigate('/brand/campaigns/new')} className="w-full sm:w-auto px-5 sm:px-6 py-3 rounded-full bg-cyan text-black font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform duration-300"><Plus className="w-5 h-5" />Create Campaign</motion.button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">{statCards.map((stat, index) => { const Icon = stat.icon; return <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase, delay: 0.1 + index * 0.05 }} className="glass-panel rounded-[2rem] p-6 relative overflow-hidden group"><div className="flex items-center justify-between mb-4 relative z-10"><span className="text-muted text-sm font-medium">{stat.title}</span><div className={`w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center ${stat.bg} ${stat.color}`}><Icon className="w-6 h-6" /></div></div><div className="text-3xl font-semibold text-white relative z-10 tracking-tight">{stat.value}</div></motion.div>; })}</div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase, delay: 0.3 }}>
          <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-semibold text-white tracking-tight">Recent Campaigns</h2><button onClick={() => navigate('/brand/campaigns')} className="text-sm font-medium text-cyan hover:underline">View All</button></div>
          {loading ? <div className="glass-panel rounded-[2rem] p-10 flex items-center justify-center"><Loader2 className="w-8 h-8 text-cyan animate-spin" /></div> : recentCampaigns.length === 0 ? <div className="glass-panel rounded-[2.5rem] p-16 text-center flex flex-col items-center relative overflow-hidden"><div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 relative z-10"><Megaphone className="w-10 h-10 text-muted" /></div><h3 className="text-xl font-semibold text-white mb-3 relative z-10">No campaigns yet</h3><p className="text-muted mb-8 max-w-md leading-relaxed relative z-10">Create your first campaign to start engaging with creators on SorsaMarket.</p><button onClick={() => navigate('/brand/campaigns/new')} className="px-8 py-4 rounded-full bg-white/10 text-white font-medium flex items-center gap-3 hover:bg-white/20 transition-colors border border-white/10 relative z-10"><Plus className="w-5 h-5" />Create Campaign</button></div> : <div className="glass-panel rounded-[2rem] overflow-hidden border border-white/10"><div className="overflow-x-auto"><table className="w-full text-left border-collapse whitespace-nowrap"><thead><tr className="border-b border-white/10 bg-white/5"><th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Campaign Name</th><th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Profile</th><th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Status</th><th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Budget</th><th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">End Date</th></tr></thead><tbody className="divide-y divide-white/5">{recentCampaigns.map((campaign) => <tr key={campaign.id} onClick={() => navigate(campaign.status === 'draft' ? '/brand/campaigns/new' : `/brand/campaigns/${campaign.id}`, campaign.status === 'draft' ? { state: { draftCampaign: campaign } } : undefined)} className="hover:bg-white/5 transition-colors group cursor-pointer"><td className="p-6 text-white font-medium group-hover:text-cyan transition-colors">{campaign.title}</td><td className="p-6 text-muted">{campaign.brand_profile?.company_name || 'Brand profile'}</td><td className="p-6"><span className="px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center justify-center bg-cyan/10 text-cyan border border-cyan/20">{campaign.status}</span></td><td className="p-6 text-white font-medium">${Number(campaign.budget || 0).toLocaleString()}</td><td className="p-6 text-muted">{campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Not set'}</td></tr>)}</tbody></table></div></div>}
        </motion.div>
      </div></main>
    </div>
  );
}
