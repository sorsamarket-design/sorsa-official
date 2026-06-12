import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Inbox, LayoutDashboard, LogOut, Megaphone, PlusCircle, ShieldCheck, Sparkles, Ticket, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Megaphone, label: 'Campaigns', path: '/admin/campaigns' },
    { icon: Ticket, label: 'Raffle', path: '/admin/raffles' },
    { icon: PlusCircle, label: 'Create Campaign', path: '/admin/campaigns/new' },
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

      <aside className={`w-64 h-screen bg-[#0A0A1E] border-r border-white/10 fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Sorsa Admin</span>
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
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
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
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Admin User</p>
              <p className="text-xs text-muted truncate">{user?.email || 'Super Admin'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full px-4 py-3 rounded-xl border border-white/10 text-muted hover:text-white hover:bg-white/5 transition-colors inline-flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
