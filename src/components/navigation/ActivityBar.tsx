import React from 'react';
import { BookOpen, Settings, MessageSquare, Plus } from 'lucide-react';
import { ActiveTab } from './BottomNavPill';

interface ActivityBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onCreateNote?: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ activeTab, onTabChange, onCreateNote }) => {
  return (
    <div className="hidden lg:flex flex-col w-12 h-full bg-bg-surface border-r border-border-default shrink-0 items-center py-4 justify-between select-none">
      <div className="flex flex-col items-center gap-4">
        {onCreateNote && (
          <button
            type="button"
            title="Create New Note"
            onClick={onCreateNote}
            className="p-2.5 rounded-xl transition-all duration-150 cursor-pointer text-text-muted hover:text-text-primary hover:bg-bg-hover mb-2 border border-border-default/50"
          >
            <Plus size={20} strokeWidth={2} />
          </button>
        )}
        
        <button
          type="button"
          title="Vault (Files)"
          onClick={() => onTabChange('vault')}
          className={`relative p-2.5 rounded-xl transition-all duration-150 cursor-pointer group flex items-center justify-center ${
            activeTab === 'vault'
              ? 'text-text-primary'
              : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <BookOpen size={20} strokeWidth={activeTab === 'vault' ? 2.5 : 2} />
          {activeTab === 'vault' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-text-primary rounded-r-full" />
          )}
        </button>

        <button
          type="button"
          title="Chat"
          onClick={() => onTabChange('chat')}
          className={`relative p-2.5 rounded-xl transition-all duration-150 cursor-pointer group flex items-center justify-center ${
            activeTab === 'chat'
              ? 'text-text-primary'
              : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <MessageSquare size={20} strokeWidth={activeTab === 'chat' ? 2.5 : 2} />
          {activeTab === 'chat' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-text-primary rounded-r-full" />
          )}
        </button>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          title="Settings"
          onClick={() => onTabChange('settings')}
          className={`relative p-2.5 rounded-xl transition-all duration-150 cursor-pointer group flex items-center justify-center ${
            activeTab === 'settings'
              ? 'text-text-primary'
              : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <Settings size={20} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
          {activeTab === 'settings' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-text-primary rounded-r-full" />
          )}
        </button>
      </div>
    </div>
  );
};
