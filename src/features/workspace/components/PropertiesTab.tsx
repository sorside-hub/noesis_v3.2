import React from 'react';
import {
  Folder,
  ChevronDown,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Clock,
  FileText,
  FileCode,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { FileNode } from '../../../types/vault';
import { ChipInput } from './ChipInput';

interface PropertiesTabProps {
  activeNode: FileNode;
  folderName: string;
  noteType: string;
  status: string;
  tags: string[];
  aliases: string[];
  includeInAiRag: boolean;
  isSyncingRag: boolean;
  isSynced: boolean;
  formattedCreated: string;
  formattedModified: string;
  stats: {
    words: number;
    characters: number;
    readingTimeMinutes: number;
  };
  handleTypeChange: (val: string) => void;
  handleStatusChange: (val: string) => void;
  handleTagsChange: (newTags: string[]) => void;
  handleAliasesChange: (newAliases: string[]) => void;
  handleToggleRag: () => void;
  handleManualSync: () => void;
}

export const PropertiesTab: React.FC<PropertiesTabProps> = ({
  activeNode,
  folderName,
  noteType,
  status,
  tags,
  aliases,
  includeInAiRag,
  isSyncingRag,
  isSynced,
  formattedCreated,
  formattedModified,
  stats,
  handleTypeChange,
  handleStatusChange,
  handleTagsChange,
  handleAliasesChange,
  handleToggleRag,
  handleManualSync,
}) => {
  return (
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

      {/* 6. Toggle Include in AI RAG & Manual Sync Control */}
      <div className="space-y-2.5 py-2">
        <div className="flex items-center justify-between">
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
            disabled={isSyncingRag}
            className={twMerge(
              'w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200',
              isSyncingRag ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
              includeInAiRag ? 'bg-accent-primary justify-end' : 'bg-bg-hover border border-border-default justify-start'
            )}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-xs flex items-center justify-center">
              {isSyncingRag && <Loader2 size={10} className="animate-spin text-accent-primary" />}
            </div>
          </button>
        </div>

        {includeInAiRag && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-bg-hover/50 border border-border-subtle text-xs transition-all duration-200">
            <div className="flex items-center gap-1.5 text-[11px]">
              {isSyncingRag ? (
                <>
                  <Loader2 size={12} className="animate-spin text-accent-primary" />
                  <span className="text-accent-primary font-medium">Syncing...</span>
                </>
              ) : isSynced ? (
                <>
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">In Sync</span>
                </>
              ) : (
                <>
                  <AlertCircle size={12} className="text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Out of Sync</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncingRag}
              className={twMerge(
                'flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-all duration-150 cursor-pointer',
                isSyncingRag
                  ? 'bg-border-default text-text-muted cursor-not-allowed'
                  : isSynced
                  ? 'bg-bg-primary hover:bg-border-subtle text-text-muted hover:text-text-primary border border-border-default'
                  : 'bg-accent-primary text-white hover:bg-accent-primary/90 shadow-xs animate-pulse'
              )}
            >
              <RefreshCw size={11} className={isSyncingRag ? 'animate-spin' : ''} />
              <span>{isSynced ? 'Re-Sync' : 'Sync Now'}</span>
            </button>
          </div>
        )}
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
  );
};
