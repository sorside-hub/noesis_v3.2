import { useState, useEffect } from 'react';
import { 
  Bold, Italic, Heading as HeadingIcon, List, CheckSquare,
  ListOrdered, Strikethrough, TextQuote, Code, SquareTerminal,
  Link, Minus, Brackets
} from 'lucide-react';
import { EditorView } from '@codemirror/view';

export const Toolbar = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Detect mobile viewport width
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Track editor focus - STRICTLY only for the note editor area (.cm-editor / .cm-content)
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.closest('.cm-editor') || target.closest('.cm-content'))) {
        setIsFocused(true);
      } else if (!target?.closest('.toolbar-container')) {
        setIsFocused(false);
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      const related = e.relatedTarget as HTMLElement;
      if (related && (related.closest('.toolbar-container') || related.closest('.cm-editor'))) {
        return;
      }
      setIsFocused(false);
    };
    
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Robust multi-platform keyboard visibility & viewport offset detection
  useEffect(() => {
    let maxKnownHeight = window.innerHeight;

    const checkKeyboardAndOffset = () => {
      const currentHeight = window.innerHeight;
      if (currentHeight > maxKnownHeight) {
        maxKnownHeight = currentHeight;
      }

      const vv = window.visualViewport;
      let offset = 0;
      let keyboardDetected = false;

      if (vv) {
        // iOS Safari: visualViewport shrinks while window.innerHeight stays constant
        const iosOffset = window.innerHeight - (vv.height + vv.offsetTop);
        offset = Math.max(0, iosOffset);
        if (offset > 50) {
          keyboardDetected = true;
        }
      }

      // Android Chrome: window.innerHeight shrinks when keyboard opens
      const heightDifference = maxKnownHeight - currentHeight;
      if (heightDifference > 120) {
        keyboardDetected = true;
      }

      // Fallback for desktop testing in mobile responsive view (non-touch)
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (!isTouch) {
        keyboardDetected = true;
      }

      setBottomOffset(offset);
      setIsKeyboardOpen(keyboardDetected);
    };

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', checkKeyboardAndOffset);
      vv.addEventListener('scroll', checkKeyboardAndOffset);
    }
    window.addEventListener('resize', checkKeyboardAndOffset);
    
    const handleOrientation = () => {
      setTimeout(() => {
        maxKnownHeight = window.innerHeight;
        checkKeyboardAndOffset();
      }, 300);
    };
    window.addEventListener('orientationchange', handleOrientation);

    checkKeyboardAndOffset();

    return () => {
      if (vv) {
        vv.removeEventListener('resize', checkKeyboardAndOffset);
        vv.removeEventListener('scroll', checkKeyboardAndOffset);
      }
      window.removeEventListener('resize', checkKeyboardAndOffset);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

  const getView = () => {
    const dom = document.querySelector('.cm-content');
    return dom ? EditorView.findFromDOM(dom as HTMLElement) : null;
  };

  const wrapSelection = (prefix: string, suffix: string) => {
    const view = getView();
    if (!view) return;
    const selection = view.state.selection.main;
    const selectedText = view.state.doc.sliceString(selection.from, selection.to);
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: `${prefix}${selectedText}${suffix}`
      },
      selection: { 
        anchor: selectedText 
          ? selection.from + prefix.length + selectedText.length + suffix.length 
          : selection.from + prefix.length 
      }
    });
    view.focus();
  };

  const cycleHeading = () => {
    const view = getView();
    if (!view) return;
    const selection = view.state.selection.main;
    const line = view.state.doc.lineAt(selection.head);
    const text = line.text;
    const cursorOffset = selection.head - line.from;
    
    let newText = text;
    let newCursorPos = line.from;

    if (text.startsWith('### ')) {
      newText = text.slice(4);
      newCursorPos = line.from + Math.max(0, cursorOffset - 4);
    } else if (text.startsWith('## ')) {
      newText = '### ' + text.slice(3);
      newCursorPos = line.from + (cursorOffset <= 3 ? 4 : cursorOffset + 1);
    } else if (text.startsWith('# ')) {
      newText = '## ' + text.slice(2);
      newCursorPos = line.from + (cursorOffset <= 2 ? 3 : cursorOffset + 1);
    } else {
      newText = '# ' + text;
      newCursorPos = line.from + (cursorOffset === 0 ? 2 : cursorOffset + 2);
    }
    
    view.dispatch({
      changes: {
        from: line.from,
        to: line.to,
        insert: newText
      },
      selection: { anchor: newCursorPos }
    });
    view.focus();
  };

  const handleCodeBlock = () => {
    const view = getView();
    if (!view) return;
    const selection = view.state.selection.main;
    const selectedText = view.state.doc.sliceString(selection.from, selection.to);
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: `\`\`\`\n${selectedText}\n\`\`\``
      },
      selection: { 
        anchor: selectedText 
          ? selection.from + 4 + selectedText.length + 4 
          : selection.from + 4 
      }
    });
    view.focus();
  };

  const handleLink = () => {
    const view = getView();
    if (!view) return;
    const selection = view.state.selection.main;
    const selectedText = view.state.doc.sliceString(selection.from, selection.to);
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: `[${selectedText}](url)`
      },
      selection: { 
        anchor: selection.from + 1 + selectedText.length + 2,
        head: selection.from + 1 + selectedText.length + 5
      }
    });
    view.focus();
  };

  const handleWikilink = () => {
    const view = getView();
    if (!view) return;
    const selection = view.state.selection.main;
    const selectedText = view.state.doc.sliceString(selection.from, selection.to);

    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: `[[${selectedText}]]`
      },
      selection: {
        anchor: selection.from + 2 + selectedText.length
      }
    });
    view.focus();
  };

  const tools = [
    { icon: <Bold size={18} />, label: 'Bold', action: () => wrapSelection('**', '**') },
    { icon: <Italic size={18} />, label: 'Italic', action: () => wrapSelection('*', '*') },
    { icon: <Strikethrough size={18} />, label: 'Strikethrough', action: () => wrapSelection('~~', '~~') },
    { icon: <HeadingIcon size={18} />, label: 'Heading', action: cycleHeading },
    { icon: <List size={18} />, label: 'Bullet List', action: () => wrapSelection('- ', '') },
    { icon: <ListOrdered size={18} />, label: 'Numbered List', action: () => wrapSelection('1. ', '') },
    { icon: <CheckSquare size={18} />, label: 'Task List', action: () => wrapSelection('- [ ] ', '') },
    { icon: <TextQuote size={18} />, label: 'Blockquote', action: () => wrapSelection('> ', '') },
    { icon: <Code size={18} />, label: 'Inline Code', action: () => wrapSelection('`', '`') },
    { icon: <SquareTerminal size={18} />, label: 'Code Block', action: handleCodeBlock },
    { icon: <Brackets size={18} />, label: 'Wikilink [[ ]]', action: handleWikilink },
    { icon: <Link size={18} />, label: 'Link', action: handleLink },
    { icon: <Minus size={18} />, label: 'Horizontal Rule', action: () => wrapSelection('\n---\n', '') },
  ];

  if (isMobile && (!isFocused || !isKeyboardOpen)) {
    return null;
  }

  const baseClasses = "flex items-center gap-1 p-2 bg-bg-surface border-border-default overflow-x-auto whitespace-nowrap w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] toolbar-container";
  const mobileClasses = "fixed left-0 right-0 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 transition-none";
  const desktopClasses = "border-b relative";

  return (
    <div 
      className={`${baseClasses} ${isMobile ? mobileClasses : desktopClasses}`}
      style={isMobile ? { bottom: `${bottomOffset}px` } : undefined}
    >
      {tools.map((tool, idx) => (
        <button
          key={idx}
          onPointerDown={(e) => {
            // Prevent editor blur when tapping toolbar buttons
            e.preventDefault();
          }}
          onClick={(e) => {
            e.preventDefault();
            tool.action();
          }}
          className="p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary rounded-md transition-colors shrink-0"
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
};
