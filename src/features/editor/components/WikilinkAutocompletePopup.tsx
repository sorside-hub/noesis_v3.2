import React, { useEffect, useState, useRef } from 'react';
import { FileNode } from '../../../types/vault';
import { FileText, Plus } from 'lucide-react';
import { checkNoteExists } from '../../../lib/editor/wikilinkPlugin';
import { getNodeFolderPath } from '../../../lib/vaultUtils';

interface WikilinkAutocompletePopupProps {
  nodes: Record<string, FileNode>;
  query: string;
  onSelect: (noteName: string) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export const WikilinkAutocompletePopup: React.FC<WikilinkAutocompletePopupProps> = ({
  nodes,
  query,
  onSelect,
  onClose,
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);

  // Filter notes based on query
  const matchingNotes = (Object.values(nodes) as FileNode[])
    .filter((n: FileNode) => n.type === 'file')
    .filter((n: FileNode) => {
      const q = query.toLowerCase().trim();
      if (!q) return true;
      const nameMatch = n.name.toLowerCase().includes(q);
      const aliasMatch = (n.metadata?.aliases || []).some((al) => al.toLowerCase().includes(q));
      return nameMatch || aliasMatch;
    })
    .slice(0, 7);

  const cleanQuery = query.trim();
  const exactExists = checkNoteExists(cleanQuery, nodes);
  const showCreateOption = cleanQuery.length > 0 && !exactExists;

  const totalItemsCount = matchingNotes.length + (showCreateOption ? 1 : 0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation (ArrowUp, ArrowDown, Enter, Tab, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (totalItemsCount > 0 ? (prev + 1) % totalItemsCount : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (totalItemsCount > 0 ? (prev - 1 + totalItemsCount) % totalItemsCount : 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        if (showCreateOption && selectedIndex === matchingNotes.length) {
          onSelect(cleanQuery);
        } else if (matchingNotes[selectedIndex]) {
          onSelect(matchingNotes[selectedIndex].name);
        } else if (cleanQuery) {
          onSelect(cleanQuery);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [matchingNotes, selectedIndex, showCreateOption, totalItemsCount, cleanQuery, onSelect, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (totalItemsCount === 0) {
    return null;
  }

  return (
    <div
      ref={popupRef}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="z-50 w-72 max-h-64 overflow-y-auto bg-bg-surface border border-border-default rounded-xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      <div className="px-2 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
        Link to Note
      </div>

      <div className="space-y-0.5 mt-0.5">
        {matchingNotes.map((note, idx) => {
          const isSelected = idx === selectedIndex;
          const folderPath = getNodeFolderPath(note.parentId, nodes);

          return (
            <button
              key={note.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(note.name);
              }}
              onClick={() => onSelect(note.name)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-accent-primary/15 text-accent-primary font-medium'
                  : 'text-text-primary hover:bg-bg-hover'
              }`}
            >
              <FileText size={14} className="shrink-0 text-accent-primary" />
              <div className="flex-1 min-w-0 flex flex-col">
                <span className="truncate text-xs font-medium text-text-primary leading-tight">
                  {note.name}
                </span>
                <span className="truncate text-[10px] text-text-muted leading-tight mt-0.5">
                  {folderPath}
                </span>
              </div>
            </button>
          );
        })}

        {showCreateOption && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(cleanQuery);
            }}
            onClick={() => onSelect(cleanQuery)}
            onMouseEnter={() => setSelectedIndex(matchingNotes.length)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors cursor-pointer ${
              selectedIndex === matchingNotes.length
                ? 'bg-accent-primary/15 text-accent-primary font-medium'
                : 'text-text-secondary hover:bg-bg-hover'
            }`}
          >
            <Plus size={14} className="shrink-0 text-text-muted" />
            <span className="truncate flex-1">
              Link to <span className="font-semibold text-text-primary">"{cleanQuery}"</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
