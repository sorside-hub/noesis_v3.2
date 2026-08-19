import React from 'react';
import { X, Search } from 'lucide-react';
import { VaultData } from '../../../types/vault';
import { useLeftSidebarLogic } from '../hooks/useLeftSidebarLogic';
import { LeftSidebarContextMenu } from './LeftSidebarContextMenu';
import { DeleteNodeModal } from './DeleteNodeModal';
import { MoveNodeModal } from './MoveNodeModal';
import { RenameNodeModal } from './RenameNodeModal';
import { FileTree } from './FileTree';
import { FloatingActionPill } from './FloatingActionPill';

interface LeftSidebarProps {
  vault: VaultData;
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onOpenInNewTab: (id: string) => void;
  onCreateNote: (parentId?: string | null) => void;
  onCreateFolder: (parentId?: string | null) => void;
  onRenameNode: (id: string, newName: string) => void;
  onMoveNode: (id: string, targetParentId: string | null) => void;
  onDeleteNode: (id: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  vault,
  activeFileId,
  onSelectFile,
  onOpenInNewTab,
  onCreateNote,
  onCreateFolder,
  onRenameNode,
  onMoveNode,
  onDeleteNode,
  isOpen,
  onCloseMobile,
}) => {
  const {
    collapsedFolders,
    isTreeSearchOpen,
    setIsTreeSearchOpen,
    treeSearchQuery,
    setTreeSearchQuery,
    treeSearchInputRef,
    searchContainerRef,
    activeMenuNode,
    menuPosition,
    renamingNode,
    renameValue,
    setRenameValue,
    renameInputRef,
    movingNode,
    folderSearchQuery,
    setFolderSearchQuery,
    folderSearchInputRef,
    nodeToDelete,
    setIsInputFocused,
    areAllFoldersCollapsed,
    handleToggleExpandCollapseAll,
    getChildren,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleContextMenu,
    closeActiveDialog,
    handleItemClick,
    handleStartRename,
    isRenameDuplicate,
    handleSaveRename,
    handleStartMove,
    handleExecuteMove,
    handleDelete,
    confirmDelete,
    handleCreateNoteInFolder,
    handleCreateSubfolderInFolder,
    getAvailableFolders,
    matchesSearch,
    isPillHidden,
  } = useLeftSidebarLogic({
    vault,
    activeFileId,
    onSelectFile,
    onOpenInNewTab,
    onCreateNote,
    onCreateFolder,
    onRenameNode,
    onMoveNode,
    onDeleteNode,
    onCloseMobile,
  });

  return (
    <div className="h-full w-full flex flex-col bg-bg-surface border-r border-border-default overflow-hidden select-none relative">
      {/* Optional In-Tree Search Bar (Toggled via floating search button) */}
      {isTreeSearchOpen && (
        <div ref={searchContainerRef} className="px-2.5 pt-2 pb-1.5 border-b border-border-subtle bg-bg-surface/90 shadow-xs z-10">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              ref={treeSearchInputRef}
              type="text"
              value={treeSearchQuery}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onChange={(e) => setTreeSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsTreeSearchOpen(false);
                  setTreeSearchQuery('');
                  setIsInputFocused(false);
                }
              }}
              placeholder="Filter berkas / folder..."
              className="w-full pl-7 pr-6 py-1.5 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
            <button
              type="button"
              title="Tutup Pencarian"
              onClick={() => {
                setIsTreeSearchOpen(false);
                setTreeSearchQuery('');
                setIsInputFocused(false);
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Tree List (with generous bottom padding for floating bar) */}
      <div className="flex-1 overflow-y-auto p-2 pb-16 space-y-0.5">
        <FileTree
          getChildren={getChildren}
          matchesSearch={matchesSearch}
          treeSearchQuery={treeSearchQuery}
          collapsedFolders={collapsedFolders}
          activeFileId={activeFileId}
          handleItemClick={handleItemClick}
          handleContextMenu={handleContextMenu}
          handleTouchStart={handleTouchStart}
          handleTouchMove={handleTouchMove}
          handleTouchEnd={handleTouchEnd}
        />
      </div>

      {/* ----------------------------------------------------------- */}
      {/* FLOATING ACTION PILL (Mengambang Rounded Bar) */}
      {/* ----------------------------------------------------------- */}
      <FloatingActionPill
        isPillHidden={isPillHidden}
        onCreateNote={onCreateNote}
        onCreateFolder={onCreateFolder}
        onCloseMobile={onCloseMobile}
        isTreeSearchOpen={isTreeSearchOpen}
        setIsTreeSearchOpen={setIsTreeSearchOpen}
        areAllFoldersCollapsed={areAllFoldersCollapsed}
        handleToggleExpandCollapseAll={handleToggleExpandCollapseAll}
      />

      {/* ----------------------------------------------------------- */}
      {/* HOLD / LONG-PRESS POPUP MENU MODAL */}
      {/* ----------------------------------------------------------- */}
      <LeftSidebarContextMenu
        activeMenuNode={activeMenuNode}
        menuPosition={menuPosition}
        closeActiveDialog={closeActiveDialog}
        handleCreateNoteInFolder={handleCreateNoteInFolder}
        handleCreateSubfolderInFolder={handleCreateSubfolderInFolder}
        onOpenInNewTab={onOpenInNewTab}
        onCloseMobile={onCloseMobile}
        handleStartRename={handleStartRename}
        handleStartMove={handleStartMove}
        handleDelete={handleDelete}
      />

      {/* ----------------------------------------------------------- */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ----------------------------------------------------------- */}
      <DeleteNodeModal
        nodeToDelete={nodeToDelete}
        closeActiveDialog={closeActiveDialog}
        confirmDelete={confirmDelete}
      />

      {/* ----------------------------------------------------------- */}
      {/* MOVE TO FOLDER MODAL WITH SEARCH */}
      {/* ----------------------------------------------------------- */}
      <MoveNodeModal
        movingNode={movingNode}
        folderSearchQuery={folderSearchQuery}
        setFolderSearchQuery={setFolderSearchQuery}
        folderSearchInputRef={folderSearchInputRef}
        setIsInputFocused={setIsInputFocused}
        closeActiveDialog={closeActiveDialog}
        handleExecuteMove={handleExecuteMove}
        getAvailableFolders={getAvailableFolders}
      />

      {/* ----------------------------------------------------------- */}
      {/* RENAME DIALOG MODAL */}
      {/* ----------------------------------------------------------- */}
      <RenameNodeModal
        renamingNode={renamingNode}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        renameInputRef={renameInputRef}
        isRenameDuplicate={isRenameDuplicate}
        setIsInputFocused={setIsInputFocused}
        closeActiveDialog={closeActiveDialog}
        handleSaveRename={handleSaveRename}
      />
    </div>
  );
};
