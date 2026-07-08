import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Gift,
  Mail,
  Megaphone,
  PlayCircle,
  Settings,
  Sparkles,
  Trophy,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCreatorProfile } from '../hooks/useCreatorProfile';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { getInitialsAvatarUrl, normalizeAvatarUrl } from '../lib/avatars';

const navigationGroups = [
  [
    { icon: User, label: 'Profile', path: '/creator/profile' },
  ],
  [
    { icon: Megaphone, label: 'Campaigns', path: '/creator/campaigns' },
    { icon: Sparkles, label: 'NFT Campaigns', path: '/creator/nft-campaigns' },
    { icon: PlayCircle, label: 'My Campaigns', path: '/creator/active' },
    { icon: Trophy, label: 'Leaderboard', path: '/creator/leaderboard' },
  ],
  [
    { icon: Wallet, label: 'Wallet', path: '/creator/wallet' },
    { icon: Gift, label: 'Refer & Earn', path: '/creator/referral' },
  ],
  [
    { icon: Mail, label: 'Contact', path: '/creator/contact' },
    { icon: Settings, label: 'Settings', path: '/creator/settings' },
  ],
];

export default function CreatorSidebar() {
  const { user } = useAuth();
  const { profile } = useCreatorProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsOpen((previous) => !previous);
    document.addEventListener('toggleSidebar', handleToggle);
    return () => document.removeEventListener('toggleSidebar', handleToggle);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useLockBodyScroll(isOpen);

  const handle =
    profile?.x_handle ||
    user?.user_metadata?.user_name ||
    user?.user_metadata?.full_name ||
    'Creator';
  const displayHandle = handle.startsWith('@') ? handle : `@${handle}`;
  const avatar =
    normalizeAvatarUrl(profile?.avatar_url) ||
    normalizeAvatarUrl(user?.user_metadata?.avatar_url) ||
    getInitialsAvatarUrl(handle);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar creator-sidebar fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/10 bg-[#0A0A1E] transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <button
            type="button"
            className="flex min-h-11 items-center gap-1 rounded-xl text-left transition-opacity hover:opacity-80"
            onClick={() => navigate('/')}
          >
            <img src="/AtlasReachIcon.png" alt="" className="h-3 w-auto shrink-0 object-contain" />
            <span className="text-base font-semibold tracking-tight text-white">AtlasReach</span>
          </button>

          <button
            type="button"
            aria-label="Close navigation"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-white md:hidden"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {navigationGroups.map((group, groupIndex) => (
            <div
              key={group[0].path}
              className={groupIndex ? 'mt-1' : ''}
            >
              <div className="space-y-1">
                {group.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `app-nav-link group flex min-h-9 items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium ${
                        isActive
                          ? 'border-white/[0.09] bg-white/[0.075] text-cyan'
                          : 'border-transparent text-muted hover:border-white/[0.06] hover:bg-white/[0.045] hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0 stroke-[1.8]" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-2.5">
          <button
            type="button"
            onClick={() => navigate('/creator/profile')}
            className="app-profile-card flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.035] p-2.5 text-left"
          >
            <img
              src={avatar}
              alt="Creator"
              className="h-9 w-9 shrink-0 rounded-full border border-white/20 object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{displayHandle}</p>
              <p className="mt-0.5 text-xs text-cyan">Score: {Math.round(profile?.sorsa_score || 0)}</p>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
