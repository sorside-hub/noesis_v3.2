import React from 'react';
import { BookOpen, MessageSquare, Settings } from 'lucide-react';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { useVirtualKeyboard } from '../../hooks/useVirtualKeyboard';
import { useNavigation } from '../../context/NavigationContext';

export type ActiveTab = 'vault' | 'chat' | 'settings';

interface BottomNavPillProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const BottomNavPill: React.FC<BottomNavPillProps> = ({ activeTab, onTabChange }) => {
  const { isVisible } = useScrollDirection();
  const { isKeyboardOpen } = useVirtualKeyboard();
  const { isMobileRightSidebarOpen } = useNavigation();

  const shouldShow = isVisible && !isKeyboardOpen && !isMobileRightSidebarOpen;
  const isChatView = activeTab === 'chat';

  return (
    <div
      className={`fixed lg:hidden z-40 transition-all duration-200 ease-out ${
        isChatView
          ? `right-3 top-1/2 -translate-y-1/2 ${
              shouldShow
                ? 'translate-x-0 opacity-100'
                : 'translate-x-16 opacity-0 pointer-events-none'
            }`
          : `bottom-6 left-1/2 -translate-x-1/2 ${
              shouldShow
                ? 'translate-y-0 opacity-100'
                : 'translate-y-20 opacity-0 pointer-events-none'
            }`
      }`}
    >
      <nav
        aria-label="Main Navigation"
        className={`p-1 rounded-full bg-bg-surface/90 backdrop-blur-md border border-border-default shadow-lg shadow-black/5 ring-1 ring-border-subtle ${
          isChatView ? 'flex flex-col items-center gap-1.5' : 'flex flex-row items-center gap-1'
        }`}
      >
        <button
          type="button"
          aria-label="Vault"
          title="Vault"
          onClick={() => onTabChange('vault')}
          className={`p-2.5 rounded-full transition-all duration-150 cursor-pointer flex items-center justify-center ${
            activeTab === 'vault'
              ? 'bg-text-primary text-bg-surface shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover/60'
          }`}
        >
          <BookOpen size={18} />
        </button>

        <button
          type="button"
          aria-label="Chat"
          title="Chat"
          onClick={() => onTabChange('chat')}
          className={`p-2.5 rounded-full transition-all duration-150 cursor-pointer flex items-center justify-center ${
            activeTab === 'chat'
              ? 'bg-text-primary text-bg-surface shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover/60'
          }`}
        >
          <MessageSquare size={18} />
        </button>

        <button
          type="button"
          aria-label="Settings"
          title="Settings"
          onClick={() => onTabChange('settings')}
          className={`p-2.5 rounded-full transition-all duration-150 cursor-pointer flex items-center justify-center ${
            activeTab === 'settings'
              ? 'bg-text-primary text-bg-surface shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover/60'
          }`}
        >
          <Settings size={18} />
        </button>
      </nav>
    </div>
  );
};
