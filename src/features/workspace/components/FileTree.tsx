import React from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { FileNode } from '../../../types/vault';

interface FileTreeProps {
  parentId?: string | null;
  depth?: number;
  getChildren: (parentId: string | null) => FileNode[];
  matchesSearch: (node: FileNode) => boolean;
  treeSearchQuery: string;
  collapsedFolders: Record<string, boolean>;
  activeFileId: string | null;
  handleItemClick: (node: FileNode) => void;
  handleContextMenu: (node: FileNode, e: React.MouseEvent) => void;
  handleTouchStart: (node: FileNode, e: React.TouchEvent) => void;
  handleTouchMove: () => void;
  handleTouchEnd: () => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  parentId = null,
  depth = 0,
  getChildren,
  matchesSearch,
  treeSearchQuery,
  collapsedFolders,
  activeFileId,
  handleItemClick,
  handleContextMenu,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
}) => {
  const rawChildren = getChildren(parentId);
  const children = treeSearchQuery.trim() ? rawChildren.filter(matchesSearch) : rawChildren;

  if (children.length === 0 && depth === 0) {
    return (
      <div className="px-4 py-8 text-center text-text-muted text-xs">
        {treeSearchQuery.trim() ? (
          <span>Tidak ada hasil untuk &quot;{treeSearchQuery}&quot;</span>
        ) : (
          <span>Belum ada berkas. Gunakan tombol mengambang di bawah untuk membuat berkas baru.</span>
        )}
      </div>
    );
  }

  return (
    <ul className={twMerge('space-y-0.5', depth > 0 && 'ml-2.5 pl-2.5 border-l border-border-default/70')}>
      {children.map((node) => {
        const isFolder = node.type === 'folder';
        // Auto-expand folders when searching so matching items are visible
        const isCollapsed = isFolder && !treeSearchQuery.trim() && !!collapsedFolders[node.id];
        const isSelected = !isFolder && activeFileId === node.id;

        return (
          <li key={node.id} className="select-none">
            <div
              onClick={() => handleItemClick(node)}
              onContextMenu={(e) => handleContextMenu(node, e)}
              onTouchStart={(e) => handleTouchStart(node, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className={twMerge(
                'group flex items-center justify-between py-1.5 px-2 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 select-none touch-manipulation',
                isSelected
                  ? 'bg-bg-hover text-accent-primary font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover/60'
              )}
            >
              <div className="flex items-center gap-1.5 truncate min-w-0 pointer-events-none">
                {/* Chevron / Toggle arrow for folders */}
                {isFolder ? (
                  <span className="p-0.5 -ml-0.5 text-text-muted shrink-0 transition-transform">
                    {isCollapsed ? (
                      <ChevronRight size={13} className="text-text-muted" />
                    ) : (
                      <ChevronDown size={13} className="text-text-muted" />
                    )}
                  </span>
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}

                {/* Icon */}
                {isFolder ? (
                  isCollapsed ? (
                    <Folder size={14} className="text-text-muted shrink-0" />
                  ) : (
                    <FolderOpen size={14} className="text-accent-primary shrink-0" />
                  )
                ) : (
                  <FileText size={14} className="text-text-muted shrink-0" />
                )}

                {/* File/Folder Name */}
                <span className="truncate text-xs text-text-primary/90 group-hover:text-text-primary">
                  {node.name}
                </span>
              </div>
            </div>

            {/* Recursive Children with Indent Guide Line */}
            {isFolder && !isCollapsed && (
              <FileTree
                parentId={node.id}
                depth={depth + 1}
                getChildren={getChildren}
                matchesSearch={matchesSearch}
                treeSearchQuery={treeSearchQuery}
                collapsedFolders={collapsedFolders}
                activeFileId={activeFileId}
                handleItemClick={handleItemClick}
                handleContextMenu={handleContextMenu}
                handleTouchStart={handleTouchStart}
                handleTouchMove={handleTouchMove}
                handleTouchEnd={handleTouchEnd}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
};
