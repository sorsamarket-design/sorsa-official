import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Building2, CheckCircle2, Copy, Image as ImageIcon, Loader2, LogOut, MessageCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDisconnect } from 'wagmi';
import BrandSidebar from '../components/BrandSidebar';
import TopBar from '../components/TopBar';
import { useBrandProfiles } from '../hooks/useBrandProfiles';
import { useAuth } from '../context/AuthContext';
import telegramNotifications, { type BrandTelegramGroup } from '../lib/telegramNotifications';

const appleEase = [0.16, 1, 0.3, 1] as const;

function telegramGroupStatusMeta(group: BrandTelegramGroup | null) {
  const status = group?.bot_permission_status || 'unknown';
  if (!group) {
    return {
      label: 'Not Verified',
      detail: 'Add the bot to a public group and verify setup.',
      buttonLabel: 'Connect',
      dotClass: 'bg-white/50',
      pillClass: 'bg-white/5 text-white/70 border-white/10'
    };
  }
  if (status === 'configured') {
    return {
      label: 'Connected',
      detail: 'Bot is active as an admin in this group.',
      buttonLabel: 'Connected',
      dotClass: 'bg-green-400',
      pillClass: 'bg-green-500/10 text-green-300 border-green-500/30'
    };
  }
  if (status === 'needs_admin' || status === 'restricted') {
    return {
      label: 'Admin Permission Needed',
      detail: 'Promote the bot to admin, then verify again.',
      buttonLabel: 'Fix Admin',
      dotClass: 'bg-yellow-300',
      pillClass: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30'
    };
  }
  if (status === 'bot_not_in_chat') {
    return {
      label: 'Disconnected',
      detail: 'The bot was removed from the group. Add it back to reconnect.',
      buttonLabel: 'Reconnect',
      dotClass: 'bg-red-400',
      pillClass: 'bg-red-500/10 text-red-300 border-red-500/30'
    };
  }
  return {
    label: 'Pending Verification',
    detail: 'Verify the group to confirm the bot is installed correctly.',
    buttonLabel: 'Verify',
    dotClass: 'bg-white/50',
    pillClass: 'bg-white/5 text-white/70 border-white/10'
  };
}

export default function BrandSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('company');
  const [telegramGroup, setTelegramGroup] = useState<BrandTelegramGroup | null>(null);
  const [telegramGroupLink, setTelegramGroupLink] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState<string | null>(null);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [telegramBotCopied, setTelegramBotCopied] = useState(false);
  const [telegramVerifySuccess, setTelegramVerifySuccess] = useState(false);
  const { selectedProfile, loading } = useBrandProfiles();
  const { role, signOut, session } = useAuth();
  const { disconnectAsync } = useDisconnect();
  const [formData, setFormData] = useState({
    company_name: '',
    website: '',
    description: '',
    logo_url: '',
  });

  useEffect(() => {
    if (!selectedProfile) return;
    setFormData({
      company_name: selectedProfile.company_name || '',
      website: selectedProfile.website || '',
      description: selectedProfile.description || '',
      logo_url: selectedProfile.logo_url || '',
    });
  }, [selectedProfile]);

  const loadTelegramGroup = async () => {
    if (!selectedProfile?.id) return;
    setTelegramLoading(true);
    setTelegramMessage(null);
    try {
      const result = await telegramNotifications.getBrandGroup(selectedProfile.id, session?.access_token);
      setTelegramGroup(result.group || null);
      setBotUsername(result.botUsername || null);
    } catch (err: any) {
      setTelegramMessage(err.message || 'Telegram group status could not be loaded.');
    } finally {
      setTelegramLoading(false);
    }
  };

  useEffect(() => {
    loadTelegramGroup();
  }, [selectedProfile?.id, session?.access_token]);

  useEffect(() => {
    if (!telegramBotCopied) return;
    const timeout = window.setTimeout(() => setTelegramBotCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [telegramBotCopied]);

  const handleCopyTelegramBotUsername = async () => {
    const username = botUsername || '@AtlasReachBot';
    try {
      if (!navigator.clipboard) throw new Error('Clipboard is unavailable');
      await navigator.clipboard.writeText(username);
      setTelegramBotCopied(true);
    } catch {
      setTelegramMessage('Could not copy the bot username. Please copy it manually.');
    }
  };

  const closeTelegramModal = () => {
    setIsTelegramModalOpen(false);
    setTelegramVerifySuccess(false);
  };

  const handleVerifyTelegramGroup = async () => {
    if (!selectedProfile?.id || !telegramGroupLink.trim()) return;
    setTelegramLoading(true);
    setTelegramMessage(null);
    setTelegramVerifySuccess(false);
    try {
      const result = await telegramNotifications.verifyBrandGroup(selectedProfile.id, telegramGroupLink.trim(), session?.access_token);
      setTelegramGroup(result.group);
      setBotUsername(result.botUsername || botUsername);
      setTelegramMessage('Telegram group connected.');
      setTelegramLoading(false);
      setTelegramVerifySuccess(true);
      window.setTimeout(closeTelegramModal, 900);
    } catch (err: any) {
      setTelegramMessage(err.message || 'Telegram group setup could not be verified.');
      setTelegramVerifySuccess(false);
      setTelegramLoading(false);
    }
  };

  const logo = formData.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.company_name || 'Brand')}`;
  const isTelegramConnected = telegramGroup?.bot_permission_status === 'configured';
  const telegramStatus = telegramGroupStatusMeta(telegramGroup);

  const handleLogout = async () => {
    if (role === 'creator') {
      navigate('/creator/campaigns');
      return;
    }

    try {
      await disconnectAsync();
    } catch (error) {
      console.warn('Wallet disconnect during logout failed:', error);
    }
    await signOut();
    navigate('/login');
  };

  const tabs = [
    { id: 'company', label: 'Company Profile', icon: Building2 },
    { id: 'telegram', label: 'Connect Telegram Group', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <BrandSidebar />
      <TopBar />

      <main className="flex-1 md:ml-64 mt-[5.625rem] p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase }} className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
              Settings
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }} className="text-muted mt-2">
              Manage your company details, team access, and preferences.
            </motion.p>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }} className="flex flex-col md:flex-row gap-8">
            <div className="hidden w-full shrink-0 space-y-2 md:block md:w-64">
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === tab.id ? 'bg-white/10 text-white border border-white/20' : 'text-muted hover:bg-white/5 hover:text-white border border-transparent'}`}>
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
              <div className="pt-4 mt-8 border-t border-white/10">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 font-medium">
                  <LogOut className="w-5 h-5" />
                  <span>{role === 'creator' ? 'Exit Brand Workspace' : 'Log Out'}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="md:hidden rounded-full bg-white/5 border border-white/10 p-1 flex">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 min-h-11 rounded-full px-3 py-2 text-xs font-medium leading-tight transition-colors inline-flex items-center justify-center gap-2 text-center ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-muted hover:text-white'}`}>
                    <tab.icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="glass-panel rounded-[2rem] p-8 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/5 blur-[80px] rounded-full pointer-events-none"></div>

                {loading ? (
                  <div className="relative z-10 text-muted">Loading brand profile...</div>
                ) : !selectedProfile ? (
                  <div className="relative z-10 text-center py-10">
                    <ImageIcon className="w-10 h-10 text-white/20 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">No Brand Profile</h2>
                    <p className="text-muted text-sm">Create a brand profile before editing settings.</p>
                  </div>
                ) : (
                  <div className="relative z-10 space-y-8">
                    {activeTab === 'company' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <h2 className="text-xl font-semibold text-white mb-6">Company Profile</h2>

                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/20 flex items-center justify-center overflow-hidden">
                            <img src={logo} alt={formData.company_name || 'Brand logo'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-muted mb-2">Brand Logo</label>
                            <p className="text-sm text-muted">Logo is managed from your brand profile.</p>
                          </div>
                        </div>

                        <div className="flex gap-5">
                          <div className="min-w-0 flex-[1_1_0]">
                            <label className="block text-sm font-medium text-muted mb-2">Company Name</label>
                            <div className="w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white truncate" aria-label="Company Name">
                              {formData.company_name || '-'}
                            </div>
                          </div>
                          <div className="min-w-0 flex-[1_1_0]">
                            <label className="block text-sm font-medium text-muted mb-2">Website URL</label>
                            <div className="w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white truncate" aria-label="Website URL">
                              {formData.website || '-'}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-muted mb-2">Company Description</label>
                          <div className="w-full min-h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white whitespace-pre-wrap" aria-label="Company Description">
                            {formData.description || '-'}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'telegram' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-xl font-semibold text-white mb-2">Connect Telegram Group</h2>
                            <p className="text-sm text-muted">Connect one public Telegram group to this brand profile for campaign join requirements.</p>
                          </div>
                          <button type="button" onClick={() => setIsTelegramModalOpen(true)} disabled={isTelegramConnected} className={`shrink-0 whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors inline-flex items-center gap-2 ${isTelegramConnected ? 'bg-green-500/10 border border-green-500/30 text-green-300 cursor-default' : 'bg-cyan text-black hover:bg-cyan/90'}`}>
                            {isTelegramConnected && <CheckCircle2 className="w-4 h-4" />}
                            {telegramStatus.buttonLabel}
                          </button>
                        </div>

                        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                          {telegramLoading ? (
                            <div className="flex items-center gap-2 text-muted"><Loader2 className="w-4 h-4 animate-spin" /> Checking Telegram setup...</div>
                          ) : telegramGroup ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="text-white font-medium">{telegramGroup.title || telegramGroup.chat_id}</p>
                                  <p className="text-xs text-muted">{telegramGroup.public_link || telegramGroup.chat_id}</p>
                                </div>
                                <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-2 ${telegramStatus.pillClass}`}>
                                  <span className={`w-2 h-2 rounded-full ${telegramStatus.dotClass}`} />
                                  {telegramStatus.label}
                                </span>
                              </div>
                              <p className="text-xs text-muted">Chat ID: {telegramGroup.chat_id}</p>
                              <p className="text-xs text-muted">{telegramStatus.detail}</p>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm text-muted">No Telegram group connected yet.</p>
                                <p className="text-xs text-muted mt-1">{telegramStatus.detail}</p>
                              </div>
                              <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-2 ${telegramStatus.pillClass}`}>
                                <span className={`w-2 h-2 rounded-full ${telegramStatus.dotClass}`} />
                                {telegramStatus.label}
                              </span>
                            </div>
                          )}
                        </div>

                        {telegramMessage && <p className="text-sm text-cyan">{telegramMessage}</p>}
                      </motion.div>
                    )}

                  </div>
                )}
              </div>

              <div className="md:hidden pt-4 border-t border-white/10">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 font-medium">
                  <LogOut className="w-5 h-5" />
                  <span>{role === 'creator' ? 'Exit Brand Workspace' : 'Log Out'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {isTelegramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeTelegramModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.3, ease: appleEase }} className="relative w-full max-w-lg glass-panel rounded-[2rem] p-8 border border-white/10 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan/10 blur-[60px] rounded-full pointer-events-none"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-xl font-semibold text-white">Connect Telegram Group</h3>
              <button onClick={closeTelegramModal} className="p-2 rounded-full hover:bg-white/10 text-muted hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5 relative z-10">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3 text-sm text-muted">
                <p>1. Add the AtlasReach bot to your public Telegram group.</p>
                <p>2. Promote the bot to admin so it can verify members.</p>
                <p>3. Make sure the group is public and has a t.me username.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Bot Username</label>
                <div className="flex items-center gap-2">
                  <input value={botUsername || '@AtlasReachBot'} readOnly className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
                  <button type="button" onClick={handleCopyTelegramBotUsername} className={`shrink-0 whitespace-nowrap h-11 rounded-xl border px-3 text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 ${telegramBotCopied ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>
                    {telegramBotCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{telegramBotCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="sr-only" aria-live="polite">{telegramBotCopied ? 'Telegram bot username copied.' : ''}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Public Group Link</label>
                <input value={telegramGroupLink} onChange={(e) => setTelegramGroupLink(e.target.value)} placeholder="https://t.me/your_public_group" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-cyan/50" />
              </div>
              {telegramMessage && <p className="text-sm text-cyan">{telegramMessage}</p>}
              <button type="button" onClick={handleVerifyTelegramGroup} disabled={telegramLoading || telegramVerifySuccess || !telegramGroupLink.trim()} className={`w-full py-3 rounded-xl font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-colors ${telegramVerifySuccess ? 'bg-green-500/15 text-green-300 border border-green-500/30' : 'bg-cyan text-black hover:bg-cyan/90'}`}>
                {telegramLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {telegramLoading ? 'Verifying...' : telegramVerifySuccess ? 'Verified!' : 'Verify Bot Setup'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
