import React, { MouseEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface OutlineHeading {
  level: number;
  text: string;
  lineIndex: number;
  hasChildren: boolean;
}

interface OutlineTabProps {
  outlineHeadings: OutlineHeading[];
  collapsedHeadingIndices: Set<number>;
  setCollapsedHeadingIndices: React.Dispatch<React.SetStateAction<Set<number>>>;
  toggleHeadingCollapse: (lineIndex: number, e: MouseEvent) => void;
  onNavigateToHeading?: (lineIndex: number, text: string) => void;
}

export const OutlineTab: React.FC<OutlineTabProps> = ({
  outlineHeadings,
  collapsedHeadingIndices,
  setCollapsedHeadingIndices,
  toggleHeadingCollapse,
  onNavigateToHeading,
}) => {
  return (
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
            const visibleHeadings: typeof outlineHeadings = [];
            const ancestorStack: { level: number; lineIndex: number; isCollapsed: boolean }[] = [];

            for (const h of outlineHeadings) {
              while (
                ancestorStack.length > 0 &&
                ancestorStack[ancestorStack.length - 1].level >= h.level
              ) {
                ancestorStack.pop();
              }

              const isHiddenByAncestor = ancestorStack.some((anc) => anc.isCollapsed);

              if (!isHiddenByAncestor) {
                visibleHeadings.push(h);
              }

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
  );
};
