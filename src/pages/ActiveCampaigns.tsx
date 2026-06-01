import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertCircle, CheckCircle2, Send, History, Loader2 } from 'lucide-react';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import { mockCreatorProfile } from '../data/mock';
import { useCampaigns } from '../hooks/useCampaigns';

const appleEase = [0.16, 1, 0.3, 1];

export default function ActiveCampaigns() {
  const navigate = useNavigate();
  const { getCreatorActiveCampaigns } = useCampaigns();
  
  const [activeTab, setActiveTab] = useState<'live' | 'past'>('live');
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCreatorActiveCampaigns();
      setActiveCampaigns(data || []);
    } catch (err) {
      console.error('Failed to load active campaigns', err);
    } finally {
      setIsLoading(false);
    }
  }, [getCreatorActiveCampaigns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateDaysRemaining = (endDate?: string) => {
    if (!endDate) return 30;
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle2 };
      case 'submitted':
        return { label: 'Submitted', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Send };
      case 'revision':
        return { label: 'Needs Revision', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertCircle };
      case 'active':
      default:
        return { label: 'Not Submitted', color: 'text-white', bg: 'bg-white/10', border: 'border-white/20', icon: Clock };
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <CreatorTopBar />
      
      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Header & Toggle */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
                className="text-3xl font-semibold tracking-tight text-white"
              >
                My Campaigns {activeCampaigns.length > 0 && `(${activeCampaigns.length})`}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
                className="text-muted mt-1"
              >
                {activeTab === 'live' 
                  ? "Track your progress and submit proofs for campaigns you've joined."
                  : "Review your completed campaigns and earnings history."}
              </motion.p>
            </div>

            {/* Toggle */}
            <div className="flex items-center gap-4">
              <button 
                onClick={loadData}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-muted hover:text-cyan transition-colors"
                title="Refresh Campaigns"
              >
                <History className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
                className="inline-flex bg-white/5 p-1.5 rounded-full border border-white/10"
              >
                <button
                  onClick={() => setActiveTab('live')}
                  className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeTab === 'live' ? 'text-black' : 'text-muted hover:text-white'
                  }`}
                >
                  {activeTab === 'live' && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="absolute inset-0 bg-white rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${activeTab === 'live' ? 'bg-green-500' : 'bg-transparent'}`} />
                    Live
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('past')}
                  className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeTab === 'past' ? 'text-black' : 'text-muted hover:text-white'
                  }`}
                >
                  {activeTab === 'past' && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="absolute inset-0 bg-white rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">Past</span>
                </button>
              </motion.div>
            </div>
          </div>

          {/* Grid */}
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: appleEase }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {isLoading && activeTab === 'live' ? (
              <div className="md:col-span-2 flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-cyan animate-spin mb-4" />
                <p className="text-muted">Loading your campaigns...</p>
              </div>
            ) : activeTab === 'live' ? (
              activeCampaigns.length > 0 ? (
                activeCampaigns.map((item) => {
                  const campaign = item.campaign;
                  const statusConfig = getStatusConfig(item.status);
                  const daysLeft = calculateDaysRemaining(campaign?.end_date);
                  
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => navigate(`/creator/active/${item.id}`)}
                      className="group glass-panel rounded-2xl p-6 border border-white/10 hover:border-cyan/50 hover:shadow-[0_0_30px_rgba(0,212,255,0.15)] transition-all duration-300 cursor-pointer flex flex-col h-full relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-cyan/10 transition-colors"></div>
                      
                      <div className="flex items-start justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-4">
                          <img 
                            src={campaign?.brand_profile?.logo_url || 'https://picsum.photos/seed/default/100/100'} 
                            alt={campaign?.brand_profile?.company_name} 
                            className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h3 className="font-semibold text-white text-lg group-hover:text-cyan transition-colors line-clamp-1">{campaign?.title}</h3>
                            <p className="text-sm text-muted">{campaign?.brand_profile?.company_name}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted">
                            <Clock className="w-4 h-4" />
                            <span className={daysLeft <= 3 ? 'text-yellow-400 font-medium' : ''}>
                              {daysLeft} Days Left
                            </span>
                          </div>
                          
                          <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}>
                            <statusConfig.icon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="md:col-span-2 text-center py-20">
                  <History className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Active Campaigns</h3>
                  <p className="text-muted">Browse and join campaigns to get started.</p>
                  <button 
                    onClick={() => navigate('/creator/campaigns')}
                    className="mt-6 px-6 py-2 rounded-xl bg-cyan text-black font-semibold hover:scale-105 transition-transform"
                  >
                    Browse Campaigns
                  </button>
                </div>
              )
            ) : (
              mockCreatorProfile.pastCampaigns.map((campaign) => (
                <motion.div
                  key={campaign.id}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="group glass-panel rounded-2xl p-6 border border-white/10 hover:border-cyan/50 hover:shadow-[0_0_30px_rgba(0,212,255,0.15)] transition-all duration-300 flex flex-col h-full relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-cyan/10 transition-colors"></div>
                  
                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <img 
                        src={campaign.brandLogo} 
                        alt={campaign.brand} 
                        className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h3 className="font-semibold text-white text-lg group-hover:text-cyan transition-colors line-clamp-1">{campaign.name}</h3>
                        <p className="text-sm text-muted">{campaign.brand}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed
                    </div>
                  </div>

                  <div className="mt-auto space-y-4 relative z-10">
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div>
                        <p className="text-xs text-muted mb-1">Earned</p>
                        <p className="font-semibold text-cyan">${campaign.earned} USDC</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted mb-1">Date</p>
                        <p className="font-medium text-white">{campaign.date}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>

          {activeTab === 'past' && mockCreatorProfile.pastCampaigns.length === 0 && (
            <div className="text-center py-20">
              <History className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Past Campaigns</h3>
              <p className="text-muted">You haven't completed any campaigns yet.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

