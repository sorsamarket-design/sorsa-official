import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Edit2, Megaphone, ExternalLink, Loader2 } from 'lucide-react';
import BrandSidebar from '../components/BrandSidebar';
import TopBar from '../components/TopBar';
import { XLogo } from '../components/XLogo';
import { MAX_BRAND_PROFILES, useBrandProfiles } from '../hooks/useBrandProfiles';

const appleEase = [0.16, 1, 0.3, 1] as const;

export default function BrandProfiles() {
  const navigate = useNavigate();
  const { profiles, loading } = useBrandProfiles();
  const profileLimitReached = profiles.length >= MAX_BRAND_PROFILES;

  const startNewCampaign = (brandProfileId?: string) => {
    navigate('/brand/campaigns/new', brandProfileId ? { state: { brandProfileId } } : undefined);
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <BrandSidebar />
      <TopBar />
      
      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-10">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase }}
              className="text-3xl font-semibold tracking-tight text-white"
            >
              Brand Profiles
            </motion.h1>
            
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
              onClick={() => {
                if (!profileLimitReached) navigate('/brand/profiles/new');
              }}
              disabled={profileLimitReached}
              className="w-full sm:w-auto px-5 sm:px-6 py-3 rounded-full bg-cyan text-black font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Plus className="w-5 h-5" />
              {profileLimitReached ? 'Profile Limit Reached' : 'New Brand Profile'}
            </motion.button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-cyan animate-spin" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="glass-panel rounded-[2rem] p-12 text-center border border-white/10">
              <div className="w-16 h-16 rounded-2xl bg-cyan/10 flex items-center justify-center mx-auto mb-4">
                <Megaphone className="w-8 h-8 text-cyan" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Profiles Yet</h3>
              <p className="text-muted mb-6 max-w-md mx-auto">Create your first brand profile to start launching campaigns and connecting with creators.</p>
              <button 
                onClick={() => navigate('/brand/profiles/new')}
                className="px-6 py-3 rounded-full bg-cyan text-black font-semibold shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:scale-105 transition-transform"
              >
                Create Profile
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((profile, index) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: appleEase, delay: 0.1 + index * 0.05 }}
                  className="glass-panel rounded-[2rem] p-6 relative overflow-hidden group flex flex-col h-full border border-white/10"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-cyan/5 blur-[100px] rounded-full pointer-events-none"></div>
                  
                  <div className="flex items-start gap-4 mb-6 relative z-10">
                    <img 
                      src={profile.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.company_name)}&background=random`} 
                      alt={profile.company_name} 
                      className="w-16 h-16 rounded-2xl object-cover border border-white/20 shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-semibold text-white tracking-tight">{profile.company_name}</h3>
                      <div className="flex flex-col gap-1 mt-1">
                        {profile.twitter_handle && (
                          <a href={`https://x.com/${profile.twitter_handle.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors">
                            <XLogo className="w-3 h-3" />
                            {profile.twitter_handle}
                          </a>
                        )}
                        {profile.website && (
                          <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors truncate max-w-[150px]">
                            <ExternalLink className="w-3 h-3" />
                            {profile.website}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted leading-relaxed mb-8 flex-1 relative z-10 line-clamp-3">
                    {profile.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 relative z-10 mt-auto">
                    <button 
                      onClick={() => navigate(`/brand/profiles/new?edit=${profile.id}`)}
                      className="py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button 
                      onClick={() => startNewCampaign(profile.id)}
                      className="py-2.5 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                    >
                      <Megaphone className="w-4 h-4" />
                      Campaign
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
