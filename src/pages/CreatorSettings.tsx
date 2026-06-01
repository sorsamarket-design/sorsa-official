import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, User, Bell, Shield, Wallet, Twitter, Save, LogOut } from 'lucide-react';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';

import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useDisconnect } from 'wagmi';

const appleEase = [0.16, 1, 0.3, 1];

export default function CreatorSettings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { disconnect } = useDisconnect();

  const handleLogout = async () => {
    disconnect();
    await signOut();
    navigate('/login');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Settings saved successfully.');
    }, 1000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
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
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase }}
              className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3"
            >
              <SettingsIcon className="w-8 h-8 text-cyan" /> Settings
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
              className="text-muted mt-2"
            >
              Manage your account preferences and connected services.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
            className="flex flex-col md:flex-row gap-8"
          >
            {/* Sidebar Tabs */}
            <div className="w-full md:w-64 shrink-0 space-y-2 flex flex-col justify-between h-full">
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      activeTab === tab.id 
                        ? 'bg-white/10 text-white border border-white/20' 
                        : 'text-muted hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
              
              <div className="pt-8 mt-auto">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 font-medium"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1">
              <div className="glass-panel rounded-[2rem] p-8 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/5 blur-[80px] rounded-full pointer-events-none"></div>
                
                <form onSubmit={handleSave} className="relative z-10 space-y-8">
                  
                  {activeTab === 'profile' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-6"
                    >
                      <h2 className="text-xl font-semibold text-white mb-6">Profile Settings</h2>
                      
                      <div className="flex items-center gap-6">
                        <img 
                          src="https://picsum.photos/seed/creator/150/150" 
                          alt="Avatar" 
                          className="w-20 h-20 rounded-full border border-white/20 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-muted mb-2">Display Name</label>
                          <input 
                            type="text" 
                            defaultValue="Khalid"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan/50 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted mb-2">Email Address</label>
                          <input 
                            type="email" 
                            defaultValue="khalid@example.com"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan/50 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-muted mb-2">Bio</label>
                        <textarea 
                          defaultValue="Web3 enthusiast, DeFi degen, and NFT collector. Sharing insights and deep dives into the crypto ecosystem."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan/50 transition-colors resize-none h-24"
                        />
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'notifications' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-6"
                    >
                      <h2 className="text-xl font-semibold text-white mb-6">Notification Preferences</h2>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                          <div>
                            <h3 className="font-medium text-white">New Campaigns</h3>
                            <p className="text-sm text-muted">Get notified when campaigns matching your tier are posted.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                          <div>
                            <h3 className="font-medium text-white">Campaign Updates</h3>
                            <p className="text-sm text-muted">Notifications about approvals, rejections, or revisions.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                          <div>
                            <h3 className="font-medium text-white">Payment Alerts</h3>
                            <p className="text-sm text-muted">Get notified when USDC is released to your wallet.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan"></div>
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'connections' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-6"
                    >
                      <h2 className="text-xl font-semibold text-white mb-6">Connected Accounts</h2>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                              <Twitter className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-medium text-white">X (Twitter)</h3>
                              <p className="text-sm text-cyan">@crypto_khalid</p>
                            </div>
                          </div>
                          <button type="button" className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                            Disconnect
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-cyan/10 flex items-center justify-center">
                              <Wallet className="w-5 h-5 text-cyan" />
                            </div>
                            <div>
                              <h3 className="font-medium text-white">Wallet Address</h3>
                              <p className="text-sm text-muted font-mono">0x71C...9A23</p>
                            </div>
                          </div>
                          <button type="button" className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                            Change
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="pt-6 border-t border-white/10 flex justify-end">
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-3 rounded-xl bg-cyan text-black font-semibold hover:bg-cyan/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'} <Save className="w-4 h-4" />
                    </button>
                  </div>

                </form>
              </div>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
