export interface NoteMetadata {
  noteType?: string;
  status?: string;
  tags?: string[];
  aliases?: string[];
  includeInAiRag?: boolean;
  [key: string]: unknown;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  content?: string;
  metadata?: NoteMetadata;
  createdAt: number;
  updatedAt: number;
}

export interface VaultData {
  nodes: Record<string, FileNode>;
  openTabs: string[];
  activeTabId: string | null;
}
