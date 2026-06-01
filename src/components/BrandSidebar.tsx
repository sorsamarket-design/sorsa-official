import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Megaphone, Wallet, Settings, X, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BrandSidebar() {
  const { user } = useAuth();
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

  const navLinks = [
    { name: 'Dashboard', path: '/brand/dashboard', icon: LayoutDashboard },
    { name: 'Brand Profiles', path: '/brand/profiles', icon: Briefcase },
    { name: 'Campaigns', path: '/brand/campaigns', icon: Megaphone },
    { name: 'Wallet', path: '/brand/wallet', icon: Wallet },
    { name: 'Settings', path: '/brand/settings', icon: Settings },
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

      <aside className={`w-64 h-screen fixed left-0 top-0 bg-[#0A0A1E] border-r border-white/10 flex flex-col z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => navigate('/')}
          >
            <img src="/sosomarket.png" alt="Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-semibold text-white tracking-tight">SorsaMarket</span>
          </div>
          <button 
            className="md:hidden text-muted hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path || location.pathname.startsWith(link.path + '/');
            
            return (
              <button
                key={link.name}
                onClick={() => navigate(link.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-cyan/10 text-cyan border border-cyan/20 shadow-[inset_0_1px_1px_rgba(0,212,255,0.2)]' 
                    : 'text-muted hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{link.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <img 
              src={user?.user_metadata?.avatar_url || "https://picsum.photos/seed/brand/100/100"} 
              alt="Brand User" 
              className="w-10 h-10 rounded-full border border-white/20 object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.user_metadata?.full_name || 'Brand User'}
              </p>
              <p className="text-xs text-muted truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
