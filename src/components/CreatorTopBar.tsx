import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle, Info, X, Menu } from 'lucide-react';
import { mockCreatorNotifications } from '../data/mock';
import { useAuth } from '../context/AuthContext';

export default function CreatorTopBar() {
  const { user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockCreatorNotifications);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default: return <Info className="w-4 h-4 text-cyan" />;
    }
  };

  const toggleSidebar = () => {
    document.dispatchEvent(new CustomEvent('toggleSidebar'));
  };

  return (
    <header className="h-20 fixed top-0 right-0 left-0 md:left-64 bg-[#0A0A1E]/80 backdrop-blur-xl border-b border-white/10 z-40 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="md:hidden p-2 -ml-2 text-muted hover:text-white transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="px-3 md:px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 md:gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <img 
            src={user?.user_metadata?.avatar_url || "https://picsum.photos/seed/creator/100/100"} 
            alt="Creator" 
            className="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover border border-white/20" 
            referrerPolicy="no-referrer" 
          />
          <span className="text-white font-medium text-sm md:text-base truncate max-w-[100px] md:max-w-none">
            @{user?.user_metadata?.user_name || user?.user_metadata?.full_name || 'Creator'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-cyan rounded-full shadow-[0_0_8px_rgba(0,212,255,0.8)]"></span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-[#13132B] rounded-2xl overflow-hidden shadow-2xl origin-top-right animate-in fade-in zoom-in-95 duration-200 border border-white/10 z-50">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-cyan hover:underline font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-muted text-sm">
                    No notifications yet.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className={`p-4 hover:bg-white/5 transition-colors relative group ${!notification.read ? 'bg-white/[0.02]' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            notification.type === 'success' ? 'bg-green-500/10' :
                            notification.type === 'warning' ? 'bg-yellow-500/10' :
                            'bg-cyan/10'
                          }`}>
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium mb-1 ${!notification.read ? 'text-white' : 'text-white/80'}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted leading-relaxed line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-muted/60 mt-2 font-medium">
                              {notification.time}
                            </p>
                          </div>
                          <button 
                            onClick={(e) => removeNotification(notification.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-all shrink-0 self-start"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {!notification.read && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan rounded-r-full"></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-3 border-t border-white/10 bg-white/5 text-center">
                <button className="text-xs font-medium text-muted hover:text-white transition-colors">
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan to-blue-500 p-[2px] cursor-pointer hover:scale-105 transition-transform">
          <img 
            src={user?.user_metadata?.avatar_url || "https://picsum.photos/seed/creator/100/100"} 
            alt="User Avatar" 
            className="w-full h-full rounded-full object-cover border-2 border-[#0A0A1E]" 
            referrerPolicy="no-referrer" 
          />
        </div>
      </div>
    </header>
  );
}
