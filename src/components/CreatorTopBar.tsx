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
      className={`creator-page-controls fixed inset-x-0 top-0 z-[45] h-16 bg-[#0A0A1E] md:hidden ${
        embedded ? '' : 'mx-auto'
      }`}
    >
      {/* Glass effect lives on its own absolutely-positioned layer, separate from
          the fixed positioning element above - iOS Safari (26+) doesn't reliably
          composite backdrop-filter directly on a fixed element that extends into
          the safe area, which showed up as a transparent/black seam behind the
          notch. The bg-[#0A0A1E] on the fixed parent is a solid fallback so that
          region is never see-through even if the blur layer has issues. */}
      <div className="creator-topbar-glass absolute inset-0 border-b border-white/10 bg-[#0A0A1E] backdrop-blur-xl" />
      <div className="relative flex h-full items-center gap-2 px-3">
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
          aria-label="Go to AtlasReach home"
          className="flex min-w-0 touch-manipulation items-center gap-1 rounded-xl px-1.5 py-2 text-left"
        >
          <img src="/AtlasReachIcon.png" alt="" className="h-3 w-auto shrink-0 object-contain" />
          <span className="truncate text-base font-semibold tracking-tight text-white">
            AtlasReach
          </span>
        </button>
      </div>
    </div>
  );
}
