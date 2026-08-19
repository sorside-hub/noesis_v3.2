import Dexie, { Table } from 'dexie';
import { FileNode } from '../types/vault';
import { AIAnalysisRecord, EmbeddingRecord } from '../features/rag/types/models';

export interface AppSetting {
  key: string;
  value: any;
}

export interface ChatSessionRecord {
  id: string;
  title: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ noteId: string; noteTitle: string }>;
  chunks?: Array<{ noteId: string; noteTitle: string; snippet: string }>;
  createdAt: string;
}

export class NoesisDB extends Dexie {
  nodes!: Table<FileNode, string>;
  settings!: Table<AppSetting, string>;
  ai_analysis!: Table<AIAnalysisRecord, string>;
  embeddings!: Table<EmbeddingRecord, string>;
  chat_sessions!: Table<ChatSessionRecord, string>;
  chat_messages!: Table<ChatMessageRecord, string>;

  constructor() {
    super('NoesisDatabase');
    
    this.version(1).stores({
      nodes: 'id, parentId, type, updatedAt, createdAt',
      settings: 'key'
    });

    // V2: Add RAG tables
    this.version(2).stores({
      ai_analysis: 'noteId', // Primary key is noteId (1-to-1 relationship)
      embeddings: 'id, noteId, sourceType' // id is PK, indexed by noteId and sourceType for easy deletion/filtering
    });

    // V3: Add Chat Session & Message tables
    this.version(3).stores({
      chat_sessions: 'id, updatedAt, createdAt',
      chat_messages: 'id, sessionId, createdAt'
    });
  }
}

export const db = new NoesisDB();
