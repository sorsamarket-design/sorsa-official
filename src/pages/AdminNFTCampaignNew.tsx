import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, CheckCircle2, Image, Loader2, Minus, Plus, Sparkles, Users, X } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { createNftCampaign, type NftCampaignType } from '../lib/nftCampaigns';

const appleEase = [0.16, 1, 0.3, 1] as const;

function cleanXHandle(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
    .trim();
}

export default function AdminNFTCampaignNew() {
  const navigate = useNavigate();
  const startDateRef = useRef<HTMLInputElement | null>(null);
  const endDateRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [campaignType, setCampaignType] = useState<NftCampaignType>('raffle');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [backgroundImagePreview, setBackgroundImagePreview] = useState('');
  const [followAccounts, setFollowAccounts] = useState<string[]>(['']);
  const [retweetLinks, setRetweetLinks] = useState<string[]>(['']);

  const [formData, setFormData] = useState({
    title: '',
    goal: '',
    overview: '',
    budget: '',
    max_content_submissions: '5',
    min_sorsa_score: '150',
    start_date: '',
    end_date: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const adjustTotalWl = (delta: number) => {
    setFormData(prev => ({
      ...prev,
      budget: String(Math.max(0, Number(prev.budget || 0) + delta))
    }));
  };

  const openDatePicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.focus();
    }
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

  const goToStepTwo = () => {
    setError('');
    setSuccess('');
    if (!formData.title.trim() || !formData.goal.trim() || !formData.budget) {
      setError('Campaign title, goal, and Total WL are required before continuing.');
      return;
    }
    setStep(2);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      goal: '',
      overview: '',
      budget: '',
      max_content_submissions: '5',
      min_sorsa_score: '150',
      start_date: '',
      end_date: ''
    });
    setCampaignType('raffle');
    setImagePreview('');
    setBackgroundImagePreview('');
    setFollowAccounts(['']);
    setRetweetLinks(['']);
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    const cleanedFollowAccounts = Array.from(
      new Set<string>(followAccounts.map(cleanXHandle).filter(Boolean))
    ).slice(0, 3);
    const cleanedRetweetLinks = Array.from(
      new Set<string>(retweetLinks.map(link => link.trim()).filter(Boolean))
    ).slice(0, 2);

    try {
      await createNftCampaign({
        title: formData.title.trim(),
        goal: formData.goal.trim(),
        campaign_type: campaignType,
        overview: formData.overview.trim(),
        categories: ['NFT'],
        budget: Number(formData.budget || 0),
        min_sorsa_score: Number(formData.min_sorsa_score || 0),
        image_url: imagePreview || null,
        background_image_url: backgroundImagePreview || null,
        max_creators: null,
        max_content_submissions: campaignType === 'content' ? Math.min(5, Math.max(1, Number(formData.max_content_submissions || 5))) : null,
        follow_accounts: cleanedFollowAccounts,
        retweet_links: campaignType === 'raffle' ? cleanedRetweetLinks : [],
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setCampaignType('raffle')}
                        className={`p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center text-center gap-3 ${
                          campaignType === 'raffle'
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${campaignType === 'raffle' ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-muted'}`}>
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Raffle</h3>
                          <p className="text-xs text-muted mt-1">Task-based campaign where creators complete X actions to join.</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCampaignType('content')}
                        className={`p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center text-center gap-3 ${
                          campaignType === 'content'
                            ? 'border-cyan bg-cyan/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${campaignType === 'content' ? 'bg-cyan/20 text-cyan' : 'bg-white/10 text-muted'}`}>
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Content</h3>
                          <p className="text-xs text-muted mt-1">Submission-based campaign where creators post content for review.</p>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Total WL</label>
                      <div className="flex items-center rounded-xl bg-black/50 border border-white/10 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all overflow-hidden">
                        <input type="number" min="0" name="budget" value={formData.budget} onChange={handleInputChange} required placeholder="2500" className="w-full px-4 py-3 bg-transparent text-white placeholder:text-white/20 focus:outline-none [color-scheme:dark]" />
                        <div className="flex items-center border-l border-white/10">
                          <button type="button" onClick={() => adjustTotalWl(-1)} className="w-11 h-12 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors" aria-label="Decrease Total WL">
                            <Minus className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => adjustTotalWl(1)} className="w-11 h-12 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors border-l border-white/10" aria-label="Increase Total WL">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Start Date</label>
                      <div className="relative">
                        <input ref={startDateRef} type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} className="w-full px-4 py-3 pr-12 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0" />
                        <button type="button" onClick={() => openDatePicker(startDateRef.current)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors" aria-label="Open start date picker">
                          <Calendar className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">End Date</label>
                      <div className="relative">
                        <input ref={endDateRef} type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} className="w-full px-4 py-3 pr-12 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0" />
                        <button type="button" onClick={() => openDatePicker(endDateRef.current)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors" aria-label="Open end date picker">
                          <Calendar className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Campaign Brief</label>
                    <textarea name="overview" value={formData.overview} onChange={handleInputChange} required rows={8} placeholder="Describe the NFT campaign, eligibility, required creator actions, links, and reward rules." className="w-full min-h-48 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none" />
                  </div>

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
                            <label className="text-sm font-medium text-white">Retweet Tasks</label>
                            <p className="text-xs text-muted mt-1">Add up to 2 X post links creators must retweet to join.</p>
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
