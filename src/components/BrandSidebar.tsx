import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Megaphone, Wallet, Settings, X, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

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

  useLockBodyScroll(isOpen);

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

      <aside className={`app-sidebar w-64 h-[100dvh] fixed left-0 top-0 bg-[#0A0A1E] border-r border-white/10 flex flex-col z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="h-16 px-4 flex items-center justify-between">
          <div
            className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
          >
            <img src="/AtlasReachIcon.png" alt="Logo" className="h-3 w-auto shrink-0 object-contain" />
            <span className="text-base font-semibold text-white tracking-tight">AtlasReach</span>
          </div>
          <button
            className="md:hidden text-muted hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path || location.pathname.startsWith(link.path + '/');

            return (
              <button
                key={link.name}
                onClick={() => navigate(link.path)}
                className={`app-nav-link w-full flex min-h-9 items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-all duration-200 ${
                  isActive
                    ? 'bg-white/[0.075] text-cyan border border-white/[0.09]'
                    : 'text-muted hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="font-medium">{link.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="app-sidebar-footer p-2.5 border-t border-white/10">
          <div className="app-profile-card p-2.5 rounded-lg bg-white/[0.035] border border-white/10 flex items-center gap-2.5">
            <img
              src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.full_name || user?.email || 'Brand User')}`}
              alt="Brand User"
              className="w-9 h-9 rounded-full border border-white/20 object-cover"
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
