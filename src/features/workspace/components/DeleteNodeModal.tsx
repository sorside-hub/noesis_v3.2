import React from 'react';
import { FileNode } from '../../../types/vault';

interface DeleteNodeModalProps {
  nodeToDelete: FileNode | null;
  closeActiveDialog: () => void;
  confirmDelete: () => void;
}

export const DeleteNodeModal: React.FC<DeleteNodeModalProps> = ({
  nodeToDelete,
  closeActiveDialog,
  confirmDelete,
}) => {
  if (!nodeToDelete) return null;

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={closeActiveDialog}
    >
      <div
        className="w-full max-w-sm bg-bg-surface border border-border-default rounded-xl shadow-2xl p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-text-heading">
          Hapus {nodeToDelete.type === 'folder' ? 'Folder' : 'Catatan'}
        </h3>
        <p className="text-sm text-text-muted leading-relaxed">
          Apakah Anda yakin ingin menghapus <span className="font-semibold text-text-primary">&quot;{nodeToDelete.name}&quot;</span>?
          {nodeToDelete.type === 'folder' && ' Semua isi di dalam folder ini juga akan terhapus.'}
          <br />
          Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="flex justify-end gap-3 mt-2">
          <button
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-modifier-hover rounded-lg transition-colors cursor-pointer"
            onClick={closeActiveDialog}
          >
            Batal
          </button>
          <button
            className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors cursor-pointer"
            onClick={confirmDelete}
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
};
