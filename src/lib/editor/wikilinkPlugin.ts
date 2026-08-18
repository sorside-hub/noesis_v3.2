import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate, WidgetType } from '@codemirror/view';
import { Range } from '@codemirror/state';
import { FileNode } from '../../types/vault';

export const WIKILINK_REGEX = /\[\[(.*?)\]\]/g;

export function checkNoteExists(targetName: string, nodes: Record<string, FileNode>): boolean {
  const cleanTarget = targetName.trim().toLowerCase();
  if (!cleanTarget) return false;
  const allNodes = Object.values(nodes) as FileNode[];
  return allNodes.some(
    (n) =>
      n.type === 'file' &&
      (n.name.toLowerCase() === cleanTarget ||
        (n.metadata?.aliases || []).some((al) => al.toLowerCase() === cleanTarget))
  );
}

class WikilinkTextWidget extends WidgetType {
  constructor(
    public targetName: string,
    public exists: boolean,
    public onWikilinkClick?: (targetName: string) => void
  ) {
    super();
  }

  eq(other: WikilinkTextWidget) {
    return this.targetName === other.targetName && this.exists === other.exists;
  }

  ignoreEvent() {
    return false;
  }

  toDOM() {
    const span = document.createElement('span');
    const textClass = this.exists
      ? 'text-accent-primary font-medium hover:underline cursor-pointer inline-block'
      : 'text-text-muted hover:text-text-primary font-medium underline decoration-dashed cursor-pointer inline-block';

    span.className = textClass;
    span.setAttribute('data-wikilink', this.targetName);
    span.title = this.exists
      ? `Open note: "${this.targetName}"`
      : `Create and open new note: "${this.targetName}"`;

    span.textContent = this.targetName;

    span.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.onWikilinkClick) {
        this.onWikilinkClick(this.targetName);
      }
    });

    return span;
  }
}

export function getWikilinkDecorations(
  view: EditorView,
  nodes: Record<string, FileNode>,
  isSourceMode: boolean,
  onWikilinkClick?: (targetName: string) => void
): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const docText = view.state.doc.toString();
  const selection = view.state.selection.main;

  let match: RegExpExecArray | null;
  const regex = new RegExp(WIKILINK_REGEX);

  while ((match = regex.exec(docText)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const targetName = match[1].trim();

    if (!targetName) continue;

    const isCursorInside = view.hasFocus && selection.head >= start && selection.head <= end;
    const exists = checkNoteExists(targetName, nodes);

    const openBracketEnd = start + 2;
    const closeBracketStart = end - 2;

    if (isSourceMode) {
      // SOURCE MODE:
      // 1. [[ in clear text-text-muted color (same as code syntax #, -, etc.)
      decorations.push(
        Decoration.mark({ class: 'text-text-muted font-mono font-semibold' }).range(start, openBracketEnd)
      );
      // 2. targetName in blue (or muted dashed if note doesn't exist)
      const textClass = exists
        ? 'text-accent-primary font-medium hover:underline cursor-pointer'
        : 'text-text-muted font-medium underline decoration-dashed cursor-pointer';
      decorations.push(
        Decoration.mark({
          class: textClass,
          attributes: {
            'data-wikilink': targetName,
            title: exists ? `Open note: "${targetName}"` : `Create and open new note: "${targetName}"`,
          },
        }).range(openBracketEnd, closeBracketStart)
      );
      // 3. ]] in clear text-text-muted color
      decorations.push(
        Decoration.mark({ class: 'text-text-muted font-mono font-semibold' }).range(closeBracketStart, end)
      );
    } else {
      // LIVE EDIT MODE:
      if (!isCursorInside) {
        // Cursor is AWAY: Replace entire [[targetName]] with text-only Widget (no brackets, no box)
        decorations.push(
          Decoration.replace({
            widget: new WikilinkTextWidget(targetName, exists, onWikilinkClick),
          }).range(start, end)
        );
      } else {
        // Cursor is INSIDE: Show [[ and ]] in clear text-text-muted color, and targetName in blue
        decorations.push(
          Decoration.mark({ class: 'text-text-muted font-mono font-semibold' }).range(start, openBracketEnd)
        );
        const textClass = exists
          ? 'text-accent-primary font-medium underline decoration-dashed'
          : 'text-text-muted font-medium underline decoration-dashed';
        decorations.push(
          Decoration.mark({
            class: textClass,
          }).range(openBracketEnd, closeBracketStart)
        );
        decorations.push(
          Decoration.mark({ class: 'text-text-muted font-mono font-semibold' }).range(closeBracketStart, end)
        );
      }
    }
  }

  return Decoration.set(decorations, true);
}

export function createWikilinkDecorationsPlugin(
  getNodes: () => Record<string, FileNode>,
  isSourceMode: boolean,
  onWikilinkClick?: (targetName: string) => void
) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = getWikilinkDecorations(view, getNodes(), isSourceMode, onWikilinkClick);
      }

      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.selectionSet
        ) {
          this.decorations = getWikilinkDecorations(update.view, getNodes(), isSourceMode, onWikilinkClick);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
      eventHandlers: {
        click: (e, view) => {
          const target = e.target as HTMLElement;
          const wikilinkEl = target.closest('[data-wikilink]') as HTMLElement | null;
          if (wikilinkEl) {
            const name = wikilinkEl.getAttribute('data-wikilink');
            if (name && onWikilinkClick) {
              e.preventDefault();
              e.stopPropagation();
              onWikilinkClick(name);
            }
          }
        },
      },
    }
  );
}
