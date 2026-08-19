import React from 'react';
import { FolderInput, X, Search, Home, Folder } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { FileNode } from '../../../types/vault';

interface MoveNodeModalProps {
  movingNode: FileNode | null;
  folderSearchQuery: string;
  setFolderSearchQuery: (query: string) => void;
  folderSearchInputRef: React.RefObject<HTMLInputElement | null>;
  setIsInputFocused: (focused: boolean) => void;
  closeActiveDialog: () => void;
  handleExecuteMove: (targetParentId: string | null) => void;
  getAvailableFolders: () => { id: string; name: string; fullPath: string }[];
}

export const MoveNodeModal: React.FC<MoveNodeModalProps> = ({
  movingNode,
  folderSearchQuery,
  setFolderSearchQuery,
  folderSearchInputRef,
  setIsInputFocused,
  closeActiveDialog,
  handleExecuteMove,
  getAvailableFolders,
}) => {
  if (!movingNode) return null;

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={closeActiveDialog}
    >
      <div
        className="w-full max-w-sm bg-bg-surface border border-border-default rounded-xl shadow-2xl p-4 flex flex-col gap-3 max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
          <h3 className="text-sm font-semibold text-text-heading flex items-center gap-2">
            <FolderInput size={16} className="text-accent-primary" />
            <span>Pindah &quot;{movingNode.name}&quot;</span>
          </h3>
          <button
            type="button"
            onClick={closeActiveDialog}
            className="p-1 rounded-md text-text-muted hover:text-text-primary cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Search Input */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            ref={folderSearchInputRef}
            type="text"
            value={folderSearchQuery}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onChange={(e) => setFolderSearchQuery(e.target.value)}
            placeholder="Cari folder tujuan..."
            className="w-full pl-8 pr-7 py-1.5 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
          {folderSearchQuery && (
            <button
              type="button"
              onClick={() => setFolderSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-60">
          {/* Root Destination Option */}
          {(!folderSearchQuery.trim() || 
            'root / halaman utama vault'.includes(folderSearchQuery.toLowerCase().trim())) && (
            <button
              type="button"
              disabled={movingNode.parentId === null}
              onClick={() => handleExecuteMove(null)}
              className={twMerge(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer',
                movingNode.parentId === null
                  ? 'bg-bg-hover/40 text-text-muted cursor-not-allowed opacity-60'
                  : 'text-text-primary hover:bg-bg-hover hover:text-accent-primary'
              )}
            >
              <Home size={15} className="text-accent-primary shrink-0" />
              <span className="truncate">Root / Halaman Utama Vault</span>
              {movingNode.parentId === null && (
                <span className="ml-auto text-[10px] text-text-muted shrink-0">(Posisi saat ini)</span>
              )}
            </button>
          )}

          {/* List of Available Folders */}
          {getAvailableFolders().length > 0 ? (
            getAvailableFolders().map((folder) => {
              const isCurrentParent = movingNode.parentId === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  disabled={isCurrentParent}
                  onClick={() => handleExecuteMove(folder.id)}
                  className={twMerge(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer',
                    isCurrentParent
                      ? 'bg-bg-hover/40 text-text-muted cursor-not-allowed opacity-60'
                      : 'text-text-primary hover:bg-bg-hover hover:text-accent-primary'
                  )}
                >
                  <Folder size={15} className="text-accent-primary shrink-0" />
                  <span className="truncate">{folder.fullPath}</span>
                  {isCurrentParent && (
                    <span className="ml-auto text-[10px] text-text-muted shrink-0">(Posisi saat ini)</span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="py-6 text-center text-xs text-text-muted">
              Folder &quot;{folderSearchQuery}&quot; tidak ditemukan.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-border-subtle">
          <button
            type="button"
            onClick={closeActiveDialog}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
