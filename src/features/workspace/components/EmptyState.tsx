import React from 'react';
import { Plus, FileText } from 'lucide-react';

interface EmptyStateProps {
  onCreateNote: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateNote }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-bg-surface px-6 text-center select-none">
      <div className="w-16 h-16 rounded-2xl bg-bg-hover flex items-center justify-center text-text-muted mb-6 shadow-xs border border-border-subtle">
        <FileText size={32} strokeWidth={1.5} />
      </div>

      <h2 className="text-xl font-semibold text-text-heading mb-2 tracking-tight">
        No note is open
      </h2>

      <p className="text-sm text-text-muted max-w-sm mb-6 leading-relaxed">
        Select a note from the sidebar, or create a new one to begin writing.
      </p>

      <button
        type="button"
        onClick={onCreateNote}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-text-primary text-bg-surface font-medium text-sm hover:opacity-90 active:scale-98 transition-all duration-150 shadow-xs cursor-pointer"
      >
        <Plus size={16} />
        <span>Create new note</span>
      </button>
    </div>
  );
};
