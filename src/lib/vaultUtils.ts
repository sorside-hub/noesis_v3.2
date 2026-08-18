import { FileNode } from '../types/vault';

/**
 * Generates a unique name for a file or folder inside a specific parent folder.
 * If 'Untitled' exists in the target directory, it produces 'Untitled 1', 'Untitled 2', etc.
 * Uses case-insensitive comparison to avoid confusing duplicates like 'notes' and 'Notes'.
 */
export function getUniqueNodeName(
  baseName: string,
  parentId: string | null,
  type: 'file' | 'folder',
  nodes: Record<string, FileNode>,
  excludeId?: string | null
): string {
  const defaultName = type === 'file' ? 'Untitled' : 'New Folder';
  const cleanBase = baseName.trim() || defaultName;

  // Collect all sibling nodes of the same type in the same parent folder
  const siblings = Object.values(nodes).filter(
    (node) => node.parentId === parentId && node.type === type && node.id !== excludeId
  );

  const existingNames = new Set(siblings.map((n) => n.name.trim().toLowerCase()));

  // 1. If cleanBase name is not yet taken, return it
  if (!existingNames.has(cleanBase.toLowerCase())) {
    return cleanBase;
  }

  // 2. If it already has a trailing number like "Untitled 1" or "Note 2", extract root
  const match = cleanBase.match(/^(.*?)(?:\s+(\d+))?$/);
  const rootName = (match && match[1] ? match[1].trim() : cleanBase) || defaultName;
  let counter = 1;

  // Find the next available numeric suffix
  while (existingNames.has(`${rootName} ${counter}`.toLowerCase())) {
    counter++;
  }

  return `${rootName} ${counter}`;
}

/**
 * Checks if a given name already exists for another node in the specified folder.
 */
export function isNodeNameDuplicate(
  name: string,
  parentId: string | null,
  type: 'file' | 'folder',
  nodes: Record<string, FileNode>,
  excludeId?: string | null
): boolean {
  const clean = name.trim().toLowerCase();
  if (!clean) return false;

  return Object.values(nodes).some(
    (node) =>
      node.parentId === parentId &&
      node.type === type &&
      node.id !== excludeId &&
      node.name.trim().toLowerCase() === clean
  );
}

/**
 * Computes the human-readable folder breadcrumb path for a node.
 * E.g., 'Root' or 'Projects / React'
 */
export function getNodeFolderPath(
  parentId: string | null,
  nodes: Record<string, FileNode>
): string {
  if (!parentId) return 'Root';
  const parts: string[] = [];
  let currId: string | null = parentId;
  const visited = new Set<string>();

  while (currId && !visited.has(currId)) {
    visited.add(currId);
    const node = nodes[currId];
    if (node && node.type === 'folder') {
      parts.unshift(node.name);
      currId = node.parentId;
    } else {
      break;
    }
  }
  return parts.length > 0 ? parts.join(' / ') : 'Root';
}
