import { Menu, ShieldCheck } from 'lucide-react';

export default function AdminTopBar() {
  const toggleSidebar = () => document.dispatchEvent(new CustomEvent('toggleSidebar'));

  return (
    <div className="admin-page-controls fixed inset-x-0 top-0 z-[45] h-16 bg-[#0A0A1E] md:hidden">
      {/* Same solid-bg-plus-separate-blur-layer pattern as TopBar.tsx/CreatorTopBar.tsx -
          iOS Safari doesn't reliably composite backdrop-filter directly on a fixed
          element that extends into the safe area, so the outer fixed parent stays a
          solid fallback color and the blur lives on its own promoted layer. */}
      <div className="admin-topbar-glass absolute inset-0 border-b border-white/10 bg-[#0A0A1E]/95 backdrop-blur-xl" />
      <div className="relative flex h-full items-center justify-between gap-2 px-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Open navigation"
          className="app-icon-button flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-white transition-colors hover:bg-white/5"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white">Admin</span>
        </div>
      </div>
    </div>
  );
}
