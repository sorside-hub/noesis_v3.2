import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PanelLeft, PanelRight, Plus, X } from 'lucide-react';
import { useVault } from '../../../hooks/useVault';
import { LeftSidebar } from '../../workspace/components/LeftSidebar';
import { RightSidebar } from '../../workspace/components/RightSidebar';
import { EmptyState } from '../../workspace/components/EmptyState';
import { EditorCore, EditorCoreRef } from './EditorCore';
import { ModeSwitcher } from './ModeSwitcher';
import { PreviewPane, PreviewPaneRef } from './PreviewPane';
import { Toolbar } from './Toolbar';
import { useEditorMode } from '../../../hooks/useEditorMode';
import { EditorMode } from '../../../types/editor';
import { FileNode } from '../../../types/vault';
import { useNavigation } from '../../../context/NavigationContext';

interface NoteEditorProps {
  vaultState?: ReturnType<typeof useVault>;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ vaultState: externalVaultState }) => {
  const internalVaultState = useVault();
  const {
    vault,
    activeNode,
    setActiveTabId,
    openInNewTab,
    closeTab,
    createNote,
    createFolder,
    updateNoteContent,
    updateNodeTitle,
    updateNoteMetadata,
    moveNode,
    deleteNode,
  } = externalVaultState || internalVaultState;

  const {
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    openMobileSidebar,
    closeMobileSidebar,
    isMobileRightSidebarOpen,
    setIsMobileRightSidebarOpen,
    openMobileRightSidebar,
    closeMobileRightSidebar,
    navigateToNote,
  } = useNavigation();

  // Desktop sidebar states
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const [isDesktopRightSidebarOpen, setIsDesktopRightSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1280;
    }
    return false;
  });

  const { mode, setMode } = useEditorMode('PREVIEW');
  const [lastEditMode, setLastEditMode] = useState<'SOURCE' | 'LIVE_EDIT'>('LIVE_EDIT');

  const editorRef = useRef<EditorCoreRef>(null);
  const previewRef = useRef<PreviewPaneRef>(null);

  // Left Drawer DOM refs
  const leftDrawerRef = useRef<HTMLDivElement>(null);
  const leftBackdropRef = useRef<HTMLDivElement>(null);

  // Right Drawer DOM refs
  const rightDrawerRef = useRef<HTMLDivElement>(null);
  const rightBackdropRef = useRef<HTMLDivElement>(null);

  // Ref tracking left gesture state
  const leftGestureState = useRef({
    isSwiping: false,
    isIgnored: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    velocityX: 0,
    isOpen: false,
    drawerWidth: typeof window !== 'undefined' ? window.innerWidth : 400,
    currentOffset: 0,
  });

  // Ref tracking right gesture state
  const rightGestureState = useRef({
    isSwiping: false,
    isIgnored: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    velocityX: 0,
    isOpen: false,
    drawerWidth: typeof window !== 'undefined' ? window.innerWidth : 400,
    currentOffset: 0,
  });

  // Bulletproof Drawer Snap Helpers (Percentage based to prevent stuck states & handle resize)
  const snapLeftDrawer = useCallback((open: boolean) => {
    if (leftDrawerRef.current && leftBackdropRef.current) {
      leftDrawerRef.current.style.transition = 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
      leftDrawerRef.current.style.transform = open ? 'translate3d(0%, 0, 0)' : 'translate3d(-100%, 0, 0)';
      leftBackdropRef.current.style.transition = 'opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
      leftBackdropRef.current.style.opacity = open ? '1' : '0';
      leftBackdropRef.current.style.pointerEvents = open ? 'auto' : 'none';
    }
  }, []);

  const snapRightDrawer = useCallback((open: boolean) => {
    if (rightDrawerRef.current && rightBackdropRef.current) {
      rightDrawerRef.current.style.transition = 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
      rightDrawerRef.current.style.transform = open ? 'translate3d(0%, 0, 0)' : 'translate3d(100%, 0, 0)';
      rightBackdropRef.current.style.transition = 'opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
      rightBackdropRef.current.style.opacity = open ? '1' : '0';
      rightBackdropRef.current.style.pointerEvents = open ? 'auto' : 'none';
    }
  }, []);

  // Keep Left drawer state sync
  useEffect(() => {
    leftGestureState.current.isOpen = isMobileSidebarOpen;
    snapLeftDrawer(isMobileSidebarOpen);
  }, [isMobileSidebarOpen, snapLeftDrawer]);

  // Keep Right drawer state sync
  useEffect(() => {
    rightGestureState.current.isOpen = isMobileRightSidebarOpen;
    snapRightDrawer(isMobileRightSidebarOpen);
  }, [isMobileRightSidebarOpen, snapRightDrawer]);

  // Window resize handler for drawer widths
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      leftGestureState.current.drawerWidth = width;
      rightGestureState.current.drawerWidth = width;
      snapLeftDrawer(leftGestureState.current.isOpen);
      snapRightDrawer(rightGestureState.current.isOpen);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [snapLeftDrawer, snapRightDrawer]);

  // -------------------------------------------------------------
  // TOUCH GESTURE HANDLING (Both Left and Right Slide Drawers)
  // -------------------------------------------------------------
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 1024) return;
    const touch = e.touches[0];
    const width = window.innerWidth;
    const now = Date.now();

    const target = e.target as HTMLElement | null;
    const shouldIgnore = !!target?.closest('header, button, input, textarea, select, [data-no-swipe], .cm-editor, .cm-content');

    // Left state init
    const leftState = leftGestureState.current;
    leftState.startX = touch.clientX;
    leftState.startY = touch.clientY;
    leftState.lastX = touch.clientX;
    leftState.lastTime = now;
    leftState.velocityX = 0;
    leftState.isSwiping = false;
    leftState.isIgnored = shouldIgnore;
    leftState.drawerWidth = width;

    // Right state init
    const rightState = rightGestureState.current;
    rightState.startX = touch.clientX;
    rightState.startY = touch.clientY;
    rightState.lastX = touch.clientX;
    rightState.lastTime = now;
    rightState.velocityX = 0;
    rightState.isSwiping = false;
    rightState.isIgnored = shouldIgnore;
    rightState.drawerWidth = width;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.innerWidth >= 1024) return;
    const leftState = leftGestureState.current;
    const rightState = rightGestureState.current;

    if (leftState.isIgnored || rightState.isIgnored) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - leftState.startX;
    const deltaY = Math.abs(touch.clientY - leftState.startY);

    // Calculate real-time instantaneous velocity (pixels/ms)
    const now = Date.now();
    const dt = now - leftState.lastTime;
    if (dt > 8) {
      const vx = (touch.clientX - leftState.lastX) / dt;
      leftState.velocityX = vx;
      leftState.lastX = touch.clientX;
      leftState.lastTime = now;

      rightState.velocityX = vx;
      rightState.lastX = touch.clientX;
      rightState.lastTime = now;
    }

    // Check if moving primarily horizontally with a solid deadzone (not too sensitive)
    const SWIPE_INIT_THRESHOLD = 24;

    if (!leftState.isSwiping && !rightState.isSwiping) {
      if (Math.abs(deltaX) > SWIPE_INIT_THRESHOLD && Math.abs(deltaX) > deltaY * 1.5) {
        if (rightState.isOpen) {
          // If right sidebar is open, user drags rightwards (deltaX > 0) to close it
          if (deltaX > 0) {
            rightState.isSwiping = true;
            if (rightDrawerRef.current) rightDrawerRef.current.style.transition = 'none';
            if (rightBackdropRef.current) rightBackdropRef.current.style.transition = 'none';
          }
        } else if (leftState.isOpen) {
          // If left sidebar is open, user drags leftwards (deltaX < 0) to close it
          if (deltaX < 0) {
            leftState.isSwiping = true;
            if (leftDrawerRef.current) leftDrawerRef.current.style.transition = 'none';
            if (leftBackdropRef.current) leftBackdropRef.current.style.transition = 'none';
          }
        } else {
          // Both closed:
          if (deltaX > 0) {
            leftState.isSwiping = true;
            if (leftDrawerRef.current) leftDrawerRef.current.style.transition = 'none';
            if (leftBackdropRef.current) leftBackdropRef.current.style.transition = 'none';
          } else if (deltaX < 0) {
            rightState.isSwiping = true;
            if (rightDrawerRef.current) rightDrawerRef.current.style.transition = 'none';
            if (rightBackdropRef.current) rightBackdropRef.current.style.transition = 'none';
          }
        }
      }
    }

    // Handle Active Left Swipe
    if (leftState.isSwiping && leftDrawerRef.current && leftBackdropRef.current) {
      const width = leftState.drawerWidth || window.innerWidth;
      const basePos = leftState.isOpen ? 0 : -width;
      const newPos = Math.min(0, Math.max(-width, basePos + deltaX));
      leftState.currentOffset = newPos;

      const progress = (newPos + width) / width;
      const translatePercent = (progress - 1) * 100;

      leftDrawerRef.current.style.transform = `translate3d(${translatePercent}%, 0, 0)`;
      leftBackdropRef.current.style.opacity = `${progress}`;
      leftBackdropRef.current.style.pointerEvents = progress > 0.05 ? 'auto' : 'none';
    }

    // Handle Active Right Swipe
    if (rightState.isSwiping && rightDrawerRef.current && rightBackdropRef.current) {
      const width = rightState.drawerWidth || window.innerWidth;
      const basePos = rightState.isOpen ? 0 : width;
      const newPos = Math.max(0, Math.min(width, basePos + deltaX));
      rightState.currentOffset = newPos;

      const progress = (width - newPos) / width;
      const translatePercent = (1 - progress) * 100;

      rightDrawerRef.current.style.transform = `translate3d(${translatePercent}%, 0, 0)`;
      rightBackdropRef.current.style.opacity = `${progress}`;
      rightBackdropRef.current.style.pointerEvents = progress > 0.05 ? 'auto' : 'none';
    }
  };

  const handleTouchEnd = () => {
    if (window.innerWidth >= 1024) return;
    const leftState = leftGestureState.current;
    const rightState = rightGestureState.current;

    if (leftState.isIgnored || rightState.isIgnored) {
      leftState.isIgnored = false;
      rightState.isIgnored = false;
      leftState.isSwiping = false;
      rightState.isSwiping = false;
      return;
    }

    // Finish Left Swipe
    if (leftState.isSwiping) {
      const width = leftState.drawerWidth || window.innerWidth;
      const progress = (leftState.currentOffset + width) / width;
      const velocity = leftState.velocityX;

      const shouldOpen = !leftState.isOpen
        ? (velocity > 0.35 || progress > 0.3)
        : !(velocity < -0.35 || progress < 0.7);

      if (shouldOpen) {
        openMobileSidebar();
      } else {
        closeMobileSidebar();
      }
      snapLeftDrawer(shouldOpen);
      leftState.isSwiping = false;
    }

    // Finish Right Swipe
    if (rightState.isSwiping) {
      const width = rightState.drawerWidth || window.innerWidth;
      const progress = (width - rightState.currentOffset) / width;
      const velocity = rightState.velocityX;

      const shouldOpen = !rightState.isOpen
        ? (velocity < -0.35 || progress > 0.3)
        : !(velocity > 0.35 || progress < 0.7);

      if (shouldOpen) {
        openMobileRightSidebar();
      } else {
        closeMobileRightSidebar();
      }
      snapRightDrawer(shouldOpen);
      rightState.isSwiping = false;
    }
  };

  // Handle Wikilink click -> navigate to existing note or auto-create new note if ghost link
  const handleWikilinkClick = (targetName: string) => {
    const cleanTarget = targetName.trim().toLowerCase();
    if (!cleanTarget) return;

    const allNodes = Object.values(vault.nodes) as FileNode[];
    // Find matching note by name or alias
    const existing = allNodes.find(
      (n: FileNode) =>
        n.type === 'file' &&
        (n.name.toLowerCase() === cleanTarget ||
          (n.metadata?.aliases || []).some((al) => al.toLowerCase() === cleanTarget))
    );

    if (existing) {
      navigateToNote(existing.id);
      setMode('PREVIEW');
    } else {
      // Auto-create new note with targetName
      const newId = createNote(null, targetName.trim());
      if (newId) {
        navigateToNote(newId);
        setMode('LIVE_EDIT');
      }
    }
  };

  // Track the last active edit mode
  useEffect(() => {
    if (mode === 'SOURCE' || mode === 'LIVE_EDIT') {
      setLastEditMode(mode);
    }
  }, [mode]);

  const handleModeChange = (newMode: EditorMode) => {
    if (newMode === 'PREVIEW' && mode !== 'PREVIEW') {
      const ratio = editorRef.current?.getScrollRatio() || 0;
      setMode(newMode);
      previewRef.current?.setScrollRatio(ratio);
    } else if (mode === 'PREVIEW' && newMode !== 'PREVIEW') {
      const ratio = previewRef.current?.getScrollRatio() || 0;
      setMode(newMode);
      editorRef.current?.setScrollRatio(ratio);
    } else {
      setMode(newMode);
    }
  };

  const currentTitle = activeNode?.name || '';
  const currentContent = activeNode?.content || '';

  const handleTitleChange = (newTitle: string) => {
    if (activeNode) {
      updateNodeTitle(activeNode.id, newTitle);
    }
  };

  const handleContentChange = (newContent: string) => {
    if (activeNode) {
      updateNoteContent(activeNode.id, newContent);
    }
  };

  // Saat membuat catatan baru -> Otomatis masuk ke Mode Edit (LIVE_EDIT)
  const handleCreateNewNote = (parentId: string | null = null) => {
    const newId = createNote(parentId, 'Untitled');
    if (newId) {
      navigateToNote(newId);
    }
    setMode('LIVE_EDIT');
  };

  // Saat membuka / memilih catatan dari sidebar -> Otomatis masuk ke Mode Preview
  const handleSelectFile = (fileId: string) => {
    navigateToNote(fileId);
    setMode('PREVIEW');
  };

  const handleNavigateToHeading = (lineIndex: number, text: string) => {
    // If on mobile, close the right sidebar drawer so user can see the content
    if (window.innerWidth < 1024) {
      closeMobileRightSidebar();
    }

    if (mode === 'PREVIEW') {
      previewRef.current?.scrollToHeading(text);
    } else {
      editorRef.current?.scrollToHeading(lineIndex, text);
    }
  };

  const handleLeftHeaderToggle = () => {
    if (window.innerWidth >= 1024) {
      setIsDesktopSidebarOpen((prev) => !prev);
    } else {
      if (isMobileSidebarOpen) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    }
  };

  const handleRightHeaderToggle = () => {
    if (window.innerWidth >= 1024) {
      setIsDesktopRightSidebarOpen((prev) => !prev);
    } else {
      if (isMobileRightSidebarOpen) {
        closeMobileRightSidebar();
      } else {
        openMobileRightSidebar();
      }
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
      className="flex h-full w-full overflow-hidden bg-bg-primary text-[length:var(--text-body-size)] select-text relative"
    >
      {/* 1. DESKTOP LEFT SIDEBAR (Inline collapsible) */}
      <div
        className={`hidden lg:flex flex-col h-full border-r border-border-default bg-bg-surface transition-[width,opacity] duration-200 ease-in-out shrink-0 overflow-hidden ${
          isDesktopSidebarOpen ? 'w-80 xl:w-96 opacity-100' : 'w-0 opacity-0 border-r-0 pointer-events-none'
        }`}
      >
        <LeftSidebar
          vault={vault}
          activeFileId={vault.activeTabId}
          onSelectFile={handleSelectFile}
          onOpenInNewTab={openInNewTab}
          onCreateNote={handleCreateNewNote}
          onCreateFolder={createFolder}
          onRenameNode={updateNodeTitle}
          onMoveNode={moveNode}
          onDeleteNode={deleteNode}
          isOpen={isDesktopSidebarOpen}
          onCloseMobile={() => {}}
        />
      </div>

      {/* 2. MOBILE FULL-SCREEN LEFT DRAWER (Slide dari Kiri ke Kanan) */}
      <div className="lg:hidden">
        {/* Backdrop */}
        <div
          ref={leftBackdropRef}
          onClick={() => closeMobileSidebar()}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 opacity-0 pointer-events-none will-change-[opacity]"
        />

        {/* Fullscreen Drawer Panel */}
        <div
          ref={leftDrawerRef}
          style={{ transform: 'translate3d(-100%, 0, 0)' }}
          className="fixed inset-y-0 left-0 w-full h-full bg-bg-surface z-50 overflow-hidden flex flex-col will-change-transform"
        >
          <LeftSidebar
            vault={vault}
            activeFileId={vault.activeTabId}
            onSelectFile={handleSelectFile}
            onOpenInNewTab={openInNewTab}
            onCreateNote={handleCreateNewNote}
            onCreateFolder={createFolder}
            onRenameNode={updateNodeTitle}
            onMoveNode={moveNode}
            onDeleteNode={deleteNode}
            isOpen={isMobileSidebarOpen}
            onCloseMobile={() => closeMobileSidebar()}
          />
        </div>
      </div>

      {/* 3. CENTER MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Top App Bar / Tab Bar */}
        <header className="flex items-center justify-between bg-bg-surface border-b border-border-default z-10 px-2 h-10 shrink-0">
          {/* Left Controls (Sidebar Toggle + Divider) */}
          <div className="flex items-center shrink-0 pr-1">
            {/* Mobile Left Sidebar Toggle */}
            <button
              type="button"
              onClick={handleLeftHeaderToggle}
              title="Toggle Left Sidebar"
              className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer shrink-0"
            >
              <PanelLeft size={16} />
            </button>

            {/* Desktop Left Sidebar Toggle (Only visible on desktop) */}
            <button
              type="button"
              onClick={handleLeftHeaderToggle}
              title="Toggle Left Sidebar"
              className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer shrink-0"
            >
              <PanelLeft size={16} />
            </button>

            {/* Thin Divider separating Left Sidebar Toggle from Tab Bar */}
            <div className="h-4 w-px bg-border-default ml-1.5 shrink-0" />
          </div>

          {/* Scrollable Tabs Area */}
          <div className="flex items-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth flex-1 min-w-0 h-full px-1.5">
            {(vault.openTabs || []).map((tabId) => {
              const isTabEmpty = tabId.startsWith('empty_');
              const node = !isTabEmpty ? vault.nodes[tabId] : null;
              const tabTitle = isTabEmpty ? 'Tab Baru' : (node?.name || 'Untitled');
              const isActive = vault.activeTabId === tabId;

              return (
                <div
                  key={tabId}
                  onClick={() => {
                    navigateToNote(tabId);
                    if (!isTabEmpty) {
                      setMode('PREVIEW');
                    }
                  }}
                  className={`group flex items-center gap-2 h-8 px-3 text-xs font-medium min-w-[110px] max-w-[170px] shrink-0 cursor-pointer transition-colors relative select-none ${
                    isActive
                      ? 'border-t border-l border-r border-border-default rounded-t-lg bg-bg-primary text-text-primary z-10 before:absolute before:-bottom-px before:left-0 before:right-0 before:h-px before:bg-bg-primary font-semibold shadow-xs'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-hover/60 rounded-t-lg border-t border-l border-r border-transparent'
                  }`}
                >
                  <span className="truncate flex-1">{tabTitle}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tabId);
                    }}
                    title="Tutup Tab"
                    className="w-4 h-4 flex items-center justify-center rounded-xs hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0 opacity-70 group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}

            {/* Add New Tab Button (+) */}
            <div className="flex items-center h-8 shrink-0">
              <button
                type="button"
                onClick={() => openInNewTab(null)}
                title="Buka Tab Baru"
                className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0 cursor-pointer"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* Right Controls (Divider + Mode Switcher + Right Sidebar Toggle) */}
          <div className="flex items-center gap-1 shrink-0 pl-1">
            {/* Thin Divider separating Tab Bar from Right Controls */}
            <div className="h-4 w-px bg-border-default mr-1 shrink-0" />

            {/* Desktop Mode Switcher */}
            {activeNode && (
              <>
                <div className="hidden lg:flex items-center">
                  <ModeSwitcher mode={mode} setMode={handleModeChange} variant="inline" />
                </div>
                <div className="hidden lg:block h-4 w-px bg-border-default mx-1 shrink-0" />
              </>
            )}

            <button
              type="button"
              onClick={handleRightHeaderToggle}
              title="Toggle Right Sidebar"
              className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer shrink-0"
            >
              <PanelRight size={16} />
            </button>
          </div>
        </header>

        {/* Center Canvas */}
        {!activeNode ? (
          /* Empty State */
          <EmptyState onCreateNote={() => handleCreateNewNote(null)} />
        ) : (
          /* Active Note Editor */
          <main className="flex-1 overflow-hidden relative flex flex-col">
            <div className={`flex-none ${mode === 'PREVIEW' ? 'hidden' : 'block'}`}>
              <Toolbar />
            </div>

            <div className="flex-1 overflow-hidden relative">
              {/* Preview Mode */}
              <div className={`absolute inset-0 ${mode === 'PREVIEW' ? 'block' : 'hidden'}`}>
                <PreviewPane
                  ref={previewRef}
                  title={currentTitle}
                  content={currentContent}
                  nodes={vault.nodes}
                  onDoubleClick={() => handleModeChange('LIVE_EDIT')}
                  onChange={handleContentChange}
                  onWikilinkClick={handleWikilinkClick}
                />
              </div>

              {/* Edit Modes (Source / Live Edit) */}
              <div className={`absolute inset-0 ${mode !== 'PREVIEW' ? 'block' : 'hidden'}`}>
                <EditorCore
                  key={activeNode?.id}
                  ref={editorRef}
                  title={currentTitle}
                  onTitleChange={handleTitleChange}
                  initialContent={currentContent}
                  mode={lastEditMode}
                  nodes={vault.nodes}
                  onChange={handleContentChange}
                  onWikilinkClick={handleWikilinkClick}
                />
              </div>
            </div>

            {/* Floating Mode Switcher Pill (Right Edge Center) - Mobile Only */}
            <ModeSwitcher mode={mode} setMode={handleModeChange} className="lg:hidden" />
          </main>
        )}
      </div>

      {/* 4. DESKTOP RIGHT SIDEBAR (Inline collapsible) */}
      <div
        className={`hidden lg:flex flex-col h-full border-l border-border-default bg-bg-surface transition-[width,opacity] duration-200 ease-in-out shrink-0 overflow-hidden ${
          isDesktopRightSidebarOpen ? 'w-80 xl:w-96 opacity-100' : 'w-0 opacity-0 border-l-0 pointer-events-none'
        }`}
      >
        <RightSidebar
          isOpen={isDesktopRightSidebarOpen}
          onClose={() => setIsDesktopRightSidebarOpen(false)}
          vault={vault}
          activeNode={activeNode}
          onSelectFile={handleSelectFile}
          onUpdateMetadata={updateNoteMetadata}
          onNavigateToHeading={handleNavigateToHeading}
        />
      </div>

      {/* 5. MOBILE FULL-SCREEN RIGHT DRAWER (Slide dari Kanan ke Kiri persis seperti Left Sidebar) */}
      <div className="lg:hidden">
        {/* Backdrop */}
        <div
          ref={rightBackdropRef}
          onClick={() => closeMobileRightSidebar()}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 opacity-0 pointer-events-none will-change-[opacity]"
        />

        {/* Fullscreen Drawer Panel (Right to Left) */}
        <div
          ref={rightDrawerRef}
          style={{ transform: 'translate3d(100%, 0, 0)' }}
          className="fixed inset-y-0 right-0 w-full h-full bg-bg-surface z-50 overflow-hidden flex flex-col will-change-transform"
        >
          <RightSidebar
            isOpen={isMobileRightSidebarOpen}
            onClose={() => closeMobileRightSidebar()}
            vault={vault}
            activeNode={activeNode}
            onSelectFile={handleSelectFile}
            onUpdateMetadata={updateNoteMetadata}
            onNavigateToHeading={handleNavigateToHeading}
          />
        </div>
      </div>
    </div>
  );
};
