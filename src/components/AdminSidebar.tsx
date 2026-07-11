import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bot, FileText, Inbox, LayoutDashboard, LogOut, Megaphone, PlusCircle, ShieldCheck, Sparkles, Ticket, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

export default function AdminSidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Megaphone, label: 'Campaigns', path: '/admin/campaigns' },
    { icon: Ticket, label: 'Raffle', path: '/admin/raffles' },
    { icon: PlusCircle, label: 'Create Campaign', path: '/admin/campaigns/new' },
    { icon: Bot, label: 'Bot Configuration', path: '/admin/bot-configuration' },
    { icon: ShieldCheck, label: 'Approvals', path: '/admin/approvals' },
    { icon: Sparkles, label: 'NFT Approvals', path: '/admin/nft-approvals' },
    { icon: FileText, label: 'NFT Submissions', path: '/admin/nft-submissions' },
    { icon: Inbox, label: 'Tickets', path: '/admin/tickets' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/admin', { replace: true });
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`admin-sidebar w-64 h-[100dvh] bg-[#0A0A1E] border-r border-white/10 fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-purple-500/20 border border-purple-500/20 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-base font-semibold text-white tracking-tight">Sorsa Admin</span>
          </div>
          <button 
            className="md:hidden text-muted hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) =>
                `app-nav-link flex min-h-9 items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar-footer p-2.5 border-t border-white/10">
          <div className="app-profile-card p-2.5 rounded-lg bg-white/[0.035] border border-white/10 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-sm text-purple-400 font-bold">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Admin User</p>
              <p className="text-xs text-muted truncate">{user?.email || 'Super Admin'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full px-3 py-2 rounded-lg border border-white/10 text-muted hover:text-white hover:bg-white/5 transition-colors inline-flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
