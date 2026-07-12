import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, CheckCircle2, Clock, Image, Loader2, MessageCircle, Minus, Plus, Sparkles, Users, X } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopBar from '../components/AdminTopBar';
import { createNftCampaign, getAdminTelegramGroupStatuses, type NftCampaignType, type TelegramGroupStatus } from '../lib/nftCampaigns';
import { useAuth } from '../context/AuthContext';
import telegramNotifications from '../lib/telegramNotifications';

const appleEase = [0.16, 1, 0.3, 1] as const;
const defaultRaffleGoal = 'Complete all tasks to enter raffle';
const defaultRaffleFollowAccounts = ['https://x.com/atlasreachx'];
const defaultRaffleFollowHandle = 'atlasreachx';
const defaultRaffleTelegramTasks = ['https://t.me/AtlasReachX'];
const collectionChainOptions = ['Ethereum', 'Base', 'Solana', 'Robinhood'];
const raffleTaskAuditNote = 'Note: We may check your tasks again anytime before the raffle ends. If you didn\'t finish all of them, your entry will be void.';

function cleanXHandle(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
    .trim();
}

function cleanTelegramChatId(value: string) {
  return value.trim();
}

function isTelegramChatId(value: string) {
  return /^-?\d+$/.test(value.trim());
}

function telegramPublicReferenceKey(value: string) {
  const raw = value.trim();
  if (!raw || isTelegramChatId(raw) || /t\.me\/(\+|joinchat\/)/i.test(raw)) return '';
  const match = raw.match(/(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]+)/i);
  const username = (match ? match[1] : raw.replace(/^@/, '')).split(/[/?#]/)[0].trim();
  return /^[A-Za-z0-9_]{5,}$/.test(username) ? username.toLowerCase() : '';
}

function telegramStatusKeys(input: string, group?: TelegramGroupStatus | null) {
  const keys = new Set<string>();
  const raw = cleanTelegramChatId(input);
  if (raw) keys.add(raw);
  const inputUsername = telegramPublicReferenceKey(raw);
  if (inputUsername) {
    keys.add(inputUsername);
    keys.add(`@${inputUsername}`);
    keys.add(`https://t.me/${inputUsername}`);
  }
  if (group?.chat_id) keys.add(String(group.chat_id));
  if (group?.public_link) {
    const publicLink = cleanTelegramChatId(group.public_link);
    const groupUsername = telegramPublicReferenceKey(publicLink);
    keys.add(publicLink);
    if (groupUsername) {
      keys.add(groupUsername);
      keys.add(`@${groupUsername}`);
      keys.add(`https://t.me/${groupUsername}`);
    }
  }
  return Array.from(keys);
}

function combineDateAndTime(date: string, time: string, fallback: string | null = null) {
  if (!date) return null;
  if (!time) return fallback ?? date;
  const localDate = new Date(`${date}T${time}:00`);
  return Number.isNaN(localDate.getTime()) ? date : localDate.toISOString();
}

function buildCollectionDetailsDescription(details: {
  chain?: string;
  mint_date?: string;
  supply?: string;
  mint_price?: string;
}) {
  const rows = [
    ['Chain', details.chain],
    ['Mint Date', details.mint_date],
    ['Supply', details.supply],
    ['Mint Price', details.mint_price]
  ]
    .filter(([, value]) => String(value || '').trim())
    .map(([label, value]) => `${label}: ${String(value).trim()}`);

  const collectionDetails = rows.length
    ? `Collection Details\n${rows.join('\n')}`
    : 'Collection Details\nCollection details will be announced soon.';

  return `${collectionDetails}\n\n${raffleTaskAuditNote}`;
}

function telegramStatusLabel(status?: string | null) {
  if (status === 'configured') return 'Configured';
  if (status === 'needs_admin') return 'Bot needs admin';
  if (status === 'bot_not_in_chat') return 'Bot not in group';
  if (status === 'restricted') return 'Bot restricted';
  return 'Not detected';
}

export default function AdminNFTCampaignNew() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const startDateRef = useRef<HTMLInputElement | null>(null);
  const endDateRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [campaignType, setCampaignType] = useState<NftCampaignType>('raffle');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [backgroundImagePreview, setBackgroundImagePreview] = useState('');
  const [followAccounts, setFollowAccounts] = useState<string[]>(defaultRaffleFollowAccounts);
  const [retweetLinks, setRetweetLinks] = useState<string[]>(['']);
  const [commentLinks, setCommentLinks] = useState<string[]>(['']);
  const [engagementLinks, setEngagementLinks] = useState<string[]>(['']);
  const [telegramTasks, setTelegramTasks] = useState<string[]>(defaultRaffleTelegramTasks);
  const [telegramStatuses, setTelegramStatuses] = useState<Record<string, TelegramGroupStatus>>({});
  const [telegramStatusLoading, setTelegramStatusLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    goal: defaultRaffleGoal,
    overview: '',
    collection_chain: '',
    collection_mint_date: '',
    collection_supply: '',
    collection_mint_price: '',
    allocation_type: 'wl',
    budget: '',
    total_gtd: '',
    total_fcfs: '',
    max_content_submissions: '5',
    min_sorsa_score: '150',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: ''
  });
  const isWlAllocation = formData.allocation_type === 'wl';
  const isGtdAllocation = formData.allocation_type === 'gtd';
  const isFcfsAllocation = formData.allocation_type === 'fcfs';
  const collectionDetailsPayload = {
    chain: formData.collection_chain.trim(),
    mint_date: formData.collection_mint_date.trim(),
    supply: formData.collection_supply.trim(),
    mint_price: formData.collection_mint_price.trim()
  };
  const raffleCollectionDescription = buildCollectionDetailsDescription(collectionDetailsPayload);

  const handleCampaignTypeChange = (nextType: NftCampaignType) => {
    setCampaignType(nextType);
    if (nextType === 'raffle') {
      setFollowAccounts(prev => {
        const hasDefault = prev.some(account => cleanXHandle(account).toLowerCase() === defaultRaffleFollowHandle);
        return hasDefault ? prev : [...defaultRaffleFollowAccounts, ...prev.filter(account => account.trim())].slice(0, 3);
      });
      setTelegramTasks(prev => {
        const hasDefault = prev.some(task => cleanTelegramChatId(task).toLowerCase() === defaultRaffleTelegramTasks[0].toLowerCase());
        return hasDefault ? prev : [...defaultRaffleTelegramTasks, ...prev.filter(task => task.trim())].slice(0, 3);
      });
      return;
    }

    setFollowAccounts(prev => {
      const withoutDefaults = prev.filter(account => cleanXHandle(account).toLowerCase() !== defaultRaffleFollowHandle);
      return withoutDefaults.length ? withoutDefaults : [''];
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const adjustTotalWl = (delta: number) => {
    setFormData(prev => ({
      ...prev,
      budget: String(Math.max(0, Number(prev.budget || 0) + delta))
    }));
  };

  const adjustTotalGtd = (delta: number) => {
    setFormData(prev => ({
      ...prev,
      total_gtd: String(Math.max(0, Number(prev.total_gtd || 0) + delta))
    }));
  };

  const adjustTotalFcfs = (delta: number) => {
    setFormData(prev => ({
      ...prev,
      total_fcfs: String(Math.max(0, Number(prev.total_fcfs || 0) + delta))
    }));
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    if (file.size > 700 * 1024) {
      setError('Please use an image under 700KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const updateFollowAccount = (index: number, value: string) => {
    setFollowAccounts(prev => prev.map((item, itemIndex) => itemIndex === index ? value : item));
  };

  const addFollowAccount = () => {
    setFollowAccounts(prev => prev.length >= 3 ? prev : [...prev, '']);
  };

  const removeFollowAccount = (index: number) => {
    setFollowAccounts(prev => prev.length === 1 ? [''] : prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateRetweetLink = (index: number, value: string) => {
    setRetweetLinks(prev => prev.map((item, itemIndex) => itemIndex === index ? value : item));
  };

  const addRetweetLink = () => {
    setRetweetLinks(prev => prev.length >= 2 ? prev : [...prev, '']);
  };

  const removeRetweetLink = (index: number) => {
    setRetweetLinks(prev => prev.length === 1 ? [''] : prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateCommentLink = (index: number, value: string) => {
    setCommentLinks(prev => prev.map((item, itemIndex) => itemIndex === index ? value : item));
  };

  const addCommentLink = () => {
    setCommentLinks(prev => prev.length >= 2 ? prev : [...prev, '']);
  };

  const removeCommentLink = (index: number) => {
    setCommentLinks(prev => prev.length === 1 ? [''] : prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateEngagementLink = (index: number, value: string) => {
    setEngagementLinks(prev => prev.map((item, itemIndex) => itemIndex === index ? value : item));
  };

  const addEngagementLink = () => {
    setEngagementLinks(prev => prev.length >= 2 ? prev : [...prev, '']);
  };

  const removeEngagementLink = (index: number) => {
    setEngagementLinks(prev => prev.length === 1 ? [''] : prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateTelegramTask = (index: number, value: string) => {
    setTelegramTasks(prev => prev.map((item, itemIndex) => itemIndex === index ? value : item));
  };

  const addTelegramTask = () => {
    setTelegramTasks(prev => prev.length >= 3 ? prev : [...prev, '']);
  };

  const removeTelegramTask = (index: number) => {
    setTelegramTasks(prev => prev.length === 1 ? [''] : prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const refreshTelegramStatuses = async (verifyPublicLinks = false) => {
    const references = Array.from(new Set(telegramTasks.map(cleanTelegramChatId).filter(Boolean))).slice(0, 3);
    const chatIds = references.filter(isTelegramChatId);
    const publicLinks = verifyPublicLinks
      ? references.filter(value => !isTelegramChatId(value) && telegramPublicReferenceKey(value))
      : [];
    if (!chatIds.length && !publicLinks.length) {
      setTelegramStatuses({});
      return;
    }
    setTelegramStatusLoading(true);
    try {
      const next: Record<string, TelegramGroupStatus> = {};
      if (chatIds.length) {
        const result = await getAdminTelegramGroupStatuses(chatIds);
        for (const group of result.groups || []) {
          for (const key of telegramStatusKeys(group.chat_id, group)) {
            next[key] = group;
          }
        }
      }
      for (const link of publicLinks) {
        const result = await telegramNotifications.verifyAdminGroup(link, session?.access_token);
        for (const key of telegramStatusKeys(link, result.group)) {
          next[key] = result.group;
        }
      }
      setTelegramStatuses(prev => ({ ...prev, ...next }));
    } catch (err: any) {
      setError(err.message || 'Telegram group status could not be loaded.');
    } finally {
      setTelegramStatusLoading(false);
    }
  };

  useEffect(() => {
    if (campaignType !== 'raffle') return;
    const hasPublicReference = telegramTasks.some(task => {
      const cleaned = cleanTelegramChatId(task);
      return cleaned && !isTelegramChatId(cleaned) && telegramPublicReferenceKey(cleaned);
    });
    const timer = window.setTimeout(() => refreshTelegramStatuses(hasPublicReference), 500);
    return () => window.clearTimeout(timer);
  }, [campaignType, telegramTasks, session?.access_token]);

  const goToStepTwo = () => {
    setError('');
    setSuccess('');
    const allocationLabels = {
      wl: 'Total WL',
      gtd: 'Total GTD',
      fcfs: 'Total FCFS'
    } as const;
    const selectedTotal = formData.allocation_type === 'gtd'
      ? formData.total_gtd
      : formData.allocation_type === 'fcfs'
        ? formData.total_fcfs
        : formData.budget;
    if (!formData.title.trim() || !formData.goal.trim() || !selectedTotal) {
      setError(`Campaign title, goal, and ${allocationLabels[formData.allocation_type as keyof typeof allocationLabels] || 'Total WL'} are required before continuing.`);
      return;
    }
    setStep(2);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      goal: defaultRaffleGoal,
      overview: '',
      collection_chain: '',
      collection_mint_date: '',
      collection_supply: '',
      collection_mint_price: '',
      allocation_type: 'wl',
      budget: '',
      total_gtd: '',
      total_fcfs: '',
      max_content_submissions: '5',
      min_sorsa_score: '150',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: ''
    });
    setCampaignType('raffle');
    setImagePreview('');
    setBackgroundImagePreview('');
    setFollowAccounts(defaultRaffleFollowAccounts);
    setRetweetLinks(['']);
    setCommentLinks(['']);
    setEngagementLinks(['']);
    setTelegramTasks(defaultRaffleTelegramTasks);
    setTelegramStatuses({});
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    const cleanedFollowAccounts = Array.from(
      new Set<string>([
        ...(campaignType === 'raffle' ? defaultRaffleFollowAccounts : []),
        ...followAccounts
      ].map(cleanXHandle).filter(Boolean))
    ).slice(0, 3);
    const cleanedRetweetLinks = Array.from(
      new Set<string>(retweetLinks.map(link => link.trim()).filter(Boolean))
    ).slice(0, 2);
    const cleanedCommentLinks = Array.from(
      new Set<string>(commentLinks.map(link => link.trim()).filter(Boolean))
    ).slice(0, 2);
    const cleanedEngagementLinks = Array.from(
      new Set<string>(engagementLinks.map(link => link.trim()).filter(Boolean))
    ).slice(0, 2);
    const telegramTaskInputs = Array.from(
      new Set<string>([
        ...(campaignType === 'raffle' ? defaultRaffleTelegramTasks : []),
        ...telegramTasks
      ].map(cleanTelegramChatId).filter(Boolean))
    ).slice(0, 3);

    try {
      const resolvedTelegramTasks: { chat_id: string; title: string | null; public_link: string | null }[] = [];
      const seenTelegramChatIds = new Set<string>();
      if (campaignType === 'raffle') {
        for (const taskInput of telegramTaskInputs) {
          const group = isTelegramChatId(taskInput)
            ? telegramStatuses[taskInput]
            : (await telegramNotifications.verifyAdminGroup(taskInput, session?.access_token)).group;
          const chatId = group?.chat_id || taskInput;
          if (!chatId || seenTelegramChatIds.has(chatId)) continue;
          if (group?.bot_permission_status && group.bot_permission_status !== 'configured') {
            throw new Error('The Telegram bot must be an admin in every group link provided.');
          }
          seenTelegramChatIds.add(chatId);
          resolvedTelegramTasks.push({
            chat_id: chatId,
            title: group?.title || null,
            public_link: group?.public_link || (!isTelegramChatId(taskInput) ? taskInput : null)
          });
        }
      }

      const startDateTime = combineDateAndTime(formData.start_date, formData.start_time);
      const endDateTime = combineDateAndTime(formData.end_date, formData.end_time, formData.end_date || null);

      if (campaignType === 'raffle' && formData.start_date && formData.end_date && startDateTime && endDateTime) {
        const startMs = new Date(startDateTime).getTime();
        const endMs = new Date(endDateTime).getTime();
        if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs <= startMs) {
          throw new Error('Raffle end date and hour must be after the start date and hour.');
        }
      }

      const selectedAllocationTotal = formData.allocation_type === 'gtd'
        ? Number(formData.total_gtd || 0)
        : formData.allocation_type === 'fcfs'
          ? Number(formData.total_fcfs || 0)
          : Number(formData.budget || 0);

      await createNftCampaign({
        title: formData.title.trim(),
        goal: formData.goal.trim(),
        campaign_type: campaignType,
        overview: campaignType === 'raffle' ? raffleCollectionDescription : formData.overview.trim(),
        categories: ['NFT'],
        budget: selectedAllocationTotal,
        allocation_type: formData.allocation_type as 'wl' | 'gtd' | 'fcfs',
        total_gtd: Number(formData.total_gtd || 0),
        total_fcfs: Number(formData.total_fcfs || 0),
        min_sorsa_score: Number(formData.min_sorsa_score || 0),
        image_url: imagePreview || null,
        background_image_url: backgroundImagePreview || null,
        max_creators: null,
        max_content_submissions: campaignType === 'content' ? Math.min(5, Math.max(1, Number(formData.max_content_submissions || 5))) : null,
        collection_details: collectionDetailsPayload,
        follow_accounts: cleanedFollowAccounts,
        retweet_links: campaignType === 'raffle' ? cleanedRetweetLinks : [],
        comment_links: campaignType === 'raffle' ? cleanedCommentLinks : [],
        engagement_links: campaignType === 'raffle' ? cleanedEngagementLinks : [],
        telegram_tasks: resolvedTelegramTasks,
        start_date: startDateTime,
        end_date: endDateTime
      });

      setSuccess('NFT campaign created. It will now appear on the creator NFT Campaigns page.');
      resetForm();
      navigate(campaignType === 'raffle' ? '/admin/raffles' : '/admin/campaigns');
    } catch (err: any) {
      setError(err.message || 'NFT campaign could not be created.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-purple-500/30 flex">
      <AdminSidebar />
      <AdminTopBar />

      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: appleEase }}
              onClick={() => navigate('/admin/campaigns')}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
                className="text-purple-400 text-sm font-semibold tracking-wider uppercase mb-1"
              >
                Admin NFT Campaign
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
                className="text-3xl font-semibold tracking-tight text-white"
              >
                Create NFT Campaign
              </motion.h1>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
            className="glass-panel rounded-[2rem] p-8 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-8">
              {[1, 2].map(item => (
                <div key={item} className="flex items-center gap-3 flex-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border text-sm font-semibold ${step === item ? 'bg-purple-500 text-white border-purple-500' : 'bg-white/5 text-muted border-white/10'}`}>
                    {item}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item === 1 ? 'Basics' : 'Details & Tasks'}</p>
                    <p className="text-xs text-muted">{item === 1 ? 'Type and WL setup' : 'DP, brief, eligibility'}</p>
                  </div>
                </div>
              ))}
            </div>

            <form className="space-y-8" onSubmit={handleSubmit}>
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                  {success}
                </div>
              )}

              {step === 1 ? (
                <>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-white">Campaign Type</label>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => handleCampaignTypeChange('raffle')}
                        className={`aspect-square p-3 sm:p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center text-center gap-2 sm:gap-3 ${
                          campaignType === 'raffle'
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${campaignType === 'raffle' ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-muted'}`}>
                          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Raffle</h3>
                          <p className="text-[0.68rem] sm:text-xs leading-snug text-muted mt-1">Task-based campaign where creators complete X actions to join.</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCampaignTypeChange('content')}
                        className={`aspect-square p-3 sm:p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center text-center gap-2 sm:gap-3 ${
                          campaignType === 'content'
                            ? 'border-cyan bg-cyan/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${campaignType === 'content' ? 'bg-cyan/20 text-cyan' : 'bg-white/10 text-muted'}`}>
                          <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Content</h3>
                          <p className="text-[0.68rem] sm:text-xs leading-snug text-muted mt-1">Submission-based campaign where creators post content for review.</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Campaign Title</label>
                      <input name="title" value={formData.title} onChange={handleInputChange} required placeholder="e.g. NFT Mint Activation" className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Campaign Goal</label>
                      <input name="goal" value={formData.goal} onChange={handleInputChange} required placeholder="e.g. Drive mint awareness" className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-white">Collection Details</label>
                      <p className="text-xs text-muted mt-1">Displayed to creators in the campaign details section.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wider text-muted">Chain</label>
                        <div className="grid grid-cols-2 gap-2">
                          {collectionChainOptions.map((chain) => (
                            <button
                              key={chain}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, collection_chain: chain }))}
                              className={`h-11 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                                formData.collection_chain === chain
                                  ? 'border-purple-500 bg-purple-500/15 text-white'
                                  : 'border-white/10 bg-black/50 text-muted hover:border-white/20 hover:text-white'
                              }`}
                            >
                              {chain}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wider text-muted">Mint Date</label>
                        <textarea name="collection_mint_date" value={formData.collection_mint_date} onChange={handleInputChange} rows={3} placeholder="e.g. TBA, January 15, or allowlist mint first" className="w-full min-h-[84px] px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wider text-muted">Supply</label>
                        <input name="collection_supply" value={formData.collection_supply} onChange={handleInputChange} placeholder="e.g. 10,000" className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wider text-muted">Mint Price</label>
                        <input name="collection_mint_price" value={formData.collection_mint_price} onChange={handleInputChange} placeholder="e.g. 0.05 ETH" className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-3">
                      <label className="text-sm font-medium text-white">Primary Allocation</label>
                      <div className="inline-flex rounded-xl bg-black/50 border border-white/10 p-1">
                        {[
                          { value: 'wl', label: 'WL' },
                          { value: 'gtd', label: 'GTD' },
                          { value: 'fcfs', label: 'FCFS' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, allocation_type: option.value }))}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                              formData.allocation_type === option.value
                                ? 'bg-purple-500 text-white'
                                : 'text-muted hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-3 gap-2.5">
                      <div className="min-w-0 space-y-1.5">
                        <label className="text-xs font-medium text-muted">Total WL</label>
                        <div className="flex h-11 items-center rounded-xl bg-black/50 border border-white/10 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all overflow-hidden">
                          <input type="number" min="0" name="budget" value={formData.budget} onChange={handleInputChange} required={isWlAllocation} disabled={!isWlAllocation} placeholder="2500" className="min-w-0 flex-1 px-2 py-0 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none disabled:cursor-not-allowed disabled:text-white/35 disabled:placeholder:text-white/10 [color-scheme:dark]" />
                          <div className="flex shrink-0 items-center gap-1 border-l border-white/10 pl-1 pr-1">
                            <button type="button" onClick={() => adjustTotalWl(-1)} disabled={!isWlAllocation} className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent" aria-label="Decrease Total WL">
                              <Minus className="w-3 h-3" />
                            </button>
                            <button type="button" onClick={() => adjustTotalWl(1)} disabled={!isWlAllocation} className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent" aria-label="Increase Total WL">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <label className="text-xs font-medium text-muted">Total GTD</label>
                        <div className="flex h-11 items-center rounded-xl bg-black/50 border border-white/10 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all overflow-hidden">
                          <input type="number" min="0" name="total_gtd" value={formData.total_gtd} onChange={handleInputChange} required={isGtdAllocation} disabled={!isGtdAllocation} placeholder="500" className="min-w-0 flex-1 px-2 py-0 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none disabled:cursor-not-allowed disabled:text-white/35 disabled:placeholder:text-white/10 [color-scheme:dark]" />
                          <div className="flex shrink-0 items-center gap-1 border-l border-white/10 pl-1 pr-1">
                            <button type="button" onClick={() => adjustTotalGtd(-1)} disabled={!isGtdAllocation} className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent" aria-label="Decrease Total GTD">
                              <Minus className="w-3 h-3" />
                            </button>
                            <button type="button" onClick={() => adjustTotalGtd(1)} disabled={!isGtdAllocation} className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent" aria-label="Increase Total GTD">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <label className="text-xs font-medium text-muted">Total FCFS</label>
                        <div className="flex h-11 items-center rounded-xl bg-black/50 border border-white/10 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all overflow-hidden">
                          <input type="number" min="0" name="total_fcfs" value={formData.total_fcfs} onChange={handleInputChange} required={isFcfsAllocation} disabled={!isFcfsAllocation} placeholder="100" className="min-w-0 flex-1 px-2 py-0 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none disabled:cursor-not-allowed disabled:text-white/35 disabled:placeholder:text-white/10 [color-scheme:dark]" />
                          <div className="flex shrink-0 items-center gap-1 border-l border-white/10 pl-1 pr-1">
                            <button type="button" onClick={() => adjustTotalFcfs(-1)} disabled={!isFcfsAllocation} className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent" aria-label="Decrease Total FCFS">
                              <Minus className="w-3 h-3" />
                            </button>
                            <button type="button" onClick={() => adjustTotalFcfs(1)} disabled={!isFcfsAllocation} className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent" aria-label="Increase Total FCFS">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="grid w-full grid-cols-2 gap-3.5 overflow-hidden">
                      <div className="min-w-0 overflow-hidden">
                        <label className="mb-2 block text-[13px] font-medium text-muted">Start</label>
                        <div className="flex flex-col gap-2">
                          <div className="relative">
                            <input ref={startDateRef} type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} className="box-border h-11 w-full min-w-0 rounded-xl bg-black/50 border border-white/10 px-2.5 pr-9 text-xs text-white placeholder:text-white/20 text-ellipsis overflow-hidden whitespace-nowrap focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0" />
                            <Calendar className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 shrink-0 text-white/55" />
                          </div>
                          <div className="relative">
                            <input type="time" name="start_time" value={formData.start_time} onChange={handleInputChange} className="box-border h-11 w-full min-w-0 rounded-xl bg-black/50 border border-white/10 px-2.5 pr-9 text-xs text-white placeholder:text-white/20 text-ellipsis overflow-hidden whitespace-nowrap focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0" aria-label="Start hour" />
                            <Clock className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 shrink-0 text-white/55" />
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <label className="mb-2 block text-[13px] font-medium text-muted">End</label>
                        <div className="flex flex-col gap-2">
                          <div className="relative">
                            <input ref={endDateRef} type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} className="box-border h-11 w-full min-w-0 rounded-xl bg-black/50 border border-white/10 px-2.5 pr-9 text-xs text-white placeholder:text-white/20 text-ellipsis overflow-hidden whitespace-nowrap focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0" />
                            <Calendar className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 shrink-0 text-white/55" />
                          </div>
                          <div className="relative">
                            <input type="time" name="end_time" value={formData.end_time} onChange={handleInputChange} className="box-border h-11 w-full min-w-0 rounded-xl bg-black/50 border border-white/10 px-2.5 pr-9 text-xs text-white placeholder:text-white/20 text-ellipsis overflow-hidden whitespace-nowrap focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0" aria-label="End hour" />
                            <Clock className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 shrink-0 text-white/55" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted">Choose an end hour for campaigns that should close at a specific time.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white">Category</label>
                    <div className="inline-flex px-4 py-2 rounded-full text-sm font-medium border bg-purple-500/20 text-purple-300 border-purple-500/30">
                      NFT
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 flex justify-end">
                    <button type="button" onClick={goToStepTwo} className="px-8 py-4 rounded-full bg-purple-500 text-white font-semibold hover:scale-[1.02] transition-transform duration-300">
                      Next: Details & Tasks
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white">NFT Campaign DP</label>
                    <label className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:border-purple-500/40 transition-colors">
                      <div className="w-20 h-20 rounded-2xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {imagePreview ? (
                          <img src={imagePreview} alt="NFT campaign preview" className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-8 h-8 text-muted" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Upload display image</p>
                        <p className="text-xs text-muted mt-1">Square images work best. Keep it under 700KB.</p>
                      </div>
                      <input type="file" accept="image/*" onChange={(event) => handleImageChange(event, setImagePreview)} className="hidden" />
                    </label>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white">NFT Campaign Background</label>
                    <label className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:border-purple-500/40 transition-colors">
                      <div className="w-full sm:w-48 aspect-[3/1] rounded-2xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {backgroundImagePreview ? (
                          <img src={backgroundImagePreview} alt="NFT campaign background preview" className="w-full h-full object-contain" />
                        ) : (
                          <Image className="w-8 h-8 text-muted" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Upload card background image</p>
                        <p className="text-xs text-muted mt-1">Use 1500px by 500px artwork for a 3:1 card banner. Keep it under 700KB.</p>
                      </div>
                      <input type="file" accept="image/*" onChange={(event) => handleImageChange(event, setBackgroundImagePreview)} className="hidden" />
                    </label>
                  </div>

                  {campaignType === 'raffle' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Campaign Description</label>
                      <div className="min-h-32 whitespace-pre-line rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm leading-relaxed text-muted">
                        {raffleCollectionDescription}
                      </div>
                      <p className="text-xs text-muted">Raffle descriptions are generated from the Collection Details added in step 1.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Campaign Brief</label>
                      <textarea name="overview" value={formData.overview} onChange={handleInputChange} required rows={8} placeholder="Describe the NFT campaign, eligibility, required creator actions, links, and reward rules." className="w-full min-h-48 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none" />
                    </div>
                  )}

                  {campaignType === 'content' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Accepted Contents</label>
                      <select
                        name="max_content_submissions"
                        value={formData.max_content_submissions}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
                      >
                        {[1, 2, 3, 4, 5].map((count) => (
                          <option key={count} value={count} className="bg-[#0A0A1E]">
                            {count} {count === 1 ? 'content' : 'contents'}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted">Maximum number of creator submissions admins can approve for this content campaign.</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <label className="text-sm font-medium text-white">Sorsa Score Threshold</label>
                        <p className="text-xs text-muted mt-1">Creators need this score or higher to join.</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-semibold">
                        {Number(formData.min_sorsa_score || 0)}+
                      </span>
                    </div>
                    <input
                      type="range"
                      name="min_sorsa_score"
                      min="0"
                      max="1000"
                      step="10"
                      value={formData.min_sorsa_score}
                      onChange={handleInputChange}
                      className="w-full accent-purple-500"
                    />
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted">0</span>
                      <input
                        type="number"
                        name="min_sorsa_score"
                        min="0"
                        max="1000"
                        value={formData.min_sorsa_score}
                        onChange={handleInputChange}
                        className="w-28 px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                      />
                      <span className="text-xs text-muted">1000</span>
                    </div>
                  </div>

                  {campaignType === 'raffle' ? (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <label className="text-sm font-medium text-white">Follow Tasks</label>
                            <p className="text-xs text-muted mt-1">Add up to 3 X accounts creators must follow to join.</p>
                          </div>
                          <button type="button" onClick={addFollowAccount} disabled={followAccounts.length >= 3} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add
                          </button>
                        </div>
                        <div className="space-y-3">
                          {followAccounts.map((account, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <input value={account} onChange={(e) => updateFollowAccount(index, e.target.value)} placeholder="@account or x.com/account" className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" />
                              <button type="button" onClick={() => removeFollowAccount(index)} className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 text-muted hover:text-white hover:bg-white/10 flex items-center justify-center">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <label className="text-sm font-medium text-white">Like & Retweet Tasks</label>
                            <p className="text-xs text-muted mt-1">Add up to 2 X post links creators must like and retweet to join.</p>
                          </div>
                          <button type="button" onClick={addRetweetLink} disabled={retweetLinks.length >= 2} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add
                          </button>
                        </div>
                        <div className="space-y-3">
                          {retweetLinks.map((link, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <input value={link} onChange={(e) => updateRetweetLink(index, e.target.value)} placeholder="https://x.com/account/status/..." className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" />
                              <button type="button" onClick={() => removeRetweetLink(index)} className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 text-muted hover:text-white hover:bg-white/10 flex items-center justify-center">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <label className="text-sm font-medium text-white">Like & Comment Tasks</label>
                            <p className="text-xs text-muted mt-1">Add up to 2 X post links creators must like and comment on to join.</p>
                          </div>
                          <button type="button" onClick={addCommentLink} disabled={commentLinks.length >= 2} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add
                          </button>
                        </div>
                        <div className="space-y-3">
                          {commentLinks.map((link, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <input value={link} onChange={(e) => updateCommentLink(index, e.target.value)} placeholder="https://x.com/account/status/..." className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" />
                              <button type="button" onClick={() => removeCommentLink(index)} className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 text-muted hover:text-white hover:bg-white/10 flex items-center justify-center">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <label className="text-sm font-medium text-white">Like, Retweet & Comment Tasks</label>
                            <p className="text-xs text-muted mt-1">Add up to 2 X post links creators must like, retweet, and comment on to join.</p>
                          </div>
                          <button type="button" onClick={addEngagementLink} disabled={engagementLinks.length >= 2} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add
                          </button>
                        </div>
                        <div className="space-y-3">
                          {engagementLinks.map((link, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <input value={link} onChange={(e) => updateEngagementLink(index, e.target.value)} placeholder="https://x.com/account/status/..." className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" />
                              <button type="button" onClick={() => removeEngagementLink(index)} className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 text-muted hover:text-white hover:bg-white/10 flex items-center justify-center">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <label className="text-sm font-medium text-white">Telegram Join Tasks</label>
                            <p className="text-xs text-muted mt-1">Add up to 3 public Telegram group links. If left blank, no Telegram join task is added.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => refreshTelegramStatuses(true)} disabled={telegramStatusLoading} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 inline-flex items-center justify-center" aria-label="Verify Telegram group links">
                              {telegramStatusLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                            </button>
                            <button type="button" onClick={addTelegramTask} disabled={telegramTasks.length >= 3} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2">
                              <Plus className="w-4 h-4" /> Add
                            </button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {telegramTasks.map((chatId, index) => {
                            const cleanedChatId = cleanTelegramChatId(chatId);
                            const status = cleanedChatId
                              ? telegramStatusKeys(cleanedChatId).map(key => telegramStatuses[key]).find(Boolean) || null
                              : null;
                            const isConfigured = status?.bot_permission_status === 'configured';

                            return (
                              <div key={index} className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <input value={chatId} onChange={(e) => updateTelegramTask(index, e.target.value)} placeholder="https://t.me/your_public_group" className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" />
                                  <button type="button" onClick={() => removeTelegramTask(index)} className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 text-muted hover:text-white hover:bg-white/10 flex items-center justify-center">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                {cleanedChatId ? (
                                  <div className={`px-4 py-3 rounded-xl border text-xs ${isConfigured ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'}`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                      <span>{status?.title || cleanedChatId}</span>
                                      <span className="font-semibold">{telegramStatusLabel(status?.bot_permission_status)}</span>
                                    </div>
                                    {!status || !isConfigured ? (
                                      <p className="mt-1 text-[11px] opacity-80">Add the bot to this public group as an admin, then verify the link.</p>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <label className="text-sm font-medium text-white">Join Requirements</label>
                          <p className="text-xs text-muted mt-1">Add up to 3 X profiles creators must follow before joining.</p>
                        </div>
                        <button type="button" onClick={addFollowAccount} disabled={followAccounts.length >= 3} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2">
                          <Plus className="w-4 h-4" /> Add
                        </button>
                      </div>
                      <div className="space-y-3">
                        {followAccounts.map((account, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <input value={account} onChange={(e) => updateFollowAccount(index, e.target.value)} placeholder="@account or x.com/account" className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all" />
                            <button type="button" onClick={() => removeFollowAccount(index)} className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 text-muted hover:text-white hover:bg-white/10 flex items-center justify-center">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 rounded-2xl bg-cyan/10 border border-cyan/20 text-sm text-cyan">
                        Content campaigns collect creator submissions. Creators must meet the join requirements, then submit their content link for review.
                      </div>
                    </div>
                  )}

                  <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:justify-between gap-3">
                    <button type="button" onClick={() => setStep(1)} className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors">
                      Back
                    </button>
                    <button type="submit" disabled={isSaving} className="px-8 py-4 rounded-full bg-purple-500 text-white font-semibold hover:scale-[1.02] transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {isSaving ? 'Creating...' : 'Create NFT Campaign'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
