import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { FileNode } from '../../types/vault';
import { checkNoteExists } from './wikilinkPlugin';

// Custom Marked Renderer to enrich code blocks with Header & Copy button
const renderer = {
  code({ text, lang }: { text: string; lang?: string }) {
    const language = (lang || 'text').toLowerCase().trim();
    const displayLang = language === 'text' || !language ? 'Code' : language.toUpperCase();

    // Encode text for safe data attribute storage
    const encodedCode = encodeURIComponent(text);

    return `
      <div class="code-block-wrapper my-4 rounded-xl overflow-hidden border border-border-default bg-bg-hover shadow-xs">
        <div class="code-block-header flex items-center justify-between px-3.5 py-1.5 bg-bg-surface/80 border-b border-border-subtle text-xs font-mono text-text-muted select-none">
          <span class="font-semibold text-text-secondary">${displayLang}</span>
          <button
            type="button"
            class="copy-code-btn inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-bg-hover hover:text-text-primary text-text-muted transition-colors cursor-pointer"
            data-code="${encodedCode}"
            title="Copy to clipboard"
          >
            <svg class="copy-icon w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            <svg class="check-icon w-3.5 h-3.5 text-green-500 hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span class="copy-text text-[11px] font-sans">Copy</span>
          </button>
        </div>
        <pre class="code-block-content p-3.5 m-0 text-sm font-mono text-text-primary leading-relaxed"><code>${DOMPurify.sanitize(text)}</code></pre>
      </div>
    `;
  }
};

marked.use({ renderer, gfm: true, breaks: true });

export const renderMarkdown = async (markdown: string, nodes?: Record<string, FileNode>): Promise<string> => {
  try {
    const rawHtml = await marked.parse(markdown);
    
    // Post-process checkbox lists
    let processedHtml = rawHtml.replace(
      /<li><input disabled="" type="checkbox">/g,
      '<li class="task-list-item" style="list-style: none; margin-left: -1.5rem;"><input type="checkbox" class="task-list-item-checkbox w-4 h-4 text-accent-primary bg-bg-surface border-border-default rounded focus:ring-accent-primary cursor-pointer mr-2">'
    );
    processedHtml = processedHtml.replace(
      /<li><input checked="" disabled="" type="checkbox">/g,
      '<li class="task-list-item" style="list-style: none; margin-left: -1.5rem;"><input type="checkbox" checked class="task-list-item-checkbox w-4 h-4 text-accent-primary bg-bg-surface border-border-default rounded focus:ring-accent-primary cursor-pointer mr-2">'
    );

    // Post-process Wikilinks [[target]]
    processedHtml = processedHtml.replace(/\[\[(.*?)\]\]/g, (match, target) => {
      const targetName = target.trim();
      if (!targetName) return match;
      const exists = nodes ? checkNoteExists(targetName, nodes) : true;

      const styleClass = exists
        ? 'wikilink-item resolved text-accent-primary font-medium hover:underline cursor-pointer transition-colors'
        : 'wikilink-item ghost text-text-muted hover:text-text-primary font-medium underline decoration-dashed cursor-pointer transition-colors';

      const titleText = exists ? `Open note: "${targetName}"` : `Create and open new note: "${targetName}"`;

      return `<span class="${styleClass}" data-wikilink="${DOMPurify.sanitize(targetName)}" title="${titleText}">${DOMPurify.sanitize(targetName)}</span>`;
    });

    const cleanHtml = DOMPurify.sanitize(processedHtml, {
      ADD_TAGS: ['svg', 'path', 'rect', 'polyline', 'button', 'span'],
      ADD_ATTR: [
        'class',
        'style',
        'type',
        'checked',
        'data-code',
        'data-wikilink',
        'viewBox',
        'fill',
        'stroke',
        'stroke-width',
        'stroke-linecap',
        'stroke-linejoin',
        'xmlns',
        'd',
        'x',
        'y',
        'width',
        'height',
        'rx',
        'ry',
        'points',
        'title'
      ]
    });
    return cleanHtml;
  } catch (error) {
    console.error('Error rendering markdown:', error);
    return '<p>Error rendering content</p>';
  }
};
