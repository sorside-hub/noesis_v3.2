import { useState, useEffect, useCallback } from 'react';
import { VaultData, FileNode } from '../types/vault';
import { loadVault, saveActiveTabId, saveOpenTabs, saveNode, deleteNodes } from '../lib/storage';
import { getUniqueNodeName } from '../lib/vaultUtils';

export const useVault = () => {
  const [vault, setVault] = useState<VaultData | null>(null);

  // Initial load from IndexedDB
  useEffect(() => {
    loadVault().then((data) => {
      setVault(data);
    });
  }, []);

  const activeNode = vault?.activeTabId ? vault.nodes[vault.activeTabId] : null;

  // -- Tab Management --
  
  const setActiveTabId = useCallback((id: string | null) => {
    setVault((prev) => {
      if (!prev) return prev;
      saveActiveTabId(id);
      
      let newOpenTabs = prev.openTabs;
      // If current active tab is an empty tab, replace it with the new file id
      if (id && prev.activeTabId && prev.activeTabId.startsWith('empty_')) {
        const emptyIdx = newOpenTabs.indexOf(prev.activeTabId);
        if (emptyIdx !== -1) {
          if (newOpenTabs.includes(id)) {
            newOpenTabs = newOpenTabs.filter((t) => t !== prev.activeTabId);
          } else {
            newOpenTabs = [...newOpenTabs];
            newOpenTabs[emptyIdx] = id;
          }
          saveOpenTabs(newOpenTabs);
        }
      } else if (id && !newOpenTabs.includes(id)) {
        newOpenTabs = [...newOpenTabs, id];
        saveOpenTabs(newOpenTabs);
      }
      
      return {
        ...prev,
        openTabs: newOpenTabs,
        activeTabId: id,
      };
    });
  }, []);

  const openInNewTab = useCallback((id: string | null) => {
    const tabId = id || `empty_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    setVault((prev) => {
      if (!prev) return prev;
      
      // If the file is already open, just switch to it (don't open a duplicate unless it's empty)
      if (id && prev.openTabs.includes(id)) {
        saveActiveTabId(id);
        return {
          ...prev,
          activeTabId: id,
        };
      }

      const newOpenTabs = [...prev.openTabs, tabId];
      saveOpenTabs(newOpenTabs);
      saveActiveTabId(tabId);
      
      return {
        ...prev,
        openTabs: newOpenTabs,
        activeTabId: tabId,
      };
    });
  }, []);

  const closeTab = useCallback((idToClose: string) => {
    setVault((prev) => {
      if (!prev) return prev;
      
      const idx = prev.openTabs.indexOf(idToClose);
      if (idx === -1) return prev; // Not open

      const newOpenTabs = [...prev.openTabs];
      newOpenTabs.splice(idx, 1);
      saveOpenTabs(newOpenTabs);

      let nextActiveId = prev.activeTabId;
      // If we closed the currently active tab, pick a neighboring tab
      if (prev.activeTabId === idToClose) {
        if (newOpenTabs.length === 0) {
          nextActiveId = null;
        } else {
          // Try to pick the right neighbor, otherwise the left neighbor
          const nextIdx = Math.min(idx, newOpenTabs.length - 1);
          nextActiveId = newOpenTabs[nextIdx];
        }
        saveActiveTabId(nextActiveId);
      }

      return {
        ...prev,
        openTabs: newOpenTabs,
        activeTabId: nextActiveId,
      };
    });
  }, []);

  // -- File Operations --

  const createNote = useCallback((parentId: string | null = null, name: string = 'Untitled') => {
    const id = `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    setVault((prev) => {
      if (!prev) return prev;
      
      const uniqueName = getUniqueNodeName(name, parentId, 'file', prev.nodes);
      const newNote: FileNode = {
        id,
        name: uniqueName,
        type: 'file',
        parentId,
        content: '',
        metadata: {
          status: 'Idea',
          includeInAiRag: false
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      saveNode(newNote); // Async save
      
      // When creating a note, we replace the currently active Empty tab if it exists
      let newOpenTabs = [...prev.openTabs];
      if (prev.activeTabId && prev.activeTabId.startsWith('empty_')) {
        const idx = newOpenTabs.indexOf(prev.activeTabId);
        if (idx !== -1) {
          newOpenTabs[idx] = id;
        } else {
          newOpenTabs.push(id);
        }
      } else if (!newOpenTabs.includes(id)) {
        newOpenTabs.push(id);
      }
      
      saveOpenTabs(newOpenTabs);
      saveActiveTabId(id);

      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [id]: newNote,
        },
        openTabs: newOpenTabs,
        activeTabId: id,
      };
    });

    return id;
  }, []);

  const createFolder = useCallback((parentId: string | null = null, name: string = 'New Folder') => {
    const id = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    setVault((prev) => {
      if (!prev) return prev;
      const uniqueName = getUniqueNodeName(name, parentId, 'folder', prev.nodes);

      const newFolder: FileNode = {
        id,
        name: uniqueName,
        type: 'folder',
        parentId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      saveNode(newFolder); // Async save
      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [id]: newFolder,
        },
      };
    });
    return id;
  }, []);

  const updateNoteContent = useCallback((id: string, content: string) => {
    setVault((prev) => {
      if (!prev) return prev;
      const node = prev.nodes[id];
      if (!node || node.type !== 'file' || node.content === content) return prev;
      
      const updatedNode = {
        ...node,
        content,
        updatedAt: Date.now(),
      };
      
      saveNode(updatedNode); // Async save

      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [id]: updatedNode,
        },
      };
    });
  }, []);

  const updateNodeTitle = useCallback((id: string, name: string) => {
    setVault((prev) => {
      if (!prev) return prev;
      const node = prev.nodes[id];
      if (!node || node.name === name) return prev;
      
      const updatedNode = {
        ...node,
        name,
        updatedAt: Date.now(),
      };
      saveNode(updatedNode); // Async save
      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [id]: updatedNode,
        },
      };
    });
  }, []);

  const moveNode = useCallback((id: string, targetParentId: string | null) => {
    setVault((prev) => {
      if (!prev) return prev;
      const node = prev.nodes[id];
      if (!node) return prev;
      // Prevent moving a folder into itself or its own subchildren
      if (node.type === 'folder') {
        let curr = targetParentId;
        while (curr) {
          if (curr === id) {
            return prev; // Invalid circular move
          }
          curr = prev.nodes[curr]?.parentId || null;
        }
      }
      if (node.parentId === targetParentId) return prev;

      // Ensure unique name in target destination
      const uniqueName = getUniqueNodeName(node.name, targetParentId, node.type, prev.nodes, id);

      const updatedNode = {
        ...node,
        name: uniqueName,
        parentId: targetParentId,
        updatedAt: Date.now(),
      };
      saveNode(updatedNode); // Async save
      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [id]: updatedNode,
        },
      };
    });
  }, []);

  const updateNoteMetadata = useCallback((id: string, metadata: Partial<FileNode['metadata']>) => {
    setVault((prev) => {
      if (!prev) return prev;
      const node = prev.nodes[id];
      if (!node || node.type !== 'file') return prev;
      
      const updatedNode = {
        ...node,
        metadata: {
          ...(node.metadata || {}),
          ...metadata,
        },
        updatedAt: Date.now(),
      };
      saveNode(updatedNode); // Async save
      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [id]: updatedNode,
        },
      };
    });
  }, []);

  const deleteNode = useCallback((id: string) => {
    setVault((prev) => {
      if (!prev) return prev;
      const nextNodes = { ...prev.nodes };
      
      // Helper to recursively collect all child IDs if it's a folder
      const idsToDelete = [id];
      const collectChildren = (parentId: string) => {
        (Object.values(nextNodes) as FileNode[]).forEach((n) => {
          if (n.parentId === parentId) {
            idsToDelete.push(n.id);
            if (n.type === 'folder') {
              collectChildren(n.id);
            }
          }
        });
      };
      collectChildren(id);
      idsToDelete.forEach((nodeId) => {
        delete nextNodes[nodeId];
      });
      
      deleteNodes(idsToDelete); // Async bulk delete

      // Cleanup openTabs
      let newOpenTabs = prev.openTabs.filter((tabId) => !idsToDelete.includes(tabId));
      let nextActiveId = prev.activeTabId;

      if (idsToDelete.includes(prev.activeTabId || '')) {
        nextActiveId = newOpenTabs.length > 0 ? newOpenTabs[newOpenTabs.length - 1] : null;
      }

      if (newOpenTabs.length !== prev.openTabs.length) {
        saveOpenTabs(newOpenTabs);
      }
      if (nextActiveId !== prev.activeTabId) {
        saveActiveTabId(nextActiveId);
      }

      return {
        ...prev,
        nodes: nextNodes,
        openTabs: newOpenTabs,
        activeTabId: nextActiveId,
      };
    });
  }, []);

  return {
    vault,
    activeNode,
    setActiveTabId,
    openInNewTab,
    closeTab,
    createNote,
    createFolder,
    updateNoteContent,
    updateNodeTitle,
    updateNoteMetadata,
    moveNode,
    deleteNode,
  };
};
