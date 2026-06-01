import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wallet, MapPin, Edit2, Star, Target, DollarSign, Calendar, Check, X, Zap } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import BindWalletButton from '../components/BindWalletButton';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import { mockCreatorProfile } from '../data/mock';

const appleEase = [0.16, 1, 0.3, 1];

import { useCreatorProfile } from '../hooks/useCreatorProfile';
import { useAuth } from '../context/AuthContext';

export default function CreatorProfile() {
  const { user } = useAuth();
  const { profile, loading, setProfile } = useCreatorProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    bio: '',
    tags: ''
  });

  // Update edit form when profile loads
  useEffect(() => {
    if (profile) {
      setEditForm({
        bio: profile.bio || '',
        tags: (profile.tags || []).join(', ')
      });
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A1E] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan/20 border-t-cyan rounded-full animate-spin mb-4"></div>
        <p className="text-white/60 animate-pulse font-medium tracking-wide">Loading your profile...</p>
      </div>
    );
  }

  const handleSave = () => {
    setProfile({
      ...profile,
      bio: editForm.bio,
      tags: editForm.tags.split(',').map(t => t.trim()).filter(t => t)
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      bio: profile.bio || '',
      tags: (profile.tags || []).join(', ')
    });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <CreatorTopBar />
      
      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase }}
            className="glass-panel rounded-[2rem] p-8 border border-white/10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan/5 blur-[120px] rounded-full pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
              <div className="shrink-0 relative group">
                <img 
                  src={user?.user_metadata?.avatar_url || profile?.avatar_url || `https://picsum.photos/seed/${profile?.x_handle || 'creator'}/150/150`} 
                  alt={profile?.full_name || profile?.x_handle || 'Creator'} 
                  className="w-32 h-32 rounded-[2rem] object-cover border-2 border-white/10"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex-1 w-full">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-semibold text-white tracking-tight flex items-center gap-3">
                      {profile?.full_name || profile?.x_handle || 'Creator Account'}
                    </h1>
                    <p className="text-cyan font-medium mt-1">@{profile?.x_handle || 'username'}</p>
                    
                    <div className="flex items-center gap-2 text-muted mt-2">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{profile?.country || 'Location not set'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isEditing ? (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" /> Edit Profile
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={handleCancel}
                          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
                        >
                          <X className="w-4 h-4" /> Cancel
                        </button>
                        <button 
                          onClick={handleSave}
                          className="px-4 py-2 rounded-xl bg-cyan text-black text-sm font-semibold hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                        >
                          <Check className="w-4 h-4" /> Save
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  {!isEditing ? (
                    <p className="text-muted leading-relaxed max-w-2xl">{profile?.bio || 'This creator hasn\'t added a bio yet.'}</p>
                  ) : (
                    <div>
                      <label className="block text-xs text-muted mb-1 uppercase tracking-wider">Bio</label>
                      <textarea 
                        value={editForm.bio}
                        onChange={e => setEditForm({...editForm, bio: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan/50 transition-colors resize-none h-24"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  {!isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      {(profile?.tags || []).map(tag => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-muted mb-1 uppercase tracking-wider">Tags (comma separated)</label>
                      <input 
                        type="text" 
                        value={editForm.tags}
                        onChange={e => setEditForm({...editForm, tags: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan/50 transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column: Score & Wallet */}
            <div className="space-y-8">
              {/* Sorsa Score */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
                className="glass-panel rounded-[2rem] p-8 border border-white/10 text-center relative overflow-hidden"
              >
                <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-6">Sorsa Score</h3>
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                    <circle 
                      cx="80" cy="80" r="72" 
                      stroke="currentColor" 
                      strokeWidth="12" 
                      fill="transparent" 
                      strokeDasharray="452.39" 
                      strokeDashoffset={452.39 - (452.39 * (profile?.sorsa_score || 0)) / 1000} 
                      className="text-cyan drop-shadow-[0_0_15px_rgba(0,212,255,0.4)]" 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold text-white tracking-tighter">{Math.round(profile?.sorsa_score || 0)}</span>
                    <span className="text-xs text-cyan font-medium mt-1">/ 1000</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1 mt-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`w-5 h-5 ${star <= 4 ? 'text-cyan fill-cyan' : 'text-white/20'}`} />
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-xs text-muted uppercase tracking-wider font-medium mb-1">Base Reward</div>
                    <div className="text-xs text-muted">Based on Sorsa Score</div>
                  </div>
                  <div className="text-2xl font-bold text-cyan">${((profile?.sorsa_score || 0) * 0.1).toFixed(2)}</div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
                className="glass-panel rounded-[2rem] p-6 border border-white/10"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-cyan/10 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5 text-cyan" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">Binded Wallet</h3>
                    <p className="text-xs text-muted">Base Network</p>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <BindWalletButton />
                </div>
              </motion.div>
            </div>

            {/* Right Column: Stats, Campaigns, Reviews */}
            <div className="md:col-span-2 space-y-8">
              
              {/* Stats Row */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.3 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4"
              >
                <div className="glass-panel rounded-2xl p-5 border border-white/10">
                  <Target className="w-5 h-5 text-muted mb-3" />
                  <div className="text-2xl font-semibold text-white mb-1">{profile?.campaigns_completed || 0}</div>
                  <div className="text-xs text-muted font-medium">Campaigns</div>
                </div>
                <div className="glass-panel rounded-2xl p-5 border border-white/10">
                  <DollarSign className="w-5 h-5 text-muted mb-3" />
                  <div className="text-2xl font-semibold text-white mb-1">${profile?.total_earned?.toLocaleString() || 0}</div>
                  <div className="text-xs text-muted font-medium">Earned</div>
                </div>
                <div className="glass-panel rounded-2xl p-5 border border-white/10">
                  <Star className="w-5 h-5 text-muted mb-3" />
                  <div className="text-2xl font-semibold text-white mb-1">{profile?.sorsa_points?.toLocaleString() || 0}</div>
                  <div className="text-xs text-muted font-medium">Points</div>
                </div>
                <div className="glass-panel rounded-2xl p-5 border border-white/10">
                  <span className="text-muted font-bold text-sm block mb-3">X</span>
                  <div className="text-2xl font-semibold text-white mb-1">{profile?.follower_count?.toLocaleString() || 0}</div>
                  <div className="text-xs text-muted font-medium">Followers</div>
                </div>
              </motion.div>

              {/* Past Campaigns */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.4 }}
                className="glass-panel rounded-[2rem] p-6 border border-white/10"
              >
                <div className="space-y-4">
                  {(profile?.pastCampaigns || []).map(campaign => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <img src={campaign.brandLogo} alt={campaign.brand} className="w-10 h-10 rounded-full bg-white/10" referrerPolicy="no-referrer" />
                        <div>
                          <h4 className="font-medium text-white text-sm">{campaign.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted">{campaign.brand}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <span className="text-xs text-muted">{campaign.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-cyan mb-1">+${campaign.earned}</div>
                        <div className="flex items-center gap-0.5 justify-end">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={`w-3 h-3 ${star <= campaign.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
