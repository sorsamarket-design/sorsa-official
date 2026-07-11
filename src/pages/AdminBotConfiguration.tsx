import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Copy, Loader2, MessageCircle, RefreshCw, X } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopBar from '../components/AdminTopBar';
import { useAuth } from '../context/AuthContext';
import telegramNotifications, { type BrandTelegramGroup } from '../lib/telegramNotifications';

const appleEase = [0.16, 1, 0.3, 1] as const;

function telegramGroupStatusMeta(group: BrandTelegramGroup | null) {
  const status = group?.bot_permission_status || 'unknown';
  if (!group) {
    return {
      label: 'Pending Verification',
      detail: 'Add the bot to a public Telegram group and verify setup.',
      dotClass: 'bg-white/50',
      pillClass: 'bg-white/5 text-white/70 border-white/10'
    };
  }
  if (status === 'configured') {
    return {
      label: 'Connected',
      detail: 'Bot is active as an admin in this group.',
      dotClass: 'bg-green-400',
      pillClass: 'bg-green-500/10 text-green-300 border-green-500/30'
    };
  }
  if (status === 'needs_admin' || status === 'restricted') {
    return {
      label: 'Needs Admin Permission',
      detail: 'Promote the bot to admin, then verify again.',
      dotClass: 'bg-yellow-300',
      pillClass: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30'
    };
  }
  if (status === 'bot_not_in_chat') {
    return {
      label: 'Bot Removed',
      detail: 'The bot was removed from the group. Add it back to reconnect.',
      dotClass: 'bg-red-400',
      pillClass: 'bg-red-500/10 text-red-300 border-red-500/30'
    };
  }
  return {
    label: 'Pending Verification',
    detail: 'Verify the group to confirm the bot is installed correctly.',
    dotClass: 'bg-white/50',
    pillClass: 'bg-white/5 text-white/70 border-white/10'
  };
}

export default function AdminBotConfiguration() {
  const { session } = useAuth();
  const [groups, setGroups] = useState<BrandTelegramGroup[]>([]);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [groupLink, setGroupLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);

  const loadGroups = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await telegramNotifications.listAdminGroups(session?.access_token);
      setGroups(result.groups || []);
      setBotUsername(result.botUsername || null);
    } catch (err: any) {
      setMessage(err.message || 'Telegram groups could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [session?.access_token]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const closeModal = () => {
    setIsModalOpen(false);
    setVerifySuccess(false);
  };

  const handleCopyBotUsername = async () => {
    const username = botUsername || '@AtlasReachBot';
    try {
      if (!navigator.clipboard) throw new Error('Clipboard is unavailable');
      await navigator.clipboard.writeText(username);
      setCopied(true);
    } catch {
      setMessage('Could not copy the bot username. Please copy it manually.');
    }
  };

  const handleVerify = async () => {
    if (!groupLink.trim()) return;
    setVerifying(true);
    setMessage(null);
    setVerifySuccess(false);
    try {
      const result = await telegramNotifications.verifyAdminGroup(groupLink.trim(), session?.access_token);
      setGroups((current) => {
        const next = current.filter((group) => group.chat_id !== result.group.chat_id);
        return [result.group, ...next];
      });
      setBotUsername(result.botUsername || botUsername);
      setMessage('Telegram group connected.');
      setVerifying(false);
      setVerifySuccess(true);
      window.setTimeout(closeModal, 900);
    } catch (err: any) {
      setMessage(err.message || 'Telegram group setup could not be verified.');
      setVerifySuccess(false);
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-purple-500/30 flex">
      <AdminSidebar />
      <AdminTopBar />

      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Bot Configuration</h1>
              <p className="text-muted mt-1">Connect Telegram groups for admin NFT raffle join tasks.</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={loadGroups} disabled={loading} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50 inline-flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button type="button" onClick={() => setIsModalOpen(true)} className="shrink-0 whitespace-nowrap px-5 py-2.5 rounded-xl bg-cyan text-black text-sm font-semibold hover:bg-cyan/90 transition-colors inline-flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Connect Telegram Group
              </button>
            </div>
          </motion.header>

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }} className="glass-panel rounded-[2rem] p-6 border border-white/10">
            {loading ? (
              <div className="flex items-center gap-2 text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking Telegram groups...
              </div>
            ) : groups.length ? (
              <div className="space-y-4">
                {groups.map((group) => {
                  const status = telegramGroupStatusMeta(group);
                  return (
                    <div key={group.chat_id} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">{group.title || group.chat_id}</p>
                          <p className="text-xs text-muted mt-1 break-all">{group.public_link || group.chat_id}</p>
                          <p className="text-xs text-muted mt-2">Chat ID: {group.chat_id}</p>
                          <p className="text-xs text-muted mt-1">{status.detail}</p>
                          {group.last_error && <p className="text-xs text-red-300 mt-2">{group.last_error}</p>}
                        </div>
                        <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-2 ${status.pillClass}`}>
                          <span className={`w-2 h-2 rounded-full ${status.dotClass}`} />
                          {status.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageCircle className="w-10 h-10 text-white/20 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">No Telegram Group Connected</h2>
                <p className="text-sm text-muted max-w-md mx-auto">Connect a public Telegram group so admins can add verified Telegram join tasks to NFT raffles.</p>
              </div>
            )}

            {message && <p className="text-sm text-cyan mt-5">{message}</p>}
          </motion.section>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg glass-panel border border-white/10 rounded-2xl bg-[#11112A] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Connect Telegram Group</h3>
              <button onClick={closeModal} className="text-muted hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3 text-sm text-muted">
                <p>1. Add the AtlasReach bot to your public Telegram group.</p>
                <p>2. Promote the bot to admin so it can verify members.</p>
                <p>3. Make sure the group is public and has a t.me username.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Bot Username</label>
                <div className="flex items-center gap-2">
                  <input value={botUsername || '@AtlasReachBot'} readOnly className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
                  <button type="button" onClick={handleCopyBotUsername} className={`shrink-0 whitespace-nowrap h-11 rounded-xl border px-3 text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 ${copied ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="sr-only" aria-live="polite">{copied ? 'Telegram bot username copied.' : ''}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Public Group Link</label>
                <input value={groupLink} onChange={(e) => setGroupLink(e.target.value)} placeholder="https://t.me/your_public_group" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-cyan/50" />
              </div>
              {message && <p className="text-sm text-cyan">{message}</p>}
              <button type="button" onClick={handleVerify} disabled={verifying || verifySuccess || !groupLink.trim()} className={`w-full py-3 rounded-xl font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-colors ${verifySuccess ? 'bg-green-500/15 text-green-300 border border-green-500/30' : 'bg-cyan text-black hover:bg-cyan/90'}`}>
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {verifying ? 'Verifying...' : verifySuccess ? 'Verified!' : 'Verify Bot Setup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
