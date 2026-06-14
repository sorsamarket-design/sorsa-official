import { Menu } from 'lucide-react';

type CreatorTopBarProps = {
  embedded?: boolean;
};

export default function CreatorTopBar({ embedded = false }: CreatorTopBarProps) {
  const toggleSidebar = () => document.dispatchEvent(new CustomEvent('toggleSidebar'));

  return (
    <div
      className={
        embedded
          ? 'creator-page-controls relative z-40 flex items-center'
          : 'creator-page-controls relative z-40 mx-auto mb-3 flex h-10 w-full max-w-6xl items-center'
      }
    >
      <button
        onClick={toggleSidebar}
        aria-label="Open navigation"
        className="app-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-white md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
    </div>
  );
}
