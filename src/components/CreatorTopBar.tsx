import { Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type CreatorTopBarProps = {
  embedded?: boolean;
};

export default function CreatorTopBar({ embedded = false }: CreatorTopBarProps) {
  const navigate = useNavigate();
  const toggleSidebar = () => document.dispatchEvent(new CustomEvent('toggleSidebar'));

  return (
    <div
      className={`creator-page-controls fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-2 border-b border-white/10 bg-[#0A0A1E]/95 px-3 backdrop-blur-xl md:hidden ${
        embedded ? '' : 'mx-auto'
      }`}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Open navigation"
        className="app-icon-button flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-white transition-colors hover:bg-white/5"
      >
        <Menu className="h-6 w-6" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Go to SorsaMarket home"
        className="flex min-w-0 touch-manipulation items-center gap-2 rounded-xl px-1.5 py-2 text-left"
      >
        <img src="/SorsaMarketlogo.PNG" alt="" className="h-8 w-8 shrink-0 object-contain" />
        <span className="truncate text-base font-semibold tracking-tight text-white">
          Sorsa<span className="text-cyan">Market</span>
        </span>
      </button>
    </div>
  );
}
