import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { User, Megaphone, PlayCircle, Trophy, Mail, Wallet, Settings, Gift, X, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCreatorProfile } from '../hooks/useCreatorProfile';

export default function CreatorSidebar() {
  const { user } = useAuth();
  const { profile } = useCreatorProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    document.addEventListener('toggleSidebar', handleToggle);
    return () => document.removeEventListener('toggleSidebar', handleToggle);
  }, []);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const navItems = [
    { icon: User, label: 'Dashboard', path: '/creator/dashboard' },
    { icon: User, label: 'Profile', path: '/creator/profile' },
    { icon: Megaphone, label: 'Campaigns', path: '/creator/campaigns' },
    { icon: PlayCircle, label: 'My Campaigns', path: '/creator/active' },
    { icon: Trophy, label: 'Leaderboard', path: '/creator/leaderboard' },
    { icon: Wallet, label: 'Wallet', path: '/creator/wallet' },
    { icon: Gift, label: 'Refer & Earn', path: '/creator/referral' },
    { icon: Mail, label: 'Contact', path: '/creator/contact' },
    { icon: Settings, label: 'Settings', path: '/creator/settings' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`w-64 h-screen bg-[#0A0A1E] border-r border-white/10 fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
          >
            <img src="/sosomarket.png" alt="Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-white tracking-tight">SorsaMarket</span>
          </div>
          <button 
            className="md:hidden text-muted hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-cyan/10 text-cyan border border-cyan/20'
                    : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <img 
              src={user?.user_metadata?.avatar_url || "https://picsum.photos/seed/creator/100/100"} 
              alt="Creator" 
              className="w-10 h-10 rounded-full border border-white/20 object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                @{user?.user_metadata?.user_name || user?.user_metadata?.full_name || 'Creator'}
              </p>
              <p className="text-xs text-cyan">Score: {Math.round(profile?.sorsa_score || 0)}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
