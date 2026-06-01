import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import BrandSidebar from '../components/BrandSidebar';
import TopBar from '../components/TopBar';
import { useBrandProfiles } from '../hooks/useBrandProfiles';

const appleEase = [0.16, 1, 0.3, 1];

export default function BrandProfileNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const { createProfile, profiles } = useBrandProfiles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    company_name: '',
    website: '',
    twitter_handle: '',
    telegram_handle: '',
    description: '',
    logo_url: ''
  });

  useEffect(() => {
    if (editId && profiles.length > 0) {
      const profileToEdit = profiles.find(p => p.id === editId);
      if (profileToEdit) {
        setFormData({
          company_name: profileToEdit.company_name || '',
          website: profileToEdit.website || '',
          twitter_handle: profileToEdit.twitter_handle || '',
          telegram_handle: (profileToEdit as any).telegram_handle || '', // in case it's added later
          description: profileToEdit.description || '',
          logo_url: profileToEdit.logo_url || ''
        });
        if (profileToEdit.logo_url) {
          setLogoPreview(profileToEdit.logo_url);
        }
      }
    }
  }, [editId, profiles]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (editId) {
        // TODO: implement update profile
        alert("Edit functionality not fully implemented yet");
        navigate('/brand/profiles');
        return;
      }

      await createProfile({
        company_name: formData.company_name,
        website: formData.website,
        twitter_handle: formData.twitter_handle,
        description: formData.description,
        logo_url: formData.logo_url
      }, logoFile || undefined);
      
      navigate('/brand/profiles');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while saving the profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <BrandSidebar />
      <TopBar />
      
      <main className="flex-1 md:ml-64 mt-20 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          
          <div className="flex items-center gap-4 mb-10">
            <motion.button 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: appleEase }}
              onClick={() => navigate('/brand/profiles')}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
              className="text-3xl font-semibold tracking-tight text-white"
            >
              {editId ? 'Edit Brand Profile' : 'New Brand Profile'}
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
            className="glass-panel rounded-[2rem] p-8 relative overflow-hidden border border-white/10"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-cyan/5 blur-[100px] rounded-full pointer-events-none"></div>
            
            <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
              
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-muted mb-3">Brand Logo (JPG/PNG)</label>
                <div className="flex items-center gap-6">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors overflow-hidden ${
                      logoPreview ? 'border-white/20' : 'border-white/10 hover:border-cyan/50 hover:bg-cyan/5'
                    }`}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-muted">
                        <ImageIcon className="w-6 h-6 mb-1" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">Upload</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted mb-3 leading-relaxed">
                      Upload a high-resolution logo. Recommended size is 400x400px. Max file size 5MB.
                    </p>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Choose File
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageChange}
                      accept="image/png, image/jpeg" 
                      className="hidden" 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Project/Company Name</label>
                  <input 
                    type="text" 
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Sorsa Market"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Project Website Link</label>
                  <input 
                    type="url" 
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">X Handle Link</label>
                  <input 
                    type="text" 
                    name="twitter_handle"
                    value={formData.twitter_handle}
                    onChange={handleInputChange}
                    placeholder="https://x.com/yourbrand"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted">Telegram Contact Info</label>
                  <input 
                    type="text" 
                    name="telegram_handle"
                    value={formData.telegram_handle}
                    onChange={handleInputChange}
                    placeholder="@username"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted">Description</label>
                <textarea 
                  rows={4}
                  required
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Tell creators about your brand and what you're building..."
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all resize-none"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => navigate('/brand/profiles')}
                  className="px-6 py-3 rounded-full bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-full bg-cyan text-black font-semibold hover:scale-[1.02] transition-transform duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editId ? 'Update Profile' : 'Save Profile'}
                </button>
              </div>

            </form>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
