import { VaultData, FileNode } from '../types/vault';
import { db } from './db';

const STORAGE_KEY_VAULT = 'noesis_vault_v1';
const LEGACY_KEY_TITLE = 'obsidian_clone_title';
const LEGACY_KEY_CONTENT = 'obsidian_clone_content';
const DEFAULT_WELCOME_NOTE_ID = 'welcome_note';

const createDefaultNodes = (): Record<string, FileNode> => {
  // Check if there is legacy content in localStorage
  const legacyTitle = localStorage.getItem(LEGACY_KEY_TITLE);
  const legacyContent = localStorage.getItem(LEGACY_KEY_CONTENT);

  const initialNote: FileNode = {
    id: DEFAULT_WELCOME_NOTE_ID,
    name: legacyTitle?.trim() || 'Quick Notes',
    type: 'file',
    parentId: null,
    content: legacyContent || '# Welcome to Noesis\n\nStart typing your thoughts here...',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const initialFolder: FileNode = {
    id: 'folder_notes',
    name: 'Notes',
    type: 'folder',
    parentId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return {
    [initialFolder.id]: initialFolder,
    [initialNote.id]: initialNote,
  };
};

export const loadVault = async (): Promise<VaultData> => {
  try {
    const nodesCount = await db.nodes.count();
    
    // 1. If DB is empty, try to migrate from LocalStorage
    if (nodesCount === 0) {
      const raw = localStorage.getItem(STORAGE_KEY_VAULT);
      let nodesToSave: Record<string, FileNode> = {};
      let activeIdToSave: string | null = null;
      
      if (raw) {
        // Migrate from LocalStorage
        const parsed = JSON.parse(raw) as any;
        if (parsed && typeof parsed.nodes === 'object') {
          nodesToSave = parsed.nodes;
          activeIdToSave = parsed.activeFileId;
        }
      } else {
        // Initial setup
        nodesToSave = createDefaultNodes();
      }

      // Bulk add to IndexedDB
      await db.nodes.bulkPut(Object.values(nodesToSave));
      
      let initialOpenTabs: string[] = [];
      if (activeIdToSave) {
        await db.settings.put({ key: 'activeTabId', value: activeIdToSave });
        initialOpenTabs = [activeIdToSave];
        await db.settings.put({ key: 'openTabs', value: JSON.stringify(initialOpenTabs) });
      }

      // Cleanup localStorage
      localStorage.removeItem(STORAGE_KEY_VAULT);
      localStorage.removeItem(LEGACY_KEY_TITLE);
      localStorage.removeItem(LEGACY_KEY_CONTENT);

      return {
        nodes: nodesToSave,
        openTabs: initialOpenTabs,
        activeTabId: activeIdToSave,
      };
    }

    // 2. Load normally from IndexedDB
    const allNodesArray = await db.nodes.toArray();
    const nodesRecord: Record<string, FileNode> = {};
    for (const node of allNodesArray) {
      nodesRecord[node.id] = node;
    }

    const activeTabIdSetting = await db.settings.get('activeTabId');
    const legacyActiveIdSetting = await db.settings.get('activeFileId'); // migration
    const openTabsSetting = await db.settings.get('openTabs');

    let activeTabId = activeTabIdSetting?.value || null;
    let openTabs: string[] = [];
    
    // Migration logic
    if (openTabsSetting?.value) {
      try {
        openTabs = JSON.parse(openTabsSetting.value);
      } catch (e) {
        openTabs = [];
      }
    } else if (legacyActiveIdSetting?.value) {
      activeTabId = legacyActiveIdSetting.value;
      openTabs = [legacyActiveIdSetting.value];
    }

    return {
      nodes: nodesRecord,
      openTabs,
      activeTabId,
    };
  } catch (err) {
    console.error('Failed to load vault from IndexedDB:', err);
    return { nodes: createDefaultNodes(), openTabs: [], activeTabId: null };
  }
};

export const saveActiveTabId = async (id: string | null): Promise<void> => {
  try {
    await db.settings.put({ key: 'activeTabId', value: id });
  } catch (err) {
    console.error('Failed to save activeTabId to IndexedDB:', err);
  }
};

export const saveOpenTabs = async (tabs: string[]): Promise<void> => {
  try {
    await db.settings.put({ key: 'openTabs', value: JSON.stringify(tabs) });
  } catch (err) {
    console.error('Failed to save openTabs to IndexedDB:', err);
  }
};

export const saveNode = async (node: FileNode): Promise<void> => {
  try {
    await db.nodes.put(node);
  } catch (err) {
    console.error('Failed to save node to IndexedDB:', err);
  }
};

export const deleteNodes = async (ids: string[]): Promise<void> => {
  try {
    await db.nodes.bulkDelete(ids);
  } catch (err) {
    console.error('Failed to delete nodes from IndexedDB:', err);
  }
};
