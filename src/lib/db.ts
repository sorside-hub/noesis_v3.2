import Dexie, { Table } from 'dexie';
import { FileNode } from '../types/vault';

export interface AppSetting {
  key: string;
  value: any;
}

export class NoesisDB extends Dexie {
  nodes!: Table<FileNode, string>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('NoesisDatabase');
    this.version(1).stores({
      nodes: 'id, parentId, type, updatedAt, createdAt',
      settings: 'key'
    });
  }
}

export const db = new NoesisDB();
