import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  SlidersVertical, 
  ArrowLeftRight, 
  Link2, 
  ListTree, 
  Check, 
  ChevronDown,
  ChevronRight, 
  Folder, 
  FileText, 
  Clock, 
  Calendar, 
  FileCode, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { VaultData, FileNode, NoteMetadata } from '../../../types/vault';
import { twMerge } from 'tailwind-merge';
import { ChipInput } from './ChipInput';
import { useVirtualKeyboard } from '../../../hooks/useVirtualKeyboard';

export type RightSidebarTab = 'PROPERTIES' | 'BACKLINKS' | 'OUTGOING_LINKS' | 'OUTLINE';

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  vault: VaultData;
  activeNode: FileNode | null;
  onSelectFile: (id: string) => void;
  onUpdateMetadata: (id: string, metadata: Partial<NoteMetadata>) => void;
  onNavigateToHeading?: (lineIndex: number, text: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  isOpen,
  vault,
  activeNode,
  onSelectFile,
  onUpdateMetadata,
  onNavigateToHeading,
}) => {
  const [activeTab, setActiveTab] = useState<RightSidebarTab>('PROPERTIES');
  const [isTabMenuOpen, setIsTabMenuOpen] = useState(false);
  const { isKeyboardOpen } = useVirtualKeyboard();
  const tabMenuRef = useRef<HTMLDivElement>(null);

  // Close tab menu when clicked outside
  useEffect(() => {
    if (!isTabMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (tabMenuRef.current && !tabMenuRef.current.contains(e.target as Node)) {
        setIsTabMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isTabMenuOpen]);

  // 1. Folder Path calculation
  const folderName = useMemo(() => {
    if (!activeNode || !activeNode.parentId) return 'Root Vault';
    const parent = vault.nodes[activeNode.parentId];
    return parent ? parent.name : 'Root Vault';
  }, [activeNode, vault.nodes]);

  // 2. Document statistics calculation
  const stats = useMemo(() => {
    if (!activeNode || !activeNode.content) {
      return { words: 0, characters: 0, readingTimeMinutes: 1 };
    }
    const text = activeNode.content.trim();
    if (!text) {
      return { words: 0, characters: 0, readingTimeMinutes: 1 };
    }
    const words = text.split(/\s+/).filter(Boolean).length;
    const characters = text.length;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
    return { words, characters, readingTimeMinutes };
  }, [activeNode]);

  // 3. Formatted dates
  const formattedCreated = useMemo(() => {
    if (!activeNode) return '-';
    const d = new Date(activeNode.createdAt);
    return d.toISOString().split('T')[0];
  }, [activeNode]);

  const formattedModified = useMemo(() => {
    if (!activeNode) return '-';
    const d = new Date(activeNode.updatedAt);
    return d.toISOString().split('T')[0];
  }, [activeNode]);

  // Metadata accessors
  const metadata: NoteMetadata = activeNode?.metadata || {};
  const tags = metadata.tags || [];
  const aliases = metadata.aliases || [];
  const noteType = metadata.noteType || '';
  const status = metadata.status || 'Idea';
  const includeInAiRag = metadata.includeInAiRag ?? true;

  // Metadata Handlers
  const handleTypeChange = (val: string) => {
    if (!activeNode) return;
    onUpdateMetadata(activeNode.id, { noteType: val });
  };

  const handleStatusChange = (val: string) => {
    if (!activeNode) return;
    onUpdateMetadata(activeNode.id, { status: val });
  };

  const handleTagsChange = (newTags: string[]) => {
    if (!activeNode) return;
    onUpdateMetadata(activeNode.id, { tags: newTags });
  };

  const handleAliasesChange = (newAliases: string[]) => {
    if (!activeNode) return;
    onUpdateMetadata(activeNode.id, { aliases: newAliases });
  };

  const handleToggleRag = () => {
    if (!activeNode) return;
    onUpdateMetadata(activeNode.id, { includeInAiRag: !includeInAiRag });
  };

  // 4. Backlinks calculation (nodes in vault that link to activeNode by name or alias)
  const backlinks = useMemo(() => {
    if (!activeNode) return [];
    const allNodes = Object.values(vault.nodes) as FileNode[];
    const currentName = activeNode.name.toLowerCase();
    const currentAliases = (activeNode.metadata?.aliases || []).map((a) => a.toLowerCase());

    return allNodes.filter((node) => {
      if (node.id === activeNode.id || node.type !== 'file' || !node.content) return false;
      const contentLower = node.content.toLowerCase();
      // Match [[note name]] or [[alias]]
      if (contentLower.includes(`[[${currentName}]]`)) return true;
      for (const al of currentAliases) {
        if (contentLower.includes(`[[${al}]]`)) return true;
      }
      return false;
    });
  }, [activeNode, vault.nodes]);

  // 5. Outgoing Links calculation (wikilinks parsed from active note content)
  const outgoingLinks = useMemo(() => {
    if (!activeNode || !activeNode.content) return [];
    const wikiLinkRegex = /\[\[(.*?)\]\]/g;
    const links: { targetName: string; matchedNode: FileNode | null }[] = [];
    const seen = new Set<string>();

    let match;
    while ((match = wikiLinkRegex.exec(activeNode.content)) !== null) {
      const target = match[1].trim();
      if (!target || seen.has(target.toLowerCase())) continue;
      seen.add(target.toLowerCase());

      const allNodes = Object.values(vault.nodes) as FileNode[];
      const matched = allNodes.find(
        (n) =>
          n.type === 'file' &&
          (n.name.toLowerCase() === target.toLowerCase() ||
            (n.metadata?.aliases || []).some((al) => al.toLowerCase() === target.toLowerCase()))
      ) || null;

      links.push({
        targetName: target,
        matchedNode: matched,
      });
    }
    return links;
  }, [activeNode, vault.nodes]);

  // State tracking collapsed heading IDs (or lineIndex keys)
  const [collapsedHeadingIndices, setCollapsedHeadingIndices] = useState<Set<number>>(new Set());

  // Reset collapsed headings whenever active note changes
  useEffect(() => {
    setCollapsedHeadingIndices(new Set());
  }, [activeNode?.id]);

  const toggleHeadingCollapse = (lineIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedHeadingIndices((prev) => {
      const next = new Set(prev);
      if (next.has(lineIndex)) {
        next.delete(lineIndex);
      } else {
        next.add(lineIndex);
      }
      return next;
    });
  };

  // 6. Outline calculation (Headings parsed from markdown #, ##, ###)
  const outlineHeadings = useMemo(() => {
    if (!activeNode || !activeNode.content) return [];
    const lines = activeNode.content.split('\n');
    const headings: { level: number; text: string; lineIndex: number; hasChildren: boolean }[] = [];

    const rawHeadings: { level: number; text: string; lineIndex: number }[] = [];
    lines.forEach((line, idx) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        rawHeadings.push({
          level: match[1].length,
          text: match[2].trim(),
          lineIndex: idx,
        });
      }
    });

    rawHeadings.forEach((h, i) => {
      const nextH = rawHeadings[i + 1];
      const hasChildren = nextH ? nextH.level > h.level : false;
      headings.push({ ...h, hasChildren });
    });

    return headings;
  }, [activeNode]);

  // Tab definitions
  const tabs: { id: RightSidebarTab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'PROPERTIES', label: 'Properties', icon: SlidersVertical },
    { id: 'BACKLINKS', label: 'Backlinks', icon: ArrowLeftRight },
    { id: 'OUTGOING_LINKS', label: 'Outgoing Links', icon: Link2 },
    { id: 'OUTLINE', label: 'Outline', icon: ListTree },
  ];

  const currentTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];
  const CurrentTabIcon = currentTabObj.icon;

  if (!isOpen) return null;

  return (
    <aside className="w-full h-full flex flex-col bg-bg-surface border-l border-border-default relative overflow-hidden select-none">
      {/* ----------------------------------------------------------- */}
      {/* MAIN BODY CONTENT (NO HEADER as requested) */}
      {/* ----------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-3">
        {!activeNode ? (
          <div className="h-full flex items-center justify-center text-center text-text-muted text-sm py-24">
            No active note selected.
          </div>
        ) : (
          <>
            {/* ---------------- TAB 1: PROPERTIES (METADATA) ---------------- */}
            {activeTab === 'PROPERTIES' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* 1. Header Info (Judul + Folder) */}
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-text-heading tracking-tight truncate">
                    {activeNode.name}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Folder size={13} className="text-accent-primary shrink-0" />
                    <span className="truncate">{folderName}</span>
                  </div>
                </div>

                <div className="h-px bg-border-subtle my-1" />

                {/* 2. Note Type */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-text-muted tracking-wider uppercase">
                    Note Type
                  </label>
                  <input
                    type="text"
                    value={noteType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    placeholder="e.g. Daily, Project, Concept"
                    className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-xl text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent-primary"
                  />
                </div>

                {/* 3. Status Dropdown */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-text-muted tracking-wider uppercase">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-xl text-xs text-text-primary appearance-none focus:outline-none focus:ring-1 focus:ring-accent-primary pr-8 cursor-pointer"
                    >
                      <option value="Idea">Idea</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Draft">Draft</option>
                      <option value="Completed">Completed</option>
                      <option value="Archived">Archived</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                </div>

                {/* 4. Tags Input */}
                <ChipInput
                  label="Tags"
                  items={tags}
                  onChange={handleTagsChange}
                  placeholder="Add tag (e.g. journal)..."
                  prefix="#"
                  chipColorClass="bg-blue-500/10 text-accent-primary border-blue-500/20"
                />

                {/* 5. Aliases Input */}
                <ChipInput
                  label="Aliases"
                  items={aliases}
                  onChange={handleAliasesChange}
                  placeholder="Add alias (e.g. Daily Note)..."
                  chipColorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  helperText="Alternative names for wikilink matching."
                />

                {/* 6. Toggle Include in AI RAG */}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-semibold text-text-heading tracking-wider uppercase flex items-center gap-1.5">
                      <Sparkles size={12} className="text-accent-primary" />
                      <span>Include in AI RAG</span>
                    </div>
                    <p className="text-[10px] text-text-muted">
                      Sertakan catatan ini dalam konteks AI
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includeInAiRag}
                    onClick={handleToggleRag}
                    className={twMerge(
                      'w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer',
                      includeInAiRag ? 'bg-accent-primary justify-end' : 'bg-bg-hover border border-border-default justify-start'
                    )}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                <div className="h-px bg-border-subtle" />

                {/* 7. Created & Modified Dates */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-text-muted">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>Created</span>
                    </div>
                    <span className="font-mono text-text-primary">{formattedCreated}</span>
                  </div>
                  <div className="flex items-center justify-between text-text-muted">
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>Modified</span>
                    </div>
                    <span className="font-mono text-text-primary">{formattedModified}</span>
                  </div>
                </div>

                <div className="h-px bg-border-subtle" />

                {/* 8. Document Statistics */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-text-muted tracking-wider uppercase">
                    Document Statistics
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Words Card */}
                    <div className="p-3 bg-bg-primary border border-border-default rounded-xl flex flex-col items-center justify-center text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
                        <FileText size={13} />
                        <span>Words</span>
                      </div>
                      <div className="text-xl font-bold text-text-heading mt-1">
                        {stats.words}
                      </div>
                    </div>

                    {/* Characters Card */}
                    <div className="p-3 bg-bg-primary border border-border-default rounded-xl flex flex-col items-center justify-center text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
                        <FileCode size={13} />
                        <span>Characters</span>
                      </div>
                      <div className="text-xl font-bold text-text-heading mt-1">
                        {stats.characters}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-text-muted text-center">
                    Estimated read time: <span className="font-semibold text-text-secondary">{stats.readingTimeMinutes} min</span>
                  </p>
                </div>
              </div>
            )}

            {/* ---------------- TAB 2: BACKLINKS ---------------- */}
            {activeTab === 'BACKLINKS' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Linked References ({backlinks.length})
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Catatan lain yang mereferensikan &quot;{activeNode.name}&quot;
                  </p>
                </div>

                {backlinks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-text-muted">
                    Belum ada catatan yang menautkan ke sini.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {backlinks.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => onSelectFile(node.id)}
                        className="w-full p-2.5 bg-bg-primary hover:bg-bg-hover border border-border-default rounded-xl text-left transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <FileText size={14} className="text-accent-primary shrink-0" />
                          <span className="text-xs font-medium text-text-primary group-hover:text-accent-primary truncate">
                            {node.name}
                          </span>
                        </div>
                        <ExternalLink size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ---------------- TAB 3: OUTGOING LINKS ---------------- */}
            {activeTab === 'OUTGOING_LINKS' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Outgoing Links ({outgoingLinks.length})
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Tautan internal wiki-link yang ada di catatan ini
                  </p>
                </div>

                {outgoingLinks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-text-muted">
                    Tidak ada tautan wiki-link <span className="font-mono text-accent-primary">[[...]]</span> ditemukan di catatan ini.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {outgoingLinks.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={!item.matchedNode}
                        onClick={() => item.matchedNode && onSelectFile(item.matchedNode.id)}
                        className={twMerge(
                          'w-full p-2.5 bg-bg-primary border border-border-default rounded-xl text-left transition-colors flex items-center justify-between group',
                          item.matchedNode
                            ? 'hover:bg-bg-hover cursor-pointer'
                            : 'opacity-60 cursor-default'
                        )}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <Link2 size={14} className={item.matchedNode ? 'text-accent-primary shrink-0' : 'text-text-muted shrink-0'} />
                          <span className="text-xs font-medium text-text-primary truncate">
                            {item.targetName}
                          </span>
                        </div>
                        {item.matchedNode ? (
                          <ExternalLink size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                        ) : (
                          <span className="text-[10px] text-text-muted shrink-0 ml-2">(Uncreated)</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ---------------- TAB 4: OUTLINE ---------------- */}
            {activeTab === 'OUTLINE' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Outline ({outlineHeadings.length})
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Daftar isi dan hierarki judul terlipat
                    </p>
                  </div>
                  {outlineHeadings.some((h) => h.hasChildren) && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const allParentIndices = outlineHeadings
                            .filter((h) => h.hasChildren)
                            .map((h) => h.lineIndex);
                          setCollapsedHeadingIndices(new Set(allParentIndices));
                        }}
                        className="text-[10px] font-medium text-text-muted hover:text-accent-primary px-1.5 py-0.5 rounded hover:bg-bg-hover transition-colors cursor-pointer"
                        title="Lipat Semua Sub-heading"
                      >
                        Collapse All
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollapsedHeadingIndices(new Set())}
                        className="text-[10px] font-medium text-text-muted hover:text-accent-primary px-1.5 py-0.5 rounded hover:bg-bg-hover transition-colors cursor-pointer"
                        title="Buka Semua Sub-heading"
                      >
                        Expand All
                      </button>
                    </div>
                  )}
                </div>

                {outlineHeadings.length === 0 ? (
                  <div className="py-12 text-center text-xs text-text-muted">
                    Belum ada heading (#, ##, ###) di catatan ini.
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {(() => {
                      // Filter headings: a heading is visible only if NONE of its ancestor headings are collapsed
                      const visibleHeadings: typeof outlineHeadings = [];
                      const ancestorStack: { level: number; lineIndex: number; isCollapsed: boolean }[] = [];

                      for (const h of outlineHeadings) {
                        // Pop ancestors that are at the same or deeper level
                        while (
                          ancestorStack.length > 0 &&
                          ancestorStack[ancestorStack.length - 1].level >= h.level
                        ) {
                          ancestorStack.pop();
                        }

                        // Check if any active ancestor is collapsed
                        const isHiddenByAncestor = ancestorStack.some((anc) => anc.isCollapsed);

                        if (!isHiddenByAncestor) {
                          visibleHeadings.push(h);
                        }

                        // Push current heading to ancestor stack
                        ancestorStack.push({
                          level: h.level,
                          lineIndex: h.lineIndex,
                          isCollapsed: collapsedHeadingIndices.has(h.lineIndex),
                        });
                      }

                      return visibleHeadings.map((h) => {
                        const isCollapsed = collapsedHeadingIndices.has(h.lineIndex);

                        return (
                          <div
                            key={h.lineIndex}
                            style={{ paddingLeft: `${(h.level - 1) * 14}px` }}
                            className="flex items-center group rounded-lg hover:bg-bg-hover transition-colors"
                          >
                            {/* Collapse/Expand Toggle Chevron */}
                            {h.hasChildren ? (
                              <button
                                type="button"
                                onClick={(e) => toggleHeadingCollapse(h.lineIndex, e)}
                                className="p-1 text-text-muted hover:text-text-primary rounded cursor-pointer shrink-0 transition-transform"
                                title={isCollapsed ? 'Buka Sub-heading' : 'Lipat Sub-heading'}
                              >
                                <ChevronRight
                                  size={13}
                                  className={twMerge(
                                    'transition-transform duration-150',
                                    !isCollapsed && 'rotate-90'
                                  )}
                                />
                              </button>
                            ) : (
                              <div className="w-5 shrink-0" />
                            )}

                            {/* Heading Button */}
                            <button
                              type="button"
                              onClick={() => onNavigateToHeading?.(h.lineIndex, h.text)}
                              className="flex-1 text-left py-1.5 pr-2 text-xs text-text-secondary hover:text-text-primary flex items-center gap-2 cursor-pointer truncate"
                            >
                              <span className="text-[10px] font-mono text-accent-primary font-bold shrink-0 opacity-80">
                                H{h.level}
                              </span>
                              <span className="truncate group-hover:underline font-medium">
                                {h.text}
                              </span>
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ----------------------------------------------------------- */}
      {/* FLOATING ROUNDED PILL TAB SWITCHER (Seperti screenshot) */}
      {/* ----------------------------------------------------------- */}
      <div 
        ref={tabMenuRef}
        className={twMerge(
          "absolute bottom-4 left-1/2 -translate-x-1/2 w-[85%] z-30 flex flex-col gap-2 transition-all duration-150",
          isKeyboardOpen
            ? "opacity-0 translate-y-12 pointer-events-none"
            : "opacity-100 translate-y-0 pointer-events-auto"
        )}
      >
        {/* POPUP SELECTION LIST (SIDEBAR VIEW) */}
        {isTabMenuOpen && (
          <div className="bg-bg-surface border border-border-default rounded-2xl shadow-2xl p-2 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-3 py-1.5 text-[10px] font-bold text-text-muted tracking-wider uppercase">
              Sidebar View
            </div>
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsTabMenuOpen(false);
                  }}
                  className={twMerge(
                    'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-blue-500/10 text-accent-primary font-semibold'
                      : 'text-text-primary hover:bg-bg-hover'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <TabIcon size={15} className={isSelected ? 'text-accent-primary' : 'text-text-muted'} />
                    <span>{tab.label}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-accent-primary" />}
                </button>
              );
            })}
          </div>
        )}

        {/* PILL TRIGGER BUTTON */}
        <button
          type="button"
          onClick={() => setIsTabMenuOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-bg-surface/95 dark:bg-bg-surface/90 backdrop-blur-md border border-border-default rounded-full shadow-lg shadow-black/10 hover:border-accent-primary/50 transition-all cursor-pointer text-xs"
        >
          <div className="flex items-center gap-2.5 font-semibold text-text-heading">
            <CurrentTabIcon size={15} className="text-accent-primary" />
            <span>{currentTabObj.label}</span>
          </div>
          <div className="flex items-center gap-1 text-text-muted text-[11px]">
            <span>Switch Tab</span>
            <ChevronDown size={13} className={twMerge('transition-transform duration-200', isTabMenuOpen && 'rotate-180')} />
          </div>
        </button>
      </div>
    </aside>
  );
};
