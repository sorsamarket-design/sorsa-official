import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Building2, Save, Image as ImageIcon, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDisconnect } from 'wagmi';
import BrandSidebar from '../components/BrandSidebar';
import TopBar from '../components/TopBar';
import { supabase } from '../lib/supabase';
import { useBrandProfiles } from '../hooks/useBrandProfiles';
import { useAuth } from '../context/AuthContext';

const appleEase = [0.16, 1, 0.3, 1] as const;

export default function BrandSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('company');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { selectedProfile, loading, refreshProfiles } = useBrandProfiles();
  const { role, signOut } = useAuth();
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;

    setIsSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('brand_profiles')
      .update(formData)
      .eq('id', selectedProfile.id);

    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    await refreshProfiles();
    setMessage('Brand profile updated.');
  };

  const logo = formData.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.company_name || 'Brand')}`;

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
  ];

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <BrandSidebar />
      <TopBar />

      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
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
            <div className="w-full md:w-64 shrink-0 space-y-2">
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === tab.id ? 'bg-white/10 text-white border border-white/20' : 'text-muted hover:bg-white/5 hover:text-white border border-transparent'}`}>
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
              <div className="pt-8">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 font-medium">
                  <LogOut className="w-5 h-5" />
                  <span>{role === 'creator' ? 'Exit Brand Workspace' : 'Log Out'}</span>
                </button>
              </div>
            </div>

            <div className="flex-1">
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
                  <form onSubmit={handleSave} className="relative z-10 space-y-8">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-muted mb-2">Company Name</label>
                            <input type="text" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan/50 transition-colors" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-muted mb-2">Website URL</label>
                            <input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan/50 transition-colors" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-muted mb-2">Company Description</label>
                          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan/50 transition-colors resize-none h-24" />
                        </div>
                      </motion.div>
                    )}

                    {message && <p className="text-sm text-cyan">{message}</p>}

                    <div className="pt-6 border-t border-white/10 flex justify-end">
                      <button type="submit" disabled={isSaving} className="px-6 py-3 rounded-xl bg-cyan text-black font-semibold hover:bg-cyan/90 transition-colors flex items-center gap-2 disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Changes'} <Save className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
