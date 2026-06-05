import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Bell, Shield, Wallet, Twitter, LogOut, Send, CheckCircle2, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useDisconnect } from 'wagmi';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import { useAuth } from '../context/AuthContext';
import { useCreatorProfile } from '../hooks/useCreatorProfile';
import { useTelegramPreferences } from '../hooks/useTelegramPreferences';
import { type TelegramPreferences } from '../lib/telegramNotifications';

const appleEase = [0.16, 1, 0.3, 1];
const TELEGRAM_CONNECT_POLL_MS = 4000;
const TELEGRAM_CONNECT_POLL_MAX_MS = 30 * 60 * 1000;

const shortenAddress = (value?: string) => value ? `${value.slice(0, 6)}...${value.slice(-4)}` : 'Not bound';

export default function CreatorSettings() {
  const [activeTab, setActiveTab] = useState('notifications');
  const { signOut } = useAuth();
  const { profile, loading } = useCreatorProfile();
  const {
    status: telegramStatus,
    loading: telegramLoading,
    saving: telegramSaving,
    error: telegramError,
    loadPreferences,
    createConnectLink,
    disconnectTelegram,
    updatePreferences: saveTelegramPreferences
  } = useTelegramPreferences();
  const [connectLink, setConnectLink] = useState<any>(null);
  const [telegramMessage, setTelegramMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const telegramPollStartedAt = useRef<number | null>(null);
  const navigate = useNavigate();
  const { disconnect } = useDisconnect();
  const { address } = useAccount();
  const telegramPreferencesDisabled = telegramLoading || telegramSaving || !telegramStatus?.connected;

  const handleLogout = async () => {
    disconnect();
    await signOut();
    navigate('/login');
  };

  const walletAddress = profile?.wallet_address || address;

  useEffect(() => {
    let cancelled = false;
    async function loadTelegramPreferences() {
      const status = await loadPreferences();
      if (!cancelled && !status && telegramError) setTelegramMessage(telegramError);
    }

    loadTelegramPreferences();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!connectLink?.connectCode || telegramStatus?.connected) {
      telegramPollStartedAt.current = null;
      return;
    }

    telegramPollStartedAt.current = Date.now();
    const poll = window.setInterval(async () => {
      const startedAt = telegramPollStartedAt.current;
      if (!startedAt || Date.now() - startedAt > TELEGRAM_CONNECT_POLL_MAX_MS) {
        window.clearInterval(poll);
        telegramPollStartedAt.current = null;
        return;
      }

      const nextStatus = await loadPreferences({ force: true });
      if (nextStatus?.connected) {
        setConnectLink(null);
        setTelegramMessage(null);
        window.clearInterval(poll);
        telegramPollStartedAt.current = null;
      }
    }, TELEGRAM_CONNECT_POLL_MS);

    return () => window.clearInterval(poll);
  }, [connectLink?.connectCode, loadPreferences, telegramStatus?.connected]);

  const handleConnectTelegram = async () => {
    try {
      setTelegramMessage(null);
      const link = await createConnectLink();
      setConnectLink(link);
      if (link.telegramLink) {
        window.open(link.telegramLink, '_blank', 'noopener,noreferrer');
      }
    } catch (error: any) {
      setTelegramMessage(error.message || 'Telegram link could not be created.');
    }
  };

  const handleDisconnectTelegram = async () => {
    try {
      setTelegramMessage(null);
      await disconnectTelegram();
      setConnectLink(null);
    } catch (error: any) {
      setTelegramMessage(error.message || 'Telegram could not be disconnected.');
    }
  };

  const handleCopyTelegramCode = async () => {
    if (!connectLink?.connectCode) return;
    try {
      await navigator.clipboard.writeText(connectLink.connectCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch (error: any) {
      setTelegramMessage('Code could not be copied.');
    }
  };

  const handlePreferenceChange = async (key: keyof TelegramPreferences, value: boolean) => {
    const current = telegramStatus?.preferences || {
      newCampaigns: true,
      campaignUpdates: true,
      payments: true
    };
    const next = { ...current, [key]: value };
    try {
      await saveTelegramPreferences(next);
    } catch (error: any) {
      setTelegramMessage(error.message || 'Telegram preferences could not be updated.');
    }
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'connections', label: 'Connections', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <CreatorTopBar />
      
      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase }} className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-cyan" /> Settings
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }} className="text-muted mt-2">
              Manage your account preferences and connected services.
            </motion.p>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }} className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-64 shrink-0 space-y-2 flex flex-col justify-between h-full">
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === tab.id ? 'bg-white/10 text-white border border-white/20' : 'text-muted hover:bg-white/5 hover:text-white border border-transparent'}`}>
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
              <div className="pt-8 mt-auto">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 font-medium">
                  <LogOut className="w-5 h-5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>

            <div className="flex-1">
              <div className="glass-panel rounded-[2rem] p-8 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/5 blur-[80px] rounded-full pointer-events-none"></div>
                
                {loading ? (
                  <div className="relative z-10 text-muted">Loading settings...</div>
                ) : (
                  <div className="relative z-10 space-y-8">
                    {activeTab === 'notifications' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <h2 className="text-xl font-semibold text-white mb-6">Notification Preferences</h2>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-cyan/10 flex items-center justify-center"><Send className="w-5 h-5 text-cyan" /></div>
                            <div>
                              <h3 className="font-medium text-white">Telegram</h3>
                              <p className="text-sm text-muted">
                                {telegramLoading
                                  ? 'Checking connection...'
                                  : telegramStatus?.connected
                                    ? `Connected${telegramStatus.telegramUsername ? ` as @${telegramStatus.telegramUsername}` : ''}`
                                    : 'Not connected'}
                              </p>
                            </div>
                          </div>
                          {telegramStatus?.connected ? (
                            <button onClick={handleDisconnectTelegram} disabled={telegramSaving} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-muted hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50">
                              {telegramSaving ? 'Disconnecting...' : 'Disconnect'}
                            </button>
                          ) : (
                            <button onClick={handleConnectTelegram} disabled={telegramSaving || telegramLoading} className="px-4 py-2 rounded-xl bg-cyan text-black text-sm font-semibold hover:bg-cyan/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                              <Send className="w-4 h-4" />
                              Connect Telegram
                            </button>
                          )}
                        </div>
                        {connectLink?.connectCode && !telegramStatus?.connected && (
                          <div className="p-4 rounded-xl bg-cyan/10 border border-cyan/20 text-sm text-cyan flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span className="min-w-0">Open Telegram and send this code to the bot: <span className="font-mono break-all">{connectLink.connectCode}</span></span>
                            </div>
                            <button onClick={handleCopyTelegramCode} className="shrink-0 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan text-black text-xs font-semibold hover:bg-cyan/90 transition-colors">
                              <Copy className="w-3.5 h-3.5" />
                              {copiedCode ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        )}
                        {(telegramMessage || telegramError) && (
                          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                            {telegramMessage || telegramError}
                          </div>
                        )}
                        <div className="space-y-4">
                          {[
                            { label: 'New Campaigns', key: 'newCampaigns', description: 'Live campaign announcements.' },
                            { label: 'Campaign Updates', key: 'campaignUpdates', description: 'Submission approval and rejection decisions.' },
                            { label: 'Payment Alerts', key: 'payments', description: 'Payout and wallet activity.' }
                          ].map((item) => (
                            <div key={item.key} className={`flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 ${telegramPreferencesDisabled ? 'opacity-60' : ''}`}>
                              <div>
                                <h3 className="font-medium text-white">{item.label}</h3>
                                <p className="text-sm text-muted">{item.description}</p>
                              </div>
                              <label className={`relative inline-flex items-center ${telegramPreferencesDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(telegramStatus?.preferences?.[item.key as keyof TelegramPreferences])}
                                  disabled={telegramPreferencesDisabled}
                                  onChange={(event) => handlePreferenceChange(item.key as keyof TelegramPreferences, event.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-white/10 rounded-full peer-checked:bg-cyan after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/60 peer-checked:after:bg-black after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'connections' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <h2 className="text-xl font-semibold text-white mb-6">Connected Accounts</h2>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><Twitter className="w-5 h-5 text-white" /></div>
                              <div>
                                <h3 className="font-medium text-white">X (Twitter)</h3>
                                <p className="text-sm text-cyan">{profile?.x_handle ? `@${profile.x_handle.replace('@', '')}` : 'Not connected'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-cyan/10 flex items-center justify-center"><Send className="w-5 h-5 text-cyan" /></div>
                              <div>
                                <h3 className="font-medium text-white">Telegram</h3>
                                <p className={`text-sm ${telegramStatus?.connected ? 'text-cyan' : 'text-muted'}`}>
                                  {telegramLoading
                                    ? 'Checking connection...'
                                    : telegramStatus?.connected
                                      ? telegramStatus.telegramUsername
                                        ? `@${telegramStatus.telegramUsername}`
                                        : 'Connected'
                                      : 'Not connected'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-cyan/10 flex items-center justify-center"><Wallet className="w-5 h-5 text-cyan" /></div>
                              <div>
                                <h3 className="font-medium text-white">Wallet Address</h3>
                                <p className="text-sm text-muted font-mono">{shortenAddress(walletAddress)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
