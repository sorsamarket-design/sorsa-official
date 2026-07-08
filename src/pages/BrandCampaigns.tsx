import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';
import BrandSidebar from '../components/BrandSidebar';
import TopBar from '../components/TopBar';
import { useCampaigns } from '../hooks/useCampaigns';

const appleEase = [0.16, 1, 0.3, 1] as const;

export default function BrandCampaigns() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { campaigns, loading } = useCampaigns();

  const filteredCampaigns = campaigns.filter(c => {
    // Map DB status to UI tabs
    const uiStatus = c.status === 'live' ? 'Active' : 
                     c.status === 'draft' ? 'Draft' : 
                     c.status === 'completed' ? 'Completed' : 'Unknown';
    
    const matchesTab = activeTab === 'All' || uiStatus === activeTab;
    const profileName = c.brand_profile?.company_name || 'Unknown Profile';
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          profileName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <BrandSidebar />
      <TopBar />
      
      <main className="brand-page-main flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase }}
              className="text-3xl font-semibold tracking-tight text-white"
            >
              Campaigns
            </motion.h1>
            
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
              onClick={() => navigate('/brand/campaigns/new')}
              className="w-full sm:w-auto px-5 sm:px-6 py-3 rounded-full bg-cyan text-black font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
            >
              <Plus className="w-5 h-5" />
              Create Campaign
            </motion.button>
          </div>

          {/* Filters & Search */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
          >
            <div className="grid w-full grid-cols-4 items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 md:flex md:w-fit md:gap-2">
              {['All', 'Active', 'Draft', 'Completed'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`min-w-0 px-2 sm:px-4 py-2 text-sm font-medium rounded-xl md:rounded-lg transition-all duration-200 ${
                    activeTab === tab ? 'bg-white/10 text-white shadow-sm' : 'text-muted hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex w-full items-center gap-3 md:w-auto">
              <div className="relative min-w-0 flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input 
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all text-sm md:w-64"
                />
              </div>
              <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-muted hover:text-white hover:bg-white/10 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.3 }}
            className="glass-panel rounded-[2rem] overflow-hidden border border-white/10"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Campaign Name</th>
                    <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Profile</th>
                    <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                    <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Creators Joined</th>
                    <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">Budget</th>
                    <th className="p-6 text-xs font-semibold text-muted uppercase tracking-wider">End Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan" />
                      </td>
                    </tr>
                  ) : filteredCampaigns.length > 0 ? (
                    filteredCampaigns.map((campaign) => {
                      const uiStatus = campaign.status === 'live' ? 'Active' : 
                                       campaign.status === 'draft' ? 'Draft' : 
                                       campaign.status === 'completed' ? 'Completed' : 'Unknown';
                      return (
                        <tr 
                          key={campaign.id} 
                          onClick={() => navigate(
                            campaign.status === 'draft' ? '/brand/campaigns/new' : `/brand/campaigns/${campaign.id}`,
                            campaign.status === 'draft' ? { state: { draftCampaign: campaign } } : undefined
                          )}
                          className="hover:bg-white/5 transition-colors group cursor-pointer"
                        >
                          <td className="p-6 text-white font-medium group-hover:text-cyan transition-colors">{campaign.title}</td>
                          <td className="p-6 text-muted">{campaign.brand_profile?.company_name || 'Unknown Profile'}</td>
                          <td className="p-6">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center justify-center ${
                              uiStatus === 'Active' ? 'bg-cyan/10 text-cyan border border-cyan/20' :
                              uiStatus === 'Completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              'bg-white/10 text-muted border border-white/20'
                            }`}>
                              {uiStatus}
                            </span>
                          </td>
                          <td className="p-6 text-white font-medium">0</td>
                          <td className="p-6 text-white font-medium">${campaign.budget?.toLocaleString() || 0}</td>
                          <td className="p-6 text-muted">TBD</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted">
                        No campaigns found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
