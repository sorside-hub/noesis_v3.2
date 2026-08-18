import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { renderMarkdown } from '../../../lib/editor/markdownRenderer';
import { NoteTitle } from './NoteTitle';
import { FileNode } from '../../../types/vault';

interface PreviewPaneProps {
  title: string;
  content: string;
  nodes?: Record<string, FileNode>;
  onDoubleClick: () => void;
  onChange?: (newContent: string) => void;
  onWikilinkClick?: (targetName: string) => void;
}

export interface PreviewPaneRef {
  getScrollRatio: () => number;
  setScrollRatio: (ratio: number) => void;
  scrollToHeading: (headingText: string) => void;
}

export const PreviewPane = forwardRef<PreviewPaneRef, PreviewPaneProps>(({ title, content, nodes, onDoubleClick, onChange, onWikilinkClick }, ref) => {
  const [html, setHtml] = useState<string>('');
  const contentRef = useRef(content);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getScrollRatio: () => {
      if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const maxScroll = scrollHeight - clientHeight;
        return maxScroll > 0 ? scrollTop / maxScroll : 0;
      }
      return 0;
    },
    setScrollRatio: (ratio: number) => {
      setTimeout(() => {
        if (containerRef.current) {
          const { scrollHeight, clientHeight } = containerRef.current;
          containerRef.current.scrollTop = ratio * (scrollHeight - clientHeight);
        }
      }, 10);
    },
    scrollToHeading: (headingText: string) => {
      if (!containerRef.current) return;
      const cleanText = headingText.toLowerCase().trim();
      const headings = Array.from(
        containerRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6')
      ) as HTMLElement[];

      const matchedHeading = headings.find((h) => {
        const text = (h.textContent || '').toLowerCase().trim();
        return text === cleanText || text.includes(cleanText) || cleanText.includes(text);
      });

      if (matchedHeading) {
        matchedHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
  }));

  useEffect(() => {
    contentRef.current = content;
    const render = async () => {
      const renderedHtml = await renderMarkdown(content, nodes);
      setHtml(renderedHtml);
    };
    render();
  }, [content, nodes]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // 0. Handle Wikilink click
    const wikilinkEl = target.closest('[data-wikilink]') as HTMLElement | null;
    if (wikilinkEl) {
      const targetName = wikilinkEl.getAttribute('data-wikilink');
      if (targetName && onWikilinkClick) {
        e.stopPropagation();
        onWikilinkClick(targetName);
        return;
      }
    }

    // 1. Handle Copy Code Button
    const copyBtn = target.closest('.copy-code-btn') as HTMLButtonElement | null;
    if (copyBtn) {
      e.stopPropagation();
      const rawCode = copyBtn.getAttribute('data-code');
      if (rawCode) {
        const codeText = decodeURIComponent(rawCode);
        navigator.clipboard.writeText(codeText).then(() => {
          const copyIcon = copyBtn.querySelector('.copy-icon');
          const checkIcon = copyBtn.querySelector('.check-icon');
          const copyText = copyBtn.querySelector('.copy-text');

          if (copyIcon && checkIcon && copyText) {
            copyIcon.classList.add('hidden');
            checkIcon.classList.remove('hidden');
            copyText.textContent = 'Copied!';

            setTimeout(() => {
              copyIcon.classList.remove('hidden');
              checkIcon.classList.add('hidden');
              copyText.textContent = 'Copy';
            }, 2000);
          }
        });
      }
      return;
    }

    // 2. Handle Markdown Checkbox click
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      const checkboxes = Array.from(e.currentTarget.querySelectorAll('input[type="checkbox"]'));
      const index = checkboxes.indexOf(target as HTMLInputElement);
      
      if (index !== -1 && onChange) {
        let currentIdx = 0;
        const newContent = contentRef.current.replace(/- \[[ xX]\]/g, (match) => {
          if (currentIdx === index) {
            currentIdx++;
            return match === '- [ ]' ? '- [x]' : '- [ ]';
          }
          currentIdx++;
          return match;
        });
        onChange(newContent);
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-y-auto bg-bg-primary text-text-primary cursor-text"
      onDoubleClick={onDoubleClick}
    >
      {/* Dedicated Note Title at top of Preview */}
      <NoteTitle title={title} onChange={() => {}} isReadOnly={true} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-24">
        <div 
          className="prose dark:prose-invert prose-zinc max-w-none break-words"
          dangerouslySetInnerHTML={{ __html: html }}
          onClick={handleClick}
        />
      </div>
    </div>
  );
});
