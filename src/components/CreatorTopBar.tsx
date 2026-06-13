import { useEffect, useRef, useState } from 'react';
import { Bell, Menu } from 'lucide-react';

type CreatorTopBarProps = {
  embedded?: boolean;
};

export default function CreatorTopBar({ embedded = false }: CreatorTopBarProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSidebar = () => document.dispatchEvent(new CustomEvent('toggleSidebar'));

  return (
    <div
      className={
        embedded
          ? 'creator-page-controls relative z-40 flex items-center gap-2'
          : 'creator-page-controls relative z-40 mx-auto mb-3 flex h-10 w-full max-w-6xl items-center justify-between'
      }
    >
      <button
        onClick={toggleSidebar}
        aria-label="Open navigation"
        className="app-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-white md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className={`relative ${embedded ? '' : 'ml-auto'}`} ref={dropdownRef}>
        <button
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          aria-label="Notifications"
          aria-expanded={notificationsOpen}
          className="app-icon-button relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#121229]/90 text-muted shadow-lg backdrop-blur-xl transition-colors hover:bg-white/10 hover:text-white"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>
        {notificationsOpen && (
          <div className="absolute top-full right-0 z-50 mt-2 w-[calc(100vw-1.5rem)] max-w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#13132B] shadow-2xl sm:w-96 sm:max-w-none">
            <div className="border-b border-white/10 bg-white/5 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
            </div>
            <div className="p-6 text-center text-sm text-muted">No notifications yet.</div>
          </div>
        )}
      </div>
    </div>
  );
}
