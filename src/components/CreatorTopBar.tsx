import React, { useState, useRef, useEffect } from 'react';
import { Bell, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getInitialsAvatarUrl, normalizeAvatarUrl } from '../lib/avatars';

export default function CreatorTopBar() {
  const { user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setNotificationsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSidebar = () => document.dispatchEvent(new CustomEvent('toggleSidebar'));
  const name = user?.user_metadata?.user_name || user?.user_metadata?.full_name || user?.email || 'Creator';
  const avatar = normalizeAvatarUrl(user?.user_metadata?.avatar_url) || getInitialsAvatarUrl(name);

  return (
    <header className="h-20 fixed top-0 right-0 left-0 md:left-64 bg-[#0A0A1E]/80 backdrop-blur-xl border-b border-white/10 z-40 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="md:hidden p-2 -ml-2 text-muted hover:text-white transition-colors"><Menu className="w-6 h-6" /></button>
        <div className="px-3 md:px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 md:gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <img src={avatar} alt="Creator" className="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover border border-white/20" referrerPolicy="no-referrer" />
          <span className="text-white font-medium text-sm md:text-base truncate max-w-[100px] md:max-w-none">@{name}</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="relative w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors"><Bell className="w-5 h-5" /></button>
          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-[#13132B] rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-50">
              <div className="px-4 py-3 border-b border-white/10 bg-white/5"><h3 className="text-sm font-semibold text-white">Notifications</h3></div>
              <div className="p-6 text-center text-muted text-sm">No notifications yet.</div>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan to-blue-500 p-[2px] cursor-pointer hover:scale-105 transition-transform"><img src={avatar} alt="User Avatar" className="w-full h-full rounded-full object-cover border-2 border-[#0A0A1E]" referrerPolicy="no-referrer" /></div>
      </div>
    </header>
  );
}
