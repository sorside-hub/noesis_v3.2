import React from 'react';
import { SlidersHorizontal, X, BrainCircuit } from 'lucide-react';
import { ChatMode } from './ChatView';

interface ChatSettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  topK: number;
  setTopK: (val: number) => void;
  ragEnabledCount: number;
  activeNodeName?: string;
}

export const ChatSettingsSidebar: React.FC<ChatSettingsSidebarProps> = ({
  isOpen,
  onClose,
  mode,
  setMode,
  topK,
  setTopK,
  ragEnabledCount,
  activeNodeName
}) => {
  return (
    <aside
      className={`absolute inset-y-0 right-0 w-72 max-w-[80vw] bg-bg-surface border-l border-border-default flex flex-col transition-transform duration-300 ease-out z-40 shadow-2xl ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header Right Sidebar */}
      <div className="h-14 px-4 border-b border-border-default flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <SlidersHorizontal size={14} /> Chat Settings
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Settings Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs">
        {/* Mode Selection */}
        <div className="space-y-2">
          <label className="font-semibold text-text-heading uppercase tracking-wider text-[11px]">
            Sumber Konteks Chat
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-bg-primary border border-border-default rounded-xl">
            <button
              type="button"
              onClick={() => setMode('rag')}
              className={`py-1.5 px-2 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                mode === 'rag'
                  ? 'bg-bg-surface text-text-heading font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Smart Vault AI
            </button>
            <button
              type="button"
              onClick={() => setMode('current')}
              className={`py-1.5 px-2 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                mode === 'current'
                  ? 'bg-bg-surface text-text-heading font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Catatan Aktif
            </button>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            {mode === 'rag'
              ? `Memadukan ${ragEnabledCount} catatan RAG-ON di Vault dengan kecerdasan AI.`
              : activeNodeName
              ? `Fokus pada "${activeNodeName}".`
              : 'Tidak ada catatan aktif.'}
          </p>
        </div>

        {/* RAG Retrieval Depth (Top-K) */}
        {mode === 'rag' && (
          <div className="space-y-2">
            <label className="font-semibold text-text-heading uppercase tracking-wider text-[11px]">
              Kedalaman Konteks (Top-K)
            </label>
            <div className="flex items-center gap-2">
              {[3, 5, 7].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setTopK(num)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    topK === num
                      ? 'bg-text-primary text-bg-surface border-text-primary'
                      : 'bg-bg-primary border-border-default text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {num} Chunks
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="p-3 bg-bg-primary border border-border-default rounded-xl space-y-1.5 text-text-muted leading-relaxed text-[11px]">
          <span className="font-semibold text-text-primary flex items-center gap-1.5">
            <BrainCircuit size={13} className="text-accent-primary" /> Hybrid Intelligence
          </span>
          <p>
            Smart Vault AI secara otomatis mendeteksi apakah pertanyaan membutuhkan rujukan catatan atau pengetahuan umum.
          </p>
        </div>
      </div>
    </aside>
  );
};
