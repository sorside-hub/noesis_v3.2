import React from 'react';
import { 
  Folder, 
  FileText, 
  Plus, 
  FolderPlus, 
  ExternalLink, 
  Edit2, 
  FolderInput, 
  Trash2 
} from 'lucide-react';
import { FileNode } from '../../../types/vault';

interface LeftSidebarContextMenuProps {
  activeMenuNode: FileNode | null;
  menuPosition: { x: number; y: number } | null;
  closeActiveDialog: () => void;
  handleCreateNoteInFolder: (node: FileNode) => void;
  handleCreateSubfolderInFolder: (node: FileNode) => void;
  onOpenInNewTab: (id: string) => void;
  onCloseMobile: () => void;
  handleStartRename: (node: FileNode) => void;
  handleStartMove: (node: FileNode) => void;
  handleDelete: (node: FileNode) => void;
}

export const LeftSidebarContextMenu: React.FC<LeftSidebarContextMenuProps> = ({
  activeMenuNode,
  menuPosition,
  closeActiveDialog,
  handleCreateNoteInFolder,
  handleCreateSubfolderInFolder,
  onOpenInNewTab,
  onCloseMobile,
  handleStartRename,
  handleStartMove,
  handleDelete,
}) => {
  if (!activeMenuNode || !menuPosition) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-start justify-start bg-black/30 backdrop-blur-xs"
      onClick={closeActiveDialog}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          top: `${menuPosition.y}px`,
          left: `${menuPosition.x}px`,
        }}
        className="fixed w-48 bg-bg-surface border border-border-default rounded-xl shadow-2xl py-1.5 z-70 flex flex-col text-xs animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Header info */}
        <div className="px-3 py-1 border-b border-border-subtle mb-1 flex items-center gap-1.5 text-text-muted truncate font-medium">
          {activeMenuNode.type === 'folder' ? <Folder size={13} /> : <FileText size={13} />}
          <span className="truncate">{activeMenuNode.name}</span>
        </div>

        {/* Folder Specific Actions */}
        {activeMenuNode.type === 'folder' && (
          <>
            <button
              type="button"
              onClick={() => handleCreateNoteInFolder(activeMenuNode)}
              className="flex items-center gap-2.5 px-3 py-2 text-text-primary hover:bg-bg-hover transition-colors text-left cursor-pointer"
            >
              <Plus size={14} className="text-accent-primary" />
              <span>New Note</span>
            </button>
            <button
              type="button"
              onClick={() => handleCreateSubfolderInFolder(activeMenuNode)}
              className="flex items-center gap-2.5 px-3 py-2 text-text-primary hover:bg-bg-hover transition-colors text-left cursor-pointer"
            >
              <FolderPlus size={14} className="text-accent-primary" />
              <span>New Folder</span>
            </button>
          </>
        )}

        {/* Note Specific Action (Open in New Tab) */}
        {activeMenuNode.type === 'file' && (
          <button
            type="button"
            onClick={() => {
              const targetId = activeMenuNode.id;
              closeActiveDialog();
              onOpenInNewTab(targetId);
              onCloseMobile();
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-text-primary hover:bg-bg-hover transition-colors text-left cursor-pointer font-medium"
          >
            <ExternalLink size={14} className="text-accent-primary" />
            <span>Buka di Tab Baru</span>
          </button>
        )}

        {/* Common Actions (Rename, Move, Delete) */}
        <button
          type="button"
          onClick={() => handleStartRename(activeMenuNode)}
          className="flex items-center gap-2.5 px-3 py-2 text-text-primary hover:bg-bg-hover transition-colors text-left cursor-pointer"
        >
          <Edit2 size={14} className="text-text-muted" />
          <span>Rename</span>
        </button>

        <button
          type="button"
          onClick={() => handleStartMove(activeMenuNode)}
          className="flex items-center gap-2.5 px-3 py-2 text-text-primary hover:bg-bg-hover transition-colors text-left cursor-pointer"
        >
          <FolderInput size={14} className="text-text-muted" />
          <span>Pindah ke...</span>
        </button>

        <div className="my-1 border-t border-border-subtle" />

        <button
          type="button"
          onClick={() => handleDelete(activeMenuNode)}
          className="flex items-center gap-2.5 px-3 py-2 text-red-500 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
        >
          <Trash2 size={14} />
          <span>Hapus</span>
        </button>
      </div>
    </div>
  );
};
