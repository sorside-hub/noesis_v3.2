import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  FolderPlus, 
  Trash2, 
  X,
  Compass,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Edit2,
  FolderInput,
  Home,
  Search,
  ChevronsUpDown,
  ChevronsDownUp,
  ExternalLink
} from 'lucide-react';
import { VaultData, FileNode } from '../../../types/vault';
import { twMerge } from 'tailwind-merge';
import { useVirtualKeyboard } from '../../../hooks/useVirtualKeyboard';
import { isNodeNameDuplicate } from '../../../lib/vaultUtils';
import { useNavigation } from '../../../context/NavigationContext';

interface LeftSidebarProps {
  vault: VaultData;
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onOpenInNewTab: (id: string) => void;
  onCreateNote: (parentId?: string | null) => void;
  onCreateFolder: (parentId?: string | null) => void;
  onRenameNode: (id: string, newName: string) => void;
  onMoveNode: (id: string, targetParentId: string | null) => void;
  onDeleteNode: (id: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  vault,
  activeFileId,
  onSelectFile,
  onOpenInNewTab,
  onCreateNote,
  onCreateFolder,
  onRenameNode,
  onMoveNode,
  onDeleteNode,
  isOpen,
  onCloseMobile,
}) => {
  const { activeModal, openModal, closeModal } = useNavigation();
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Tree filter / search state
  const [isTreeSearchOpen, setIsTreeSearchOpen] = useState<boolean>(false);
  const [treeSearchQuery, setTreeSearchQuery] = useState<string>('');
  const treeSearchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Context Menu / Action Popup State
  const [activeMenuNode, setActiveMenuNode] = useState<FileNode | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // Rename Dialog Modal State
  const [renamingNode, setRenamingNode] = useState<FileNode | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Move Modal State & Search Query
  const [movingNode, setMovingNode] = useState<FileNode | null>(null);
  const [folderSearchQuery, setFolderSearchQuery] = useState<string>('');
  const folderSearchInputRef = useRef<HTMLInputElement>(null);

  // Delete Dialog Modal State
  const [nodeToDelete, setNodeToDelete] = useState<FileNode | null>(null);

  // Synchronize modal closures from back button popstate
  useEffect(() => {
    if (!activeModal) {
      setActiveMenuNode(null);
      setRenamingNode(null);
      setMovingNode(null);
      setNodeToDelete(null);
    }
  }, [activeModal]);

  // Track if any input is actively focused (to hide the floating action pill so it stays buried behind the keyboard)
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);

  // Touch long press state
  const touchTimerRef = useRef<{ timer: any; startX: number; startY: number }>({
    timer: null,
    startX: 0,
    startY: 0,
  });

  const handleTouchStart = (node: FileNode, e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    if (touchTimerRef.current.timer) {
      clearTimeout(touchTimerRef.current.timer);
    }

    touchTimerRef.current = {
      startX: clientX,
      startY: clientY,
      timer: setTimeout(() => {
        openActionPopup(node, clientX, clientY);
      }, 500),
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch || !touchTimerRef.current.timer) return;
    const diffX = Math.abs(touch.clientX - touchTimerRef.current.startX);
    const diffY = Math.abs(touch.clientY - touchTimerRef.current.startY);
    if (diffX > 10 || diffY > 10) {
      clearTimeout(touchTimerRef.current.timer);
      touchTimerRef.current.timer = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current.timer) {
      clearTimeout(touchTimerRef.current.timer);
      touchTimerRef.current.timer = null;
    }
  };

  // Focus rename input when modal opens
  useEffect(() => {
    if (renamingNode && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingNode]);

  // Focus search input and reset query when move modal opens
  useEffect(() => {
    if (movingNode) {
      setFolderSearchQuery('');
      setTimeout(() => {
        folderSearchInputRef.current?.focus();
      }, 50);
    }
  }, [movingNode]);

  // Focus tree search input when opened
  useEffect(() => {
    if (isTreeSearchOpen) {
      setTimeout(() => {
        treeSearchInputRef.current?.focus();
      }, 50);
    } else {
      setTreeSearchQuery('');
      setIsInputFocused(false);
    }
  }, [isTreeSearchOpen]);

  // Handle outside click: if search is open, input is empty, and user clicks anywhere outside, close search bar & reset focus
  useEffect(() => {
    if (!isTreeSearchOpen) return;

    const handleDocumentClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        if (!treeSearchQuery.trim()) {
          setIsTreeSearchOpen(false);
          setIsInputFocused(false);
        }
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('touchstart', handleDocumentClick);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('touchstart', handleDocumentClick);
    };
  }, [isTreeSearchOpen, treeSearchQuery]);

  const toggleFolder = (folderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // Expand / Lipat All Folders
  const allFolderNodes = (Object.values(vault.nodes) as FileNode[]).filter((n) => n.type === 'folder');
  const areAllFoldersCollapsed = allFolderNodes.length > 0 && allFolderNodes.every((f) => !!collapsedFolders[f.id]);

  const handleToggleExpandCollapseAll = () => {
    if (areAllFoldersCollapsed) {
      // Expand all (uncollapse)
      setCollapsedFolders({});
    } else {
      // Collapse all
      const newCollapsed: Record<string, boolean> = {};
      allFolderNodes.forEach((f) => {
        newCollapsed[f.id] = true;
      });
      setCollapsedFolders(newCollapsed);
    }
  };

  const getChildren = (parentId: string | null): FileNode[] => {
    const allNodes = Object.values(vault.nodes) as FileNode[];
    return allNodes
      .filter((node) => node.parentId === parentId)
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  };

  // -------------------------------------------------------------
  // Context Menu / Hold Trigger via Native contextmenu event
  // -------------------------------------------------------------
  const openActionPopup = (node: FileNode, clientX: number, clientY: number) => {
    const posX = Math.min(clientX, window.innerWidth - 220);
    const posY = Math.min(clientY, window.innerHeight - 280);
    setMenuPosition({ x: Math.max(12, posX), y: Math.max(12, posY) });
    setActiveMenuNode(node);
    openModal('context_menu');
  };

  const handleContextMenu = (node: FileNode, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openActionPopup(node, e.clientX, e.clientY);
  };

  const closeActiveDialog = () => {
    setActiveMenuNode(null);
    setRenamingNode(null);
    setMovingNode(null);
    setNodeToDelete(null);
    setIsInputFocused(false);
    closeModal();
  };

  // Node Item Click (Single tap / click)
  const handleItemClick = (node: FileNode) => {
    if (node.type === 'folder') {
      toggleFolder(node.id);
    } else {
      onSelectFile(node.id);
      onCloseMobile();
    }
  };

  // Actions execution
  const handleStartRename = (node: FileNode) => {
    setActiveMenuNode(null);
    setRenamingNode(node);
    setRenameValue(node.name);
    openModal('rename');
  };

  const isRenameDuplicate = renamingNode
    ? isNodeNameDuplicate(renameValue, renamingNode.parentId, renamingNode.type, vault.nodes, renamingNode.id)
    : false;

  const handleSaveRename = () => {
    if (renamingNode && renameValue.trim() && !isRenameDuplicate) {
      onRenameNode(renamingNode.id, renameValue.trim());
      closeActiveDialog();
    }
  };

  const handleStartMove = (node: FileNode) => {
    setActiveMenuNode(null);
    setMovingNode(node);
    openModal('move');
  };

  const handleExecuteMove = (targetParentId: string | null) => {
    if (movingNode) {
      onMoveNode(movingNode.id, targetParentId);
    }
    closeActiveDialog();
  };

  const handleDelete = (node: FileNode) => {
    setActiveMenuNode(null);
    setNodeToDelete(node);
    openModal('delete');
  };

  const confirmDelete = () => {
    if (nodeToDelete) {
      onDeleteNode(nodeToDelete.id);
    }
    closeActiveDialog();
  };

  const handleCreateNoteInFolder = (node: FileNode) => {
    closeActiveDialog();
    onCreateNote(node.id);
    onCloseMobile();
  };

  const handleCreateSubfolderInFolder = (node: FileNode) => {
    closeActiveDialog();
    onCreateFolder(node.id);
  };

  // Compute full hierarchical breadcrumb path for any node e.g. "03. Modal / Bank Kata"
  const getFolderPath = (folderId: string): string => {
    const parts: string[] = [];
    let currId: string | null = folderId;
    const visited = new Set<string>();

    while (currId && !visited.has(currId)) {
      visited.add(currId);
      const node = vault.nodes[currId];
      if (node && node.type === 'folder') {
        parts.unshift(node.name);
        currId = node.parentId;
      } else {
        break;
      }
    }
    return parts.join(' / ');
  };

  // Helper to get available folder destinations with complete hierarchical paths & search filter
  const getAvailableFolders = (): { id: string; name: string; fullPath: string }[] => {
    const allNodes = Object.values(vault.nodes) as FileNode[];
    const folders = allNodes.filter((n) => n.type === 'folder');

    let validFolders = folders;

    if (movingNode && movingNode.type === 'folder') {
      // Exclude moving folder and its descendants
      const invalidIds = new Set<string>([movingNode.id]);
      const findDescendants = (parentId: string) => {
        folders.forEach((f) => {
          if (f.parentId === parentId) {
            invalidIds.add(f.id);
            findDescendants(f.id);
          }
        });
      };
      findDescendants(movingNode.id);
      validFolders = folders.filter((f) => !invalidIds.has(f.id));
    }

    // Map each folder to its path and sort alphabetically by fullPath
    const list = validFolders
      .map((f) => ({
        id: f.id,
        name: f.name,
        fullPath: getFolderPath(f.id),
      }))
      .sort((a, b) => a.fullPath.localeCompare(b.fullPath));

    if (!folderSearchQuery.trim()) {
      return list;
    }

    const query = folderSearchQuery.toLowerCase().trim();
    return list.filter((item) => item.fullPath.toLowerCase().includes(query));
  };

  // Search filter for the main tree view
  const matchesSearch = (node: FileNode): boolean => {
    if (!treeSearchQuery.trim()) return true;
    const query = treeSearchQuery.toLowerCase().trim();
    if (node.name.toLowerCase().includes(query)) return true;
    
    // If folder has children that match, keep parent folder visible
    if (node.type === 'folder') {
      const children = getChildren(node.id);
      return children.some((child) => matchesSearch(child));
    }
    return false;
  };

  const renderTree = (parentId: string | null, depth = 0) => {
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
              {isFolder && !isCollapsed && renderTree(node.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  const { isKeyboardOpen } = useVirtualKeyboard();

  // Check if keyboard is physically open via visualViewport or if rename/move dialogs are active
  const isPillHidden = isKeyboardOpen || !!renamingNode || !!movingNode;

  return (
    <div className="h-full w-full flex flex-col bg-bg-surface border-r border-border-default overflow-hidden select-none relative">
      {/* Optional In-Tree Search Bar (Toggled via floating search button) */}
      {isTreeSearchOpen && (
        <div ref={searchContainerRef} className="px-2.5 pt-2 pb-1.5 border-b border-border-subtle bg-bg-surface/90 shadow-xs z-10">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              ref={treeSearchInputRef}
              type="text"
              value={treeSearchQuery}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onChange={(e) => setTreeSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsTreeSearchOpen(false);
                  setTreeSearchQuery('');
                  setIsInputFocused(false);
                }
              }}
              placeholder="Filter berkas / folder..."
              className="w-full pl-7 pr-6 py-1.5 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
            <button
              type="button"
              title="Tutup Pencarian"
              onClick={() => {
                setIsTreeSearchOpen(false);
                setTreeSearchQuery('');
                setIsInputFocused(false);
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Tree List (with generous bottom padding for floating bar) */}
      <div className="flex-1 overflow-y-auto p-2 pb-16 space-y-0.5">
        {renderTree(null, 0)}
      </div>

      {/* ----------------------------------------------------------- */}
      {/* FLOATING ACTION PILL (Mengambang Rounded Bar) */}
      {/* Otomatis tersembunyi / tenggelam di balik keyboard saat input fokus, search, atau rename */}
      {/* ----------------------------------------------------------- */}
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

      {/* ----------------------------------------------------------- */}
      {/* HOLD / LONG-PRESS POPUP MENU MODAL */}
      {/* ----------------------------------------------------------- */}
      {activeMenuNode && menuPosition && (
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
                  setActiveMenuNode(null);
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
      )}

      {/* ----------------------------------------------------------- */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ----------------------------------------------------------- */}
      {nodeToDelete && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={closeActiveDialog}
        >
          <div
            className="w-full max-w-sm bg-bg-surface border border-border-default rounded-xl shadow-2xl p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-text-heading">
              Hapus {nodeToDelete.type === 'folder' ? 'Folder' : 'Catatan'}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Apakah Anda yakin ingin menghapus <span className="font-semibold text-text-primary">&quot;{nodeToDelete.name}&quot;</span>?
              {nodeToDelete.type === 'folder' && ' Semua isi di dalam folder ini juga akan terhapus.'}
              <br />
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3 mt-2">
              <button
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-modifier-hover rounded-lg transition-colors cursor-pointer"
                onClick={closeActiveDialog}
              >
                Batal
              </button>
              <button
                className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                onClick={confirmDelete}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* MOVE TO FOLDER MODAL WITH SEARCH */}
      {/* ----------------------------------------------------------- */}
      {movingNode && (
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
              {/* Root Destination Option (Show if query matches 'root' / 'halaman utama' or query is empty) */}
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

              {/* List of Available Folders with Complete Paths & Filter */}
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
      )}

      {/* ----------------------------------------------------------- */}
      {/* RENAME DIALOG MODAL (Positioned nicely in upper middle for on-screen keyboard) */}
      {/* ----------------------------------------------------------- */}
      {renamingNode && (
        <div 
          className="fixed inset-0 z-70 flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-xs p-4 pt-20 sm:pt-4"
          onClick={closeActiveDialog}
        >
          <div 
            className="w-full max-w-sm bg-bg-surface border border-border-default rounded-xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-text-heading">
              Rename {renamingNode.type === 'folder' ? 'Folder' : 'Note'}
            </h3>
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isRenameDuplicate && renameValue.trim()) handleSaveRename();
                if (e.key === 'Escape') {
                  closeActiveDialog();
                }
              }}
              className={twMerge(
                "w-full px-3 py-2 bg-bg-primary border rounded-lg text-sm text-text-primary focus:outline-none transition-colors",
                isRenameDuplicate 
                  ? "border-rose-500/80 focus:ring-1 focus:ring-rose-500" 
                  : "border-border-default focus:ring-1 focus:ring-accent-primary"
              )}
              placeholder="Enter new name..."
            />
            {isRenameDuplicate && (
              <p className="text-[11px] text-rose-500 font-medium -mt-1">
                Nama ini sudah digunakan dalam folder ini.
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeActiveDialog}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isRenameDuplicate || !renameValue.trim()}
                onClick={handleSaveRename}
                className={twMerge(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  isRenameDuplicate || !renameValue.trim()
                    ? "bg-accent-primary/40 text-white/60 cursor-not-allowed"
                    : "bg-accent-primary text-white hover:opacity-90"
                )}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
