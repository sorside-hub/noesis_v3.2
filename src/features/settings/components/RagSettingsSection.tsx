import React, { useState, useEffect } from 'react';
import { Brain, RefreshCw, Trash2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { VaultData, FileNode } from '../../../types/vault';
import { db } from '../../../lib/db';
import { RAGPipeline } from '../../rag/services/ragPipeline';
import { getAllLocalKeyOverrides } from '../../../lib/ai/keyManager';

interface RagSettingsSectionProps {
  vault: VaultData;
}

export const RagSettingsSection: React.FC<RagSettingsSectionProps> = ({ vault }) => {
  const [totalVectors, setTotalVectors] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [syncProgress, setSyncProgress] = useState<string>('');

  const allNodes = Object.values(vault.nodes) as FileNode[];
  const ragEnabledNotes = allNodes.filter(
    (n) => n.type === 'file' && n.metadata?.includeInAiRag === true
  );

  const fetchVectorStats = async () => {
    try {
      const count = await db.embeddings.count();
      setTotalVectors(count);
    } catch (err) {
      console.error('Failed to fetch vector count:', err);
    }
  };

  useEffect(() => {
    fetchVectorStats();
  }, [vault]);

  const handleBatchSync = async () => {
    if (ragEnabledNotes.length === 0) {
      setStatusMessage('Tidak ada catatan dengan RAG teraktifkan.');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setIsSyncing(true);
    setStatusMessage('');
    const customKeys = getAllLocalKeyOverrides();
    const pipeline = new RAGPipeline(customKeys);

    let successCount = 0;
    for (let i = 0; i < ragEnabledNotes.length; i++) {
      const note = ragEnabledNotes[i];
      setSyncProgress(`Syncing ${i + 1}/${ragEnabledNotes.length}: "${note.name}"...`);
      try {
        await pipeline.processNote(note.id, note.content || '');
        successCount++;
      } catch (err) {
        console.error(`Failed to sync note ${note.id}:`, err);
      }
    }

    setIsSyncing(false);
    setSyncProgress('');
    await fetchVectorStats();
    setStatusMessage(`Selesai! Berhasil menyinkronkan ${successCount} dari ${ragEnabledNotes.length} catatan.`);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handlePurgeVectors = async () => {
    if (!window.confirm('Yakin ingin mengosongkan Penyimpanan Vektor AI? Semua hasil analisis & embedding akan dihapus (Catatan asli Anda aman).')) {
      return;
    }

    setIsPurging(true);
    try {
      await db.embeddings.clear();
      await db.ai_analysis.clear();
      await fetchVectorStats();
      setStatusMessage('Penyimpanan Vektor AI berhasil dikosongkan.');
    } catch (err) {
      console.error('Failed to purge vector DB:', err);
      setStatusMessage('Gagal mengosongkan Penyimpanan Vektor.');
    } finally {
      setIsPurging(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  return (
    <section>
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2.5 px-1 flex items-center gap-2">
        <Brain size={14} className="text-purple-500 dark:text-purple-400" /> AI Memory (RAG)
      </h2>

      <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden divide-y divide-border-subtle shadow-xs">
        {/* Info Stats Row */}
        <div className="p-3.5 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-purple-500 dark:text-purple-400 shrink-0" />
            <span className="font-medium text-text-heading">AI Vector Context</span>
          </div>
          <span className="text-text-muted font-mono text-xs">
            {ragEnabledNotes.length} catatan terhubung ({totalVectors} vektor)
          </span>
        </div>

        {/* Action Controls Row */}
        <div className="p-3.5 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleBatchSync}
            disabled={isSyncing || isPurging}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 bg-bg-primary hover:bg-bg-hover border border-border-default rounded-lg text-xs font-medium transition-colors text-text-primary disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin text-accent-primary' : ''} />
            <span>{isSyncing ? syncProgress : 'Re-sync Semua Catatan RAG'}</span>
          </button>

          <button
            type="button"
            onClick={handlePurgeVectors}
            disabled={isSyncing || isPurging}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Kosongkan Vektor</span>
          </button>
        </div>

        {statusMessage && (
          <div className="p-3 text-center text-xs font-medium text-accent-primary bg-bg-hover">
            {statusMessage}
          </div>
        )}
      </div>
    </section>
  );
};
