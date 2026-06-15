import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Users, Star, Plus, X, Loader2 } from 'lucide-react';
import BrandSidebar from '../components/BrandSidebar';
import TopBar from '../components/TopBar';
import { useBrandProfiles } from '../hooks/useBrandProfiles';
import { useAuth } from '../context/AuthContext';
import { saveCampaignDraftThroughBackend } from '../lib/escrowLaunch';

const appleEase = [0.16, 1, 0.3, 1] as const;
const defaultCategories = ['DeFi', 'AI', 'NFT', 'ZK', 'DePIN'];
const overviewMinLength = 300;
const overviewMaxLength = 1500;

export default function CampaignNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const draftCampaign = location.state?.draftCampaign;
  const initialBrandProfileId = draftCampaign?.brand_profile_id || location.state?.brandProfileId || '';
  const { profiles, loading } = useBrandProfiles();
  const { session } = useAuth();
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState('');
  
  const [campaignType, setCampaignType] = useState<'general' | 'kol'>(draftCampaign?.campaign_type === 'kol' ? 'kol' : 'general');
  const [minSorsaScore, setMinSorsaScore] = useState(Number(draftCampaign?.min_sorsa_score || 500));
  const [language, setLanguage] = useState(draftCampaign?.language || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(Array.isArray(draftCampaign?.categories) ? draftCampaign.categories : []);
  const [customCategory, setCustomCategory] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>(
    Array.isArray(draftCampaign?.categories) ? draftCampaign.categories.filter((cat: string) => !defaultCategories.includes(cat)) : []
  );

  const [formData, setFormData] = useState({
    brand_profile_id: initialBrandProfileId,
    title: draftCampaign?.title || '',
    goal: draftCampaign?.goal || '',
    overview: draftCampaign?.overview || ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCategoryToggle = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleAddCustomCategory = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customCategory.trim()) {
      e.preventDefault();
      const newCat = customCategory.trim();
      if (!customCategories.includes(newCat) && !defaultCategories.includes(newCat)) {
        setCustomCategories([...customCategories, newCat]);
        setSelectedCategories([...selectedCategories, newCat]);
      }
      setCustomCategory('');
    }
  };

  const removeCustomCategory = (cat: string) => {
    setCustomCategories(customCategories.filter(c => c !== cat));
    setSelectedCategories(selectedCategories.filter(c => c !== cat));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand_profile_id) {
      alert("Please select a brand profile first. If you don't have one, create it from the dashboard.");
      return;
    }
    const overviewLength = formData.overview.trim().length;
    if (overviewLength < overviewMinLength) {
      alert(`Campaign objectives must be at least ${overviewMinLength} characters.`);
      return;
    }

    const campaignData = {
      ...formData,
      campaign_type: campaignType,
      min_sorsa_score: campaignType === 'kol' ? minSorsaScore : null,
      language: campaignType === 'kol' ? language : '',
      categories: selectedCategories,
      budget: Number(draftCampaign?.budget || 0),
      net_budget: Number(draftCampaign?.net_budget || 0),
      platform_fee: Number(draftCampaign?.platform_fee || 0),
      start_date: draftCampaign?.start_date || null,
      end_date: draftCampaign?.end_date || null
    };

    setIsSavingDraft(true);
    setDraftError('');
    try {
      const savedDraft = await saveCampaignDraftThroughBackend(
        campaignData,
        session?.access_token,
        draftCampaign?.id || null
      );

      navigate('/brand/campaigns/new/budget', {
        state: {
          draftCampaignId: savedDraft.campaignId,
          campaignData
        }
      });
    } catch (err: any) {
      setDraftError(err.message || 'Campaign draft could not be saved.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <BrandSidebar />
      <TopBar />
      
      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          
          <div className="flex items-center gap-4 mb-8">
            <motion.button 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: appleEase }}
              onClick={() => navigate('/brand/dashboard')}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div className="flex-1">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
                className="text-cyan text-sm font-semibold tracking-wider uppercase mb-1"
              >
                Step 1 of 2 — Campaign Details
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
                className="text-3xl font-semibold tracking-tight text-white"
              >
                {draftCampaign ? 'Edit Draft Campaign' : 'Create New Campaign'}
              </motion.h1>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
            className="glass-panel rounded-[2rem] p-8 relative overflow-hidden border border-white/10"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-cyan/5 blur-[100px] rounded-full pointer-events-none"></div>
            
            <form className="relative z-10 space-y-8" onSubmit={handleSubmit}>
              {draftError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {draftError}
                </div>
              )}
              
              {/* Campaign Type */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-white">Campaign Type</label>
                <div className="grid grid-cols-2 gap-2.5 md:gap-4">
                   <div
                     onClick={() => setCampaignType('general')}
                     className={`min-w-0 p-3 md:p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center text-center gap-3 ${
                       campaignType === 'general'
                         ? 'border-cyan bg-cyan/5 shadow-[inset_0_1px_1px_rgba(0,212,255,0.2)]'
                         : 'border-white/10 bg-white/5 hover:border-white/20'
                     }`}
                   >
                     <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center ${campaignType === 'general' ? 'bg-cyan/20 text-cyan' : 'bg-white/10 text-muted'}`}>
                       <Users className="w-5 h-5 md:w-6 md:h-6" />
                     </div>
                     <div>
                       <h3 className={`text-[0.8rem] md:text-base font-semibold ${campaignType === 'general' ? 'text-white' : 'text-muted'}`}>General Creators</h3>
                       <p className="text-[0.68rem] leading-snug md:text-xs text-muted mt-1">Open to all verified creators on the platform.</p>
                     </div>
                   </div>

                   <div
                     onClick={() => setCampaignType('kol')}
                     className={`min-w-0 p-3 md:p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center text-center gap-3 ${
                       campaignType === 'kol'
                         ? 'border-purple-500 bg-purple-500/5 shadow-[inset_0_1px_1px_rgba(168,85,247,0.2)]'
                         : 'border-white/10 bg-white/5 hover:border-white/20'
                     }`}
                   >
                     <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center ${campaignType === 'kol' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-muted'}`}>
                       <Star className="w-5 h-5 md:w-6 md:h-6" />
                     </div>
                     <div>
                       <h3 className={`text-[0.8rem] md:text-base font-semibold ${campaignType === 'kol' ? 'text-white' : 'text-muted'}`}>High Quality / KOL</h3>
                       <p className="text-[0.68rem] leading-snug md:text-xs text-muted mt-1">Target top-tier creators with proven engagement.</p>
                     </div>
                  </div>
                </div>

                {campaignType === 'kol' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-4 space-y-6"
                  >
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-muted flex justify-between">
                        <span>Minimum Sorsa Score</span>
                        <span className="text-cyan font-semibold">{minSorsaScore}+</span>
                      </label>
                      <input 
                        type="range" 
                        min="500" max="1000" step="10"
                        value={minSorsaScore}
                        onChange={(e) => setMinSorsaScore(Number(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted mb-2">Language Restriction (Optional)</label>
                      <input 
                        type="text" 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        placeholder="e.g. English, Spanish, Japanese"
                        className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Brand Profile */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Select Brand Profile</label>
                <select 
                  required
                  name="brand_profile_id"
                  value={formData.brand_profile_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all appearance-none"
                >
                  <option value="" disabled>Choose a profile...</option>
                  {!loading && profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.company_name}</option>
                  ))}
                </select>
              </div>

              {/* Title & Goal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Campaign Title</label>
                  <input 
                    type="text" 
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Q3 Product Launch"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Campaign Goal</label>
                  <input 
                    type="text" 
                    name="goal"
                    value={formData.goal}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Drive 10k clicks to landing page"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {defaultCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryToggle(cat)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                        selectedCategories.includes(cat)
                          ? 'bg-cyan/20 text-cyan border-cyan/30'
                          : 'bg-white/5 text-muted border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  {customCategories.map(cat => (
                    <div
                      key={cat}
                      className="px-4 py-2 rounded-full text-sm font-medium transition-colors border bg-cyan/20 text-cyan border-cyan/30 flex items-center gap-2"
                    >
                      {cat}
                      <button type="button" onClick={() => removeCustomCategory(cat)} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="text" 
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    onKeyDown={handleAddCustomCategory}
                    placeholder="Add custom category and press Enter"
                    className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all text-sm"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (customCategory.trim()) {
                        handleAddCustomCategory({ key: 'Enter', preventDefault: () => {} } as any);
                      }
                    }}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Overview */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Overview of Campaign Objectives</label>
                <textarea 
                  rows={12}
                  required
                  name="overview"
                  value={formData.overview}
                  onChange={handleInputChange}
                  minLength={overviewMinLength}
                  maxLength={overviewMaxLength}
                  placeholder="Describe your campaign in detail. What should creators focus on? What are the key selling points?"
                  className="w-full min-h-80 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-base text-white placeholder:text-white/20 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all resize-none"
                ></textarea>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Minimum {overviewMinLength} characters</span>
                  <span className={formData.overview.trim().length < overviewMinLength ? 'text-yellow-400' : 'text-cyan'}>
                    {formData.overview.length}/{overviewMaxLength}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 flex justify-end">
                <button 
                  type="submit"
                  disabled={isSavingDraft}
                  className="px-8 py-4 rounded-full bg-cyan text-black font-semibold hover:scale-[1.02] transition-transform duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                >
                  {isSavingDraft && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSavingDraft ? 'Saving Draft...' : 'Next: Budget & Launch'}
                </button>
              </div>

            </form>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
