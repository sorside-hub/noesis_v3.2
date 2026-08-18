import React from 'react';
import { BookOpen, Settings } from 'lucide-react';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { useVirtualKeyboard } from '../../hooks/useVirtualKeyboard';

export type ActiveTab = 'vault' | 'settings';

interface BottomNavPillProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const BottomNavPill: React.FC<BottomNavPillProps> = ({ activeTab, onTabChange }) => {
  const { isVisible } = useScrollDirection();
  const { isKeyboardOpen } = useVirtualKeyboard();

  const shouldShow = isVisible && !isKeyboardOpen;

  return (
    <div
      className={`fixed lg:hidden bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-200 ease-out ${
        shouldShow
          ? 'translate-y-0 opacity-100'
          : 'translate-y-20 opacity-0 pointer-events-none'
      }`}
    >
      <nav
        aria-label="Main Navigation"
        className="flex items-center gap-1 p-1 rounded-full bg-bg-surface/90 backdrop-blur-md border border-border-default shadow-lg shadow-black/5 ring-1 ring-border-subtle"
      >
        <button
          type="button"
          onClick={() => onTabChange('vault')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
            activeTab === 'vault'
              ? 'bg-text-primary text-bg-surface shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover/60'
          }`}
        >
          <BookOpen size={14} />
          <span>Vault</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-text-primary text-bg-surface shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover/60'
          }`}
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
};
