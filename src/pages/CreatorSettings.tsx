import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Bell, Shield, Wallet, Twitter, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useDisconnect } from 'wagmi';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import { useAuth } from '../context/AuthContext';
import { useCreatorProfile } from '../hooks/useCreatorProfile';

const appleEase = [0.16, 1, 0.3, 1];

const shortenAddress = (value?: string) => value ? `${value.slice(0, 6)}...${value.slice(-4)}` : 'Not bound';

export default function CreatorSettings() {
  const [activeTab, setActiveTab] = useState('notifications');
  const { signOut } = useAuth();
  const { profile, loading } = useCreatorProfile();
  const navigate = useNavigate();
  const { disconnect } = useDisconnect();
  const { address } = useAccount();

  const handleLogout = async () => {
    disconnect();
    await signOut();
    navigate('/login');
  };

  const walletAddress = profile?.wallet_address || address;

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
                        <div className="space-y-4">
                          {['New Campaigns', 'Campaign Updates', 'Payment Alerts'].map((label) => (
                            <div key={label} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                              <div>
                                <h3 className="font-medium text-white">{label}</h3>
                                <p className="text-sm text-muted">Notification delivery will be enabled when the notification service is connected.</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" disabled className="sr-only peer" />
                                <div className="w-11 h-6 bg-white/10 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/60 after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
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