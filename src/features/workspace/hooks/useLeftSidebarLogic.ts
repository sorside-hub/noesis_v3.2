import React, { useState, useRef, useEffect } from 'react';
import { VaultData, FileNode } from '../../../types/vault';
import { isNodeNameDuplicate } from '../../../lib/vaultUtils';
import { useNavigation } from '../../../context/NavigationContext';
import { useVirtualKeyboard } from '../../../hooks/useVirtualKeyboard';

interface UseLeftSidebarLogicProps {
  vault: VaultData;
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onOpenInNewTab: (id: string) => void;
  onCreateNote: (parentId?: string | null) => void;
  onCreateFolder: (parentId?: string | null) => void;
  onRenameNode: (id: string, newName: string) => void;
  onMoveNode: (id: string, targetParentId: string | null) => void;
  onDeleteNode: (id: string) => void;
  onCloseMobile: () => void;
}

export function useLeftSidebarLogic({
  vault,
  activeFileId,
  onSelectFile,
  onOpenInNewTab,
  onCreateNote,
  onCreateFolder,
  onRenameNode,
  onMoveNode,
  onDeleteNode,
  onCloseMobile,
}: UseLeftSidebarLogicProps) {
  const { activeModal, openModal, closeModal } = useNavigation();
  const { isKeyboardOpen } = useVirtualKeyboard();

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

  // Focus state for inputs
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);

  // Touch long press state
  const touchTimerRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; startX: number; startY: number }>({
    timer: null,
    startX: 0,
    startY: 0,
  });

  // Synchronize modal closures from back button popstate
  useEffect(() => {
    if (!activeModal) {
      setActiveMenuNode(null);
      setRenamingNode(null);
      setMovingNode(null);
      setNodeToDelete(null);
    }
  }, [activeModal]);

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

  // Handle outside click to close search bar
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

  const allFolderNodes = (Object.values(vault.nodes) as FileNode[]).filter((n) => n.type === 'folder');
  const areAllFoldersCollapsed = allFolderNodes.length > 0 && allFolderNodes.every((f) => !!collapsedFolders[f.id]);

  const handleToggleExpandCollapseAll = () => {
    if (areAllFoldersCollapsed) {
      setCollapsedFolders({});
    } else {
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

  const openActionPopup = (node: FileNode, clientX: number, clientY: number) => {
    const posX = Math.min(clientX, window.innerWidth - 220);
    const posY = Math.min(clientY, window.innerHeight - 280);
    setMenuPosition({ x: Math.max(12, posX), y: Math.max(12, posY) });
    setActiveMenuNode(node);
    openModal('context_menu');
  };

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

  const handleItemClick = (node: FileNode) => {
    if (node.type === 'folder') {
      toggleFolder(node.id);
    } else {
      onSelectFile(node.id);
      onCloseMobile();
    }
  };

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

  const getAvailableFolders = (): { id: string; name: string; fullPath: string }[] => {
    const allNodes = Object.values(vault.nodes) as FileNode[];
    const folders = allNodes.filter((n) => n.type === 'folder');

    let validFolders = folders;

    if (movingNode && movingNode.type === 'folder') {
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

  const matchesSearch = (node: FileNode): boolean => {
    if (!treeSearchQuery.trim()) return true;
    const query = treeSearchQuery.toLowerCase().trim();
    if (node.name.toLowerCase().includes(query)) return true;

    if (node.type === 'folder') {
      const children = getChildren(node.id);
      return children.some((child) => matchesSearch(child));
    }
    return false;
  };

  const isPillHidden = isKeyboardOpen || !!renamingNode || !!movingNode;

  return {
    collapsedFolders,
    isTreeSearchOpen,
    setIsTreeSearchOpen,
    treeSearchQuery,
    setTreeSearchQuery,
    treeSearchInputRef,
    searchContainerRef,
    activeMenuNode,
    menuPosition,
    renamingNode,
    renameValue,
    setRenameValue,
    renameInputRef,
    movingNode,
    folderSearchQuery,
    setFolderSearchQuery,
    folderSearchInputRef,
    nodeToDelete,
    isInputFocused,
    setIsInputFocused,
    areAllFoldersCollapsed,
    handleToggleExpandCollapseAll,
    getChildren,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleContextMenu,
    closeActiveDialog,
    handleItemClick,
    handleStartRename,
    isRenameDuplicate,
    handleSaveRename,
    handleStartMove,
    handleExecuteMove,
    handleDelete,
    confirmDelete,
    handleCreateNoteInFolder,
    handleCreateSubfolderInFolder,
    getAvailableFolders,
    matchesSearch,
    isPillHidden,
  };
}
