import React, { useRef, useEffect } from 'react';

interface NoteTitleProps {
  title: string;
  onChange: (newTitle: string) => void;
  onEnterPress?: () => void;
  isReadOnly?: boolean;
}

export const NoteTitle: React.FC<NoteTitleProps> = ({
  title,
  onChange,
  onEnterPress,
  isReadOnly = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize height based on content
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 38)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [title]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onEnterPress) {
        onEnterPress();
      }
    }
  };

  if (isReadOnly) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <h1 className="text-[28px] font-bold leading-[1.3] text-text-heading break-words">
          {title.trim() || 'Untitled'}
        </h1>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-2">
      <textarea
        ref={textareaRef}
        rows={1}
        value={title}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Untitled"
        className="w-full resize-none overflow-hidden bg-transparent text-[28px] font-bold leading-[1.3] text-text-heading placeholder:text-text-muted focus:outline-none border-none p-0 tracking-tight block min-h-[38px]"
        aria-label="Note Title"
      />
    </div>
  );
};
