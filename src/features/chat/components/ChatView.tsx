import React, { useRef } from 'react';
import { PanelLeft, SlidersHorizontal } from 'lucide-react';
import { VaultData } from '../../../types/vault';
import { useNavigation } from '../../../context/NavigationContext';

import { ChatHistorySidebar } from './ChatHistorySidebar';
import { ChatSettingsSidebar } from './ChatSettingsSidebar';
import { ChatMessageFeed } from './ChatMessageFeed';
import { ChatInputArea } from './ChatInputArea';
import { useChatLogic } from '../hooks/useChatLogic';

interface ChatViewProps {
  vault: VaultData;
}

export const ChatView: React.FC<ChatViewProps> = ({ vault }) => {
  const { 
    activeTabId, 
    navigateView,
    isMobileSidebarOpen: isLeftSidebarOpen,
    openMobileSidebar,
    closeMobileSidebar,
    isMobileRightSidebarOpen: isRightSidebarOpen,
    openMobileRightSidebar,
    closeMobileRightSidebar
  } = useNavigation();
  
  const {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    messages,
    setMessages,
    input,
    setInput,
    mode,
    setMode,
    topK,
    setTopK,
    isProcessing,
    renderedHtmlMap,
    expandedContexts,
    messagesEndRef,
    textareaRef,
    activeNode,
    ragEnabledCount,
    handleSend,
    handleNewChat,
    toggleContextInspector
  } = useChatLogic(vault, activeTabId);

  // Touch Swipe Reference
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Touch Gesture Handling (Slide to Open/Close)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;

    const startX = touchStartRef.current.x;
    const startY = touchStartRef.current.y;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        if (isRightSidebarOpen) {
          closeMobileRightSidebar();
        } else if (!isLeftSidebarOpen) {
          openMobileSidebar();
        }
      } else {
        if (isLeftSidebarOpen) {
          closeMobileSidebar();
        } else if (!isRightSidebarOpen) {
          openMobileRightSidebar();
        }
      }
    }

    touchStartRef.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full flex flex-row bg-bg-primary text-text-primary select-text relative overflow-hidden"
    >
      {/* ========================================================================= */}
      {/* BACKDROP OVERLAYS FOR OVERLAY SIDEBARS */}
      {/* ========================================================================= */}
      {isLeftSidebarOpen && (
        <div
          onClick={() => closeMobileSidebar()}
          className="absolute inset-0 bg-black/30 backdrop-blur-xs z-30 transition-opacity duration-300 cursor-pointer"
        />
      )}
      {isRightSidebarOpen && (
        <div
          onClick={() => closeMobileRightSidebar()}
          className="absolute inset-0 bg-black/30 backdrop-blur-xs z-30 transition-opacity duration-300 cursor-pointer"
        />
      )}

      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR (FOLDER TREE CHAT HISTORY - OVERLAY LAYER) */}
      {/* ========================================================================= */}
      <ChatHistorySidebar
        isOpen={isLeftSidebarOpen}
        onClose={closeMobileSidebar}
        sessions={sessions}
        activeSessionId={activeSessionId}
        setActiveSessionId={setActiveSessionId}
        setSessions={setSessions}
        setMessages={setMessages}
        onNewChat={handleNewChat}
      />

      {/* ========================================================================= */}
      {/* 2. MAIN CHAT AREA (FULL WIDTH STABLE CANVAS) */}
      {/* ========================================================================= */}
      <main className="flex-1 h-full w-full flex flex-col relative min-w-0">
        {/* Floating Header Actions */}
        <div className="absolute top-3 inset-x-0 z-20 pointer-events-none flex items-center justify-between px-4">
          {/* Left Floating Pill (History Toggle + Title) */}
          <button
            type="button"
            onClick={() => {
              if (isLeftSidebarOpen) {
                closeMobileSidebar();
              } else {
                openMobileSidebar();
              }
              if (isRightSidebarOpen) closeMobileRightSidebar();
            }}
            title="Riwayat Percakapan"
            className="pointer-events-auto flex items-center gap-2 p-1.5 px-3 rounded-full bg-bg-surface/85 backdrop-blur-md border border-border-default shadow-xs hover:bg-bg-hover text-text-muted hover:text-text-primary transition-all cursor-pointer"
          >
            <PanelLeft size={16} />
            <span className="text-xs font-semibold text-text-heading truncate max-w-[140px] sm:max-w-xs">
              {activeSession ? activeSession.title : 'Chat Baru'}
            </span>
          </button>

          {/* Right Floating Button (Context & Settings) */}
          <button
            type="button"
            onClick={() => {
              if (isRightSidebarOpen) {
                closeMobileRightSidebar();
              } else {
                openMobileRightSidebar();
              }
              if (isLeftSidebarOpen) closeMobileSidebar();
            }}
            title="Pengaturan Chat"
            className="pointer-events-auto p-2 rounded-full bg-bg-surface/85 backdrop-blur-md border border-border-default shadow-xs hover:bg-bg-hover text-text-muted hover:text-text-primary transition-all cursor-pointer"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Messages Container */}
        <ChatMessageFeed
          messages={messages}
          renderedHtmlMap={renderedHtmlMap}
          expandedContexts={expandedContexts}
          toggleContextInspector={toggleContextInspector}
          messagesEndRef={messagesEndRef}
          mode={mode}
          activeNodeName={activeNode?.name}
        />

        {/* FLOATING INPUT AREA */}
        <ChatInputArea
          input={input}
          setInput={setInput}
          isProcessing={isProcessing}
          onSend={() => handleSend()}
          textareaRef={textareaRef}
          placeholder={
            mode === 'rag'
              ? 'Tanyakan apa saja tentang catatan Anda atau topik umum...'
              : activeNode
              ? `Tanyakan sesuatu tentang "${activeNode.name}"...`
              : 'Buka catatan untuk bertanya pada catatan aktif...'
          }
        />
      </main>

      {/* ========================================================================= */}
      {/* 3. RIGHT SIDEBAR (CHAT SETTINGS ONLY - OVERLAY LAYER) */}
      {/* ========================================================================= */}
      <ChatSettingsSidebar
        isOpen={isRightSidebarOpen}
        onClose={closeMobileRightSidebar}
        mode={mode}
        setMode={setMode}
        topK={topK}
        setTopK={setTopK}
        ragEnabledCount={ragEnabledCount}
        activeNodeName={activeNode?.name}
      />
    </div>
  );
};
