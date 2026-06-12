import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wallet, MapPin, Edit2, Star, Target, DollarSign, Check, X, RefreshCw, Sparkles, Calendar } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import BindWalletButton from '../components/BindWalletButton';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';

const appleEase = [0.16, 1, 0.3, 1];

import { useCreatorProfile } from '../hooks/useCreatorProfile';
import { useAuth } from '../context/AuthContext';
import { getInitialsAvatarUrl, normalizeAvatarUrl } from '../lib/avatars';
import { supabase } from '../lib/supabase';
import sorsaApi from '../lib/sorsaApi';
import { getCreatorPastCampaignHistory, type CreatorCampaignHistoryItem } from '../lib/creatorCampaignHistory';

export default function CreatorProfile() {
  const { user } = useAuth();
  const { profile, loading, setProfile, refreshProfile } = useCreatorProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingSorsa, setIsSyncingSorsa] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [sorsaSyncMessage, setSorsaSyncMessage] = useState<string | null>(null);
  const [pastCampaigns, setPastCampaigns] = useState<CreatorCampaignHistoryItem[]>([]);
  const [editForm, setEditForm] = useState({
    bio: ''
  });

  // Update edit form when profile loads
  useEffect(() => {
    if (profile) {
      setEditForm({
        bio: profile.bio || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    getCreatorPastCampaignHistory(user.id)
      .then(setPastCampaigns)
      .catch((err) => {
        console.error('Error fetching creator campaign history:', err);
        setPastCampaigns([]);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A1E] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan/20 border-t-cyan rounded-full animate-spin mb-4"></div>
        <p className="text-white/60 animate-pulse font-medium tracking-wide">Loading your profile...</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!user || !profile || isSaving) return;

    const bio = editForm.bio.trim();

    setIsSaving(true);
    setSaveMessage(null);

    const { error: bioError } = await supabase
      .from('creator_profiles')
      .update({ bio })
      .eq('id', user.id);

    if (bioError) {
      setIsSaving(false);
      setSaveMessage(bioError.message || 'Unable to save profile changes.');
      return;
    }

    setIsSaving(false);

    setProfile({
      ...profile,
      bio
    });
    await refreshProfile();
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      bio: profile.bio || ''
    });
    setIsEditing(false);
  };

  const handleSyncSorsa = async () => {
    if (isSyncingSorsa) return;

    setIsSyncingSorsa(true);
    setSorsaSyncMessage(null);

    try {
      const result = await sorsaApi.syncCreatorProfile();
      if (result.profile) {
        setProfile(result.profile);
      }
      await refreshProfile();
      setSorsaSyncMessage('Sorsa score synced.');
    } catch (err: any) {
      setSorsaSyncMessage(err.message || 'Unable to sync Sorsa score right now.');
    } finally {
      setIsSyncingSorsa(false);
    }
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
                  src={normalizeAvatarUrl(profile?.avatar_url) || normalizeAvatarUrl(user?.user_metadata?.avatar_url) || getInitialsAvatarUrl(profile?.x_handle || 'Creator')}
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

                    {profile?.country && (
                      <div className="flex items-center gap-2 text-muted mt-2">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{profile.country}</span>
                      </div>
                    )}
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
                          disabled={isSaving}
                          className="px-4 py-2 rounded-xl bg-cyan text-black text-sm font-semibold hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_15px_rgba(0,212,255,0.3)] disabled:opacity-60 disabled:hover:scale-100"
                        >
                          <Check className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {saveMessage && (
                  <div className="mt-4 text-sm font-medium text-red-400">
                    {saveMessage}
                  </div>
                )}

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

                <button
                  onClick={handleSyncSorsa}
                  disabled={isSyncingSorsa}
                  className="mt-6 px-4 py-2 rounded-full bg-cyan text-black text-sm font-semibold hover:scale-[1.02] transition-transform inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:scale-100"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingSorsa ? 'animate-spin' : ''}`} />
                  {isSyncingSorsa ? 'Syncing...' : 'Sync Sorsa Score'}
                </button>
                {sorsaSyncMessage && (
                  <p className={`mt-3 text-xs ${sorsaSyncMessage.includes('Unable') ? 'text-red-400' : 'text-green-400'}`}>
                    {sorsaSyncMessage}
                  </p>
                )}

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
                  <div className="text-2xl font-semibold text-white mb-1">{pastCampaigns.length || profile?.campaigns_completed || 0}</div>
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
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="text-lg font-semibold text-white">Past Campaigns</h3>
                  <span className="text-sm text-muted">{pastCampaigns.length} total</span>
                </div>
                {pastCampaigns.length ? (
                  <div className="space-y-3">
                    {pastCampaigns.slice(0, 6).map((item) => (
                      <div key={item.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                          {item.campaign.image_url ? (
                            <img src={item.campaign.image_url} alt="" className="w-full h-full object-cover" />
                          ) : item.campaign.is_nft ? (
                            <Sparkles className="w-5 h-5 text-cyan" />
                          ) : (
                            <Target className="w-5 h-5 text-cyan" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium truncate">{item.campaign.title}</p>
                            {item.campaign.is_nft ? (
                              <span className="px-2 py-0.5 rounded-full bg-cyan/10 border border-cyan/20 text-cyan text-[10px] font-bold uppercase">NFT</span>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted truncate">
                            {item.campaign.brand_name || item.campaign.brand_profile?.company_name || (item.campaign.is_nft ? 'Sorsa NFT Campaigns' : 'Campaign')}
                          </p>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-xs text-muted shrink-0">
                          <Calendar className="w-4 h-4" />
                          {item.campaign.end_date ? new Date(item.campaign.end_date).toLocaleDateString() : 'Ended'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center text-muted text-sm">
                    Completed campaign history will appear here.
                  </div>
                )}
              </motion.div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
