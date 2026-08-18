import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { Range } from '@codemirror/state';

// Widgets for rendering markdown syntax replacements
class BulletWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.textContent = '• ';
    span.className = 'font-bold text-text-disabled mr-1';
    return span;
  }
}

class HrWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement('span');
    hr.className = 'block w-full my-4 border-t-2 border-border-default';
    return hr;
  }
}

class TaskWidget extends WidgetType {
  constructor(public checked: boolean) {
    super();
  }

  eq(other: TaskWidget) {
    return this.checked === other.checked;
  }

  ignoreEvent() {
    return false;
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('span');
    wrap.className = 'inline-flex items-center justify-center mr-2 align-middle';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this.checked;
    checkbox.className = 'w-4 h-4 text-accent-primary bg-bg-surface border-border-default rounded focus:ring-accent-primary focus:ring-2 cursor-pointer';
    
    checkbox.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Prevent selection changes
      const pos = view.posAtDOM(wrap);
      if (pos !== null) {
        // Toggle the markdown
        const newText = this.checked ? '[ ]' : '[x]';
        // The widget replaces exactly 3 chars: '[ ]' or '[x]'
        view.dispatch({
          changes: { from: pos, to: pos + 3, insert: newText }
        });
      }
    });
    
    wrap.appendChild(checkbox);
    return wrap;
  }
}

const hideMarkDecoration = Decoration.replace({});
const bulletDecoration = Decoration.replace({ widget: new BulletWidget() });
const hrDecoration = Decoration.replace({ widget: new HrWidget() });

function getLiveEditDecorations(view: EditorView, isSourceMode: boolean) {
  const decorations: Range<Decoration>[] = [];
  const selection = view.state.selection.main;
  
  for (let { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const type = node.name;

        // --- 1. SPAN & BLOCK LEVEL STYLES ---
        if (type === 'StrongEmphasis') {
          decorations.push(Decoration.mark({ class: 'font-bold' }).range(node.from, node.to));
        } else if (type === 'Emphasis') {
          decorations.push(Decoration.mark({ class: 'italic' }).range(node.from, node.to));
        } else if (type === 'Strikethrough') {
          decorations.push(Decoration.mark({ class: 'line-through' }).range(node.from, node.to));
        } else if (type === 'InlineCode') {
          decorations.push(Decoration.mark({ class: 'bg-bg-hover rounded px-1.5 py-0.5 font-mono text-sm text-text-code' }).range(node.from, node.to));
        } else if (type === 'FencedCode') {
          const startLine = view.state.doc.lineAt(node.from);
          const endLine = view.state.doc.lineAt(node.to);
          for (let l = startLine.number; l <= endLine.number; l++) {
            const line = view.state.doc.line(l);
            let lineClass = 'bg-bg-hover font-mono text-sm px-4';
            if (l === startLine.number) lineClass += ' rounded-t-md mt-2 pt-2';
            if (l === endLine.number) lineClass += ' rounded-b-md mb-2 pb-2';
            decorations.push(Decoration.line({ class: lineClass }).range(line.from));
          }
        } else if (type === 'Blockquote') {
          decorations.push(Decoration.mark({ class: 'border-l-4 border-border-default pl-4 italic text-text-quote block' }).range(node.from, node.to));
        } else if (type === 'Link') {
          // Only style standard markdown links [text](url) that actually have a URL child node
          const hasUrl = !!node.node.getChild('URL');
          if (hasUrl) {
            decorations.push(Decoration.mark({ class: 'text-text-link hover:underline cursor-pointer' }).range(node.from, node.to));
          }
        } else if (type.startsWith('ATXHeading')) {
          const levelMatch = type.match(/ATXHeading(\d)/);
          const level = levelMatch ? parseInt(levelMatch[1], 10) : 1;
          const headingClasses = [
            level === 1 ? 'text-[length:var(--text-h1-size)] font-[number:var(--text-h1-weight)] mt-[var(--space-6)] mb-[var(--space-4)] leading-[1.3]' :
            level === 2 ? 'text-[length:var(--text-h2-size)] font-[number:var(--text-h2-weight)] mt-[var(--space-5)] mb-[var(--space-3)] leading-[1.3]' :
            level === 3 ? 'text-[length:var(--text-h3-size)] font-[number:var(--text-h3-weight)] mt-[var(--space-4)] mb-[var(--space-2)] leading-[1.3]' :
            level === 4 ? 'text-[length:var(--text-body-size)] font-[number:var(--text-h3-weight)] mt-[var(--space-3)] mb-[var(--space-2)] leading-[1.3]' :
            level === 5 ? 'text-[length:var(--text-small-size)] font-[number:var(--text-h3-weight)] mt-[var(--space-2)] mb-[var(--space-1)] leading-[1.3]' :
            'text-[length:var(--text-small-size)] mt-[var(--space-2)] mb-[var(--space-1)] leading-[1.3]'
          ].join(' ');
          decorations.push(Decoration.mark({ class: headingClasses }).range(node.from, node.to));
        }

        // --- 2. HIDING LOGIC ---
        if (isSourceMode) {
          const isMarkType = [
            'QuoteMark', 'HeaderMark', 'LinkMark', 'URL', 'CodeMark', 'CodeInfo', 'ListMark', 'TaskMarker', 'EmphasisMark', 'StrikethroughMark'
          ].includes(type);
          if (isMarkType) {
            decorations.push(Decoration.mark({ class: 'text-text-disabled' }).range(node.from, node.to));
          }
          return;
        }

        // Hide markdown syntax marks when cursor is not inside the parent token's range
        
        let checkNode = node.node.parent;
        
        // Custom bounds checking for specific types
        if (type === 'HorizontalRule') checkNode = node.node; // HR is its own block
        if (type === 'FencedCode') checkNode = node.node; // Codeblock is its own block
        
        const start = checkNode ? checkNode.from : node.from;
        const end = checkNode ? checkNode.to : node.to;
        const isCursorInside = view.hasFocus && selection.head >= start && selection.head <= end;

        // Unconditional styling (always applied regardless of cursor)
        if (type === 'HorizontalRule') {
          if (!isCursorInside) {
            decorations.push(hrDecoration.range(node.from, node.to));
          }
        }

        if (type === 'ListMark') {
          const listItem = node.node.parent;
          const listNode = listItem?.parent; // parent of ListItem is BulletList or OrderedList
          
          let hasTask = false;
          if (listItem && listItem.name === 'ListItem') {
            let child = listItem.firstChild;
            while (child) {
              if (child.name === 'Task') {
                hasTask = true;
                break;
              }
              child = child.nextSibling;
            }
          }

          if (hasTask) {
             decorations.push(hideMarkDecoration.range(node.from, node.to));
          } else if (listNode && listNode.name === 'BulletList') {
             decorations.push(bulletDecoration.range(node.from, node.to));
          } else if (listNode && listNode.name === 'OrderedList') {
             decorations.push(Decoration.mark({ class: 'font-bold text-text-muted mr-1' }).range(node.from, node.to));
          }
          return; // Skip standard hiding logic for ListMark
        }

        if (type === 'TaskMarker') {
          const text = view.state.doc.sliceString(node.from, node.to);
          const isChecked = text === '[x]' || text === '[X]';
          
          if (!isCursorInside) {
             decorations.push(Decoration.replace({ widget: new TaskWidget(isChecked) }).range(node.from, node.to));
          } else {
             decorations.push(Decoration.mark({ class: 'text-text-muted font-mono mr-1' }).range(node.from, node.to));
          }
          return;
        }

        if (!isCursorInside) {
          const isMarkType = [
            'HeaderMark', 
            'EmphasisMark',
            'StrikethroughMark',
            'CodeMark',
            'CodeInfo',
            'QuoteMark'
          ].includes(type);

          if (isMarkType) {
             let hideTo = node.to;
             if ((type === 'HeaderMark' || type === 'QuoteMark') && hideTo < view.state.doc.length && view.state.doc.sliceString(hideTo, hideTo + 1) === ' ') {
               hideTo += 1;
             }
             decorations.push(hideMarkDecoration.range(node.from, hideTo));
          }

          // Specific logic for hiding Link components [text](url)
          if (type === 'LinkMark' || type === 'URL') {
             const parentLink = node.node.parent;
             if (parentLink && parentLink.name === 'Link' && parentLink.getChild('URL')) {
               decorations.push(hideMarkDecoration.range(node.from, node.to));
             }
          }
          
        } else {
           // When cursor IS inside, faintly style the marks
           if (['QuoteMark', 'HeaderMark', 'LinkMark', 'URL', 'CodeMark', 'CodeInfo'].includes(type)) {
              decorations.push(Decoration.mark({ class: 'text-text-disabled' }).range(node.from, node.to));
           }
        }
      }
    });
  }
  
  // Sort decorations as required by CodeMirror
  return Decoration.set(decorations, true);
}

export function createLiveEditPlugin(isSourceMode: boolean) {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = getLiveEditDecorations(view, isSourceMode);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged || 
        update.viewportChanged || 
        update.selectionSet ||
        syntaxTree(update.state) !== syntaxTree(update.startState)
      ) {
        this.decorations = getLiveEditDecorations(update.view, isSourceMode);
      }
    }
  }, {
    decorations: v => v.decorations
  });
}
