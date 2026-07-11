import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bell, Menu, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBrandProfiles } from '../hooks/useBrandProfiles';
import { getInitialsAvatarUrl, normalizeAvatarUrl } from '../lib/avatars';

export default function TopBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profiles, selectedProfile, selectProfile } = useBrandProfiles();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotificationsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSidebar = () => document.dispatchEvent(new CustomEvent('toggleSidebar'));
  const avatar = normalizeAvatarUrl(user?.user_metadata?.avatar_url) || getInitialsAvatarUrl(user?.email || 'User');

  return (
    <header className="app-topbar h-[4.625rem] fixed top-0 right-0 left-0 md:left-64 bg-[#0A0A1E] z-[45]">
      {/* Glass effect lives on its own absolutely-positioned layer, separate from
          the fixed positioning element above - iOS Safari (26+) doesn't reliably
          composite backdrop-filter directly on a fixed element that extends into
          the safe area, which showed up as a transparent/black seam behind the
          notch. The bg-[#0A0A1E] on the fixed parent is a solid fallback so that
          region is never see-through even if the blur layer has issues. */}
      <div className="app-topbar-glass absolute inset-0 border-b border-white/10" />
      <div className="relative flex h-full min-w-0 items-center justify-between gap-2 px-3 sm:px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Open navigation"
          className="app-icon-button flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-white transition-colors hover:bg-white/5 md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Go to AtlasReach home"
          className="flex min-w-0 touch-manipulation items-center gap-1 rounded-xl px-1.5 py-2 text-left md:hidden"
        >
          <img src="/AtlasReachIcon.png" alt="" className="h-3 w-auto shrink-0 object-contain" />
          <span className="truncate text-base font-semibold tracking-tight text-white">
            AtlasReach
          </span>
        </button>

        <div className="relative hidden min-w-0 md:block" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="app-control flex min-w-0 max-w-[12rem] items-center gap-2 px-2.5 sm:px-3 md:px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            {selectedProfile ? (
              <>
                <img src={selectedProfile.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedProfile.company_name)}`} alt={selectedProfile.company_name} className="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover border border-white/20" referrerPolicy="no-referrer" />
                <span className="min-w-0 truncate text-sm font-medium text-white sm:max-w-36 md:text-base">{selectedProfile.company_name}</span>
              </>
            ) : <span className="min-w-0 truncate text-sm font-medium text-white md:text-base">No Profile Selected</span>}
            <ChevronDown className={`w-4 h-4 shrink-0 text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-[calc(100vw-5rem)] max-w-64 sm:w-56 glass-panel rounded-2xl overflow-hidden py-2 shadow-2xl origin-top-left animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Switch Profile</div>
              {profiles.length > 0 ? profiles.map(profile => (
                <button key={profile.id} onClick={() => { selectProfile(profile.id); setDropdownOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left ${selectedProfile?.id === profile.id ? 'bg-white/5' : ''}`}>
                  <img src={profile.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.company_name)}`} alt={profile.company_name} className="w-8 h-8 rounded-full object-cover border border-white/20" referrerPolicy="no-referrer" />
                  <span className="min-w-0 truncate text-white text-sm font-medium">{profile.company_name}</span>
                </button>
              )) : <div className="px-4 py-3 text-sm text-muted">No profiles available</div>}
              <div className="border-t border-white/10 mt-2 pt-2">
                <button onClick={() => { navigate('/brand/profiles/new'); setDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left text-cyan"><Plus className="w-5 h-5" /><span className="text-sm font-medium">Create New Profile</span></button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-2 sm:gap-3 md:flex">
        <div className="relative" ref={notifRef}>
          <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="app-icon-button relative w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors">
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-cyan rounded-full shadow-[0_0_8px_rgba(0,212,255,0.8)]" />}
          </button>
          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-80 sm:w-96 bg-[#13132B] rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-50">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5"><h3 className="text-sm font-semibold text-white">Notifications</h3></div>
              <div className="p-6 text-center text-muted text-sm">No notifications yet.</div>
            </div>
          )}
        </div>
        <div className="hidden sm:block w-9 h-9 rounded-full bg-gradient-to-tr from-cyan to-blue-500 p-[1px] cursor-pointer hover:scale-105 transition-transform">
          <img src={avatar} alt="User Avatar" className="w-full h-full rounded-full object-cover border-2 border-[#0A0A1E]" referrerPolicy="no-referrer" />
        </div>
      </div>
      </div>
    </header>
  );
}
