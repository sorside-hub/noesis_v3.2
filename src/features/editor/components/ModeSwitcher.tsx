import React from 'react';
import { EditorMode } from '../../../types/editor';
import { Code, BookOpen, Pen } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface ModeSwitcherProps {
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  variant?: 'floating' | 'inline';
  className?: string;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ mode, setMode, variant = 'floating', className }) => {
  const isPreview = mode === 'PREVIEW';
  const isSource = mode === 'SOURCE';

  // Toggle Source Mode: If already SOURCE -> switch back to LIVE_EDIT; otherwise -> switch to SOURCE
  const handleSourceClick = () => {
    if (isSource) {
      setMode('LIVE_EDIT');
    } else {
      setMode('SOURCE');
    }
  };

  const handleVisualClick = () => {
    if (isPreview) {
      // If currently in Preview, clicking pencil switches to Live Edit
      setMode('LIVE_EDIT');
    } else {
      // If currently in edit mode (Source or Live Edit), clicking book switches to Preview
      setMode('PREVIEW');
    }
  };

  return (
    <div
      className={twMerge(
        'flex items-center gap-1 p-0.5 sm:p-1 bg-bg-surface/90 backdrop-blur-md border border-border-default shadow-md transition-all duration-200',
        variant === 'floating'
          ? 'fixed right-1.5 sm:right-3 top-1/2 -translate-y-1/2 z-30 flex-col rounded-full'
          : 'flex-row rounded-lg bg-transparent shadow-none border-none p-0',
        className
      )}
      role="group"
      aria-label="Editor Mode Switcher"
    >
      {/* 1. Source Button (Toggle ON/OFF) */}
      <button
        type="button"
        onClick={handleSourceClick}
        className={twMerge(
          'flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer',
          variant === 'floating' ? 'p-2 rounded-full' : 'w-7 h-7',
          isSource
            ? 'bg-bg-hover text-accent-primary shadow-xs font-semibold ring-1 ring-border-default'
            : 'text-text-muted hover:text-text-primary hover:bg-bg-hover/60'
        )}
        title={isSource ? 'Toggle off Source (Back to Live Edit)' : 'Switch to Source (Markdown raw)'}
        aria-pressed={isSource}
      >
        <Code size={15} />
      </button>

      {/* 2. Visual Button (Bottom: Book when in edit mode -> switches to Preview; Pen when in Preview -> switches to Live Edit) */}
      <button
        type="button"
        onClick={handleVisualClick}
        className={twMerge(
          'flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer',
          variant === 'floating' ? 'p-2 rounded-full' : 'w-7 h-7',
          !isSource
            ? 'bg-bg-hover text-text-primary shadow-xs font-semibold ring-1 ring-border-default/50'
            : 'text-text-muted hover:text-text-primary hover:bg-bg-hover/60'
        )}
        title={isPreview ? 'Switch to Live Edit' : 'Switch to Preview'}
        aria-pressed={!isSource}
      >
        {isPreview ? <Pen size={15} /> : <BookOpen size={15} />}
      </button>
    </div>
  );
};
