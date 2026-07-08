import { Menu, ShieldCheck } from 'lucide-react';

export default function AdminTopBar() {
  const toggleSidebar = () => document.dispatchEvent(new CustomEvent('toggleSidebar'));

  return (
    <div className="creator-page-controls fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-2 border-b border-white/10 bg-[#0A0A1E]/95 px-3 backdrop-blur-xl md:hidden">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Open navigation"
        className="app-icon-button flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-white transition-colors hover:bg-white/5"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div className="flex min-w-0 items-center gap-2 px-1.5 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/20">
          <ShieldCheck className="h-4 w-4 text-purple-400" />
        </div>
        <span className="truncate text-base font-semibold tracking-tight text-white">
          Sorsa Admin
        </span>
      </div>
    </div>
  );
}
