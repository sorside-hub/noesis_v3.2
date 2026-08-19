import React from 'react';
import { Plus, FolderPlus, Search, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface FloatingActionPillProps {
  isPillHidden: boolean;
  onCreateNote: (parentId?: string | null) => void;
  onCreateFolder: (parentId?: string | null) => void;
  onCloseMobile: () => void;
  isTreeSearchOpen: boolean;
  setIsTreeSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  areAllFoldersCollapsed: boolean;
  handleToggleExpandCollapseAll: () => void;
}

export const FloatingActionPill: React.FC<FloatingActionPillProps> = ({
  isPillHidden,
  onCreateNote,
  onCreateFolder,
  onCloseMobile,
  isTreeSearchOpen,
  setIsTreeSearchOpen,
  areAllFoldersCollapsed,
  handleToggleExpandCollapseAll,
}) => {
  return (
    <div
      className={twMerge(
        'absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-max max-w-[calc(100%-1.5rem)] transition-all duration-150',
        isPillHidden
          ? 'opacity-0 translate-y-12 pointer-events-none'
          : 'opacity-100 translate-y-0 pointer-events-auto'
      )}
    >
      <div className="flex items-center gap-1 px-2 py-1.5 bg-bg-surface/95 dark:bg-bg-surface/90 backdrop-blur-md border border-border-default rounded-full shadow-lg shadow-black/10 transition-transform">
        {/* 1. New Note */}
        <button
          type="button"
          title="New Note"
          onClick={() => {
            onCreateNote(null);
            onCloseMobile();
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-text-secondary hover:text-accent-primary hover:bg-bg-hover transition-colors cursor-pointer"
        >
          <Plus size={14} className="text-accent-primary" />
          <span>Note</span>
        </button>

        {/* 2. New Folder */}
        <button
          type="button"
          title="New Folder"
          onClick={() => onCreateFolder(null)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-text-secondary hover:text-accent-primary hover:bg-bg-hover transition-colors cursor-pointer"
        >
          <FolderPlus size={14} className="text-accent-primary" />
          <span>Folder</span>
        </button>

        <div className="w-px h-4 bg-border-default mx-0.5" />

        {/* 3. Search Toggle */}
        <button
          type="button"
          title={isTreeSearchOpen ? 'Tutup Search' : 'Search Berkas'}
          onClick={() => setIsTreeSearchOpen((prev) => !prev)}
          className={twMerge(
            'p-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer',
            isTreeSearchOpen
              ? 'bg-accent-primary/15 text-accent-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          )}
        >
          <Search size={14} />
        </button>

        {/* 4. Expand / Lipat All */}
        <button
          type="button"
          title={areAllFoldersCollapsed ? 'Buka Semua Folder' : 'Lipat Semua Folder'}
          onClick={handleToggleExpandCollapseAll}
          className="p-1.5 rounded-full text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
        >
          {areAllFoldersCollapsed ? (
            <ChevronsUpDown size={14} className="text-accent-primary" />
          ) : (
            <ChevronsDownUp size={14} />
          )}
        </button>
      </div>
    </div>
  );
};
