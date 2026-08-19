import React, { useState, useRef, useEffect } from 'react';
import {
  Folder,
  Plus,
  Pin,
  MessageSquare,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Clock,
  Calendar,
  PinOff,
  Pencil,
  Trash2
} from 'lucide-react';
import { ChatSessionRecord, ChatMessageRecord } from '../../../lib/db';
import {
  deleteChatSession,
  togglePinChatSession,
  renameChatSession
} from '../services/chatStorage';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSessionRecord[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  setSessions: React.Dispatch<React.SetStateAction<ChatSessionRecord[]>>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessageRecord[]>>;
  onNewChat: () => void;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  setActiveSessionId,
  setSessions,
  setMessages,
  onNewChat
}) => {
  // Folder Collapsed States
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Editing session title
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Context Menu Popup State
  const [contextMenu, setContextMenu] = useState<{
    session: ChatSessionRecord;
    x: number;
    y: number;
  } | null>(null);

  // Long-press timer
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const toggleFolder = (folderKey: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderKey]: !prev[folderKey],
    }));
  };

  const handleDeleteSession = async (sessId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setContextMenu(null);

    try {
      await deleteChatSession(sessId);
      setSessions((prev) => {
        const updated = prev.filter((s) => s.id !== sessId);
        if (activeSessionId === sessId) {
          if (updated.length > 0) {
            setActiveSessionId(updated[0].id);
          } else {
            setActiveSessionId(null);
            setMessages([]);
          }
        }
        return updated;
      });
    } catch (err) {
      console.error('Failed to delete chat session:', err);
    }
  };

  const handleTogglePin = async (sess: ChatSessionRecord, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const newPinned = !sess.isPinned;
    await togglePinChatSession(sess.id, newPinned);
    setSessions((prev) =>
      prev.map((s) => (s.id === sess.id ? { ...s, isPinned: newPinned } : s))
    );
    setContextMenu(null);
  };

  const handleStartRename = (sess: ChatSessionRecord, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingSessionId(sess.id);
    setEditingTitle(sess.title);
    setContextMenu(null);
  };

  const handleSaveRename = async (sessId: string, customTitle?: string) => {
    const titleToSave = (customTitle !== undefined ? customTitle : editingTitle).trim();
    if (!titleToSave) {
      setEditingSessionId(null);
      return;
    }

    await renameChatSession(sessId, titleToSave);
    setSessions((prev) =>
      prev.map((s) => (s.id === sessId ? { ...s, title: titleToSave } : s))
    );
    setEditingSessionId(null);
  };

  const handleItemTouchStart = (sess: ChatSessionRecord, e: React.TouchEvent) => {
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({
        session: sess,
        x: Math.min(clientX, window.innerWidth - 180),
        y: Math.min(clientY, window.innerHeight - 150),
      });
    }, 450);
  };

  const handleItemTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenu = (sess: ChatSessionRecord, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      session: sess,
      x: Math.min(e.clientX, window.innerWidth - 180),
      y: Math.min(e.clientY, window.innerHeight - 150),
    });
  };

  // Time Grouping Helper
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;

  const pinnedSessions = sessions.filter((s) => s.isPinned);
  const unpinnedSessions = sessions.filter((s) => !s.isPinned);

  const todaySessions = unpinnedSessions.filter(
    (s) => new Date(s.updatedAt).getTime() >= todayStart
  );
  const last7DaysSessions = unpinnedSessions.filter((s) => {
    const t = new Date(s.updatedAt).getTime();
    return t < todayStart && t >= sevenDaysAgo;
  });
  const olderSessions = unpinnedSessions.filter(
    (s) => new Date(s.updatedAt).getTime() < sevenDaysAgo
  );

  const renderSessionItem = (sess: ChatSessionRecord) => {
    const isActive = sess.id === activeSessionId;
    const isEditing = sess.id === editingSessionId;

    return (
      <div
        key={sess.id}
        onClick={() => {
          setActiveSessionId(sess.id);
          onClose();
        }}
        onContextMenu={(e) => handleContextMenu(sess, e)}
        onTouchStart={(e) => handleItemTouchStart(sess, e)}
        onTouchEnd={handleItemTouchEnd}
        onTouchMove={handleItemTouchEnd}
        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer select-none ${
          isActive
            ? 'bg-bg-hover text-text-heading font-semibold shadow-2xs'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover/60'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {sess.isPinned ? (
            <Pin size={13} className="shrink-0 text-amber-500 fill-amber-500/20" />
          ) : (
            <MessageSquare size={13} className="shrink-0 text-text-muted" />
          )}

          {isEditing ? (
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveRename(sess.id);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditingSessionId(null);
                }
              }}
              onBlur={() => handleSaveRename(sess.id)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="w-full bg-bg-primary border border-border-default rounded px-1.5 py-0.5 text-xs text-text-primary outline-hidden"
            />
          ) : (
            <span className="truncate">{sess.title}</span>
          )}
        </div>

        {/* 3-dots popup trigger button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setContextMenu({
              session: sess,
              x: Math.min(e.clientX, window.innerWidth - 180),
              y: Math.min(e.clientY, window.innerHeight - 150),
            });
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:text-text-primary text-text-muted rounded cursor-pointer transition-opacity"
        >
          <MoreVertical size={13} />
        </button>
      </div>
    );
  };

  return (
    <>
      {/* POPUP CONTEXT MENU (PIN, RENAME, DELETE) */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-44 bg-bg-surface border border-border-default rounded-xl p-1 shadow-xl space-y-0.5 text-xs font-sans animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            onClick={(e) => handleTogglePin(contextMenu.session, e)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-text-primary hover:bg-bg-hover transition-colors cursor-pointer text-left"
          >
            {contextMenu.session.isPinned ? (
              <>
                <PinOff size={14} className="text-text-muted" />
                <span>Batal Sematkan</span>
              </>
            ) : (
              <>
                <Pin size={14} className="text-amber-500" />
                <span>Sematkan Chat</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => handleStartRename(contextMenu.session, e)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-text-primary hover:bg-bg-hover transition-colors cursor-pointer text-left"
          >
            <Pencil size={14} className="text-text-muted" />
            <span>Ubah Nama</span>
          </button>

          <div className="h-px bg-border-subtle my-0.5" />

          <button
            type="button"
            onClick={(e) => handleDeleteSession(contextMenu.session.id, e)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer text-left font-medium"
          >
            <Trash2 size={14} />
            <span>Hapus Chat</span>
          </button>
        </div>
      )}

      {/* 1. LEFT SIDEBAR (FOLDER TREE CHAT HISTORY - OVERLAY LAYER) */}
      <aside
        className={`absolute inset-y-0 left-0 w-72 max-w-[80vw] bg-bg-surface border-r border-border-default flex flex-col transition-transform duration-300 ease-out z-40 shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Left Sidebar */}
        <div className="h-14 px-4 border-b border-border-default flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <Folder size={14} className="text-text-secondary" /> Vault Chat Tree
          </span>
          <button
            type="button"
            onClick={onNewChat}
            title="Percakapan Baru"
            className="p-1.5 rounded-lg bg-bg-primary hover:bg-bg-hover border border-border-default text-text-primary transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium shadow-2xs"
          >
            <Plus size={14} />
            <span>Baru</span>
          </button>
        </div>

        {/* Folder Tree Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* 1. PINNED CATEGORY */}
          {pinnedSessions.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => toggleFolder('pinned')}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-amber-500 hover:text-amber-600 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Pin size={12} className="fill-amber-500/20" /> Disematkan ({pinnedSessions.length})
                </span>
                {collapsedFolders['pinned'] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              </button>

              {!collapsedFolders['pinned'] && (
                <div className="pl-1.5 border-l-2 border-amber-500/30 ml-2 space-y-0.5">
                  {pinnedSessions.map(renderSessionItem)}
                </div>
              )}
            </div>
          )}

          {/* 2. TODAY CATEGORY */}
          {todaySessions.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => toggleFolder('today')}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock size={12} /> Hari Ini ({todaySessions.length})
                </span>
                {collapsedFolders['today'] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              </button>

              {!collapsedFolders['today'] && (
                <div className="pl-1.5 border-l-2 border-border-default ml-2 space-y-0.5">
                  {todaySessions.map(renderSessionItem)}
                </div>
              )}
            </div>
          )}

          {/* 3. LAST 7 DAYS CATEGORY */}
          {last7DaysSessions.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => toggleFolder('last7')}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar size={12} /> 7 Hari Terakhir ({last7DaysSessions.length})
                </span>
                {collapsedFolders['last7'] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              </button>

              {!collapsedFolders['last7'] && (
                <div className="pl-1.5 border-l-2 border-border-default ml-2 space-y-0.5">
                  {last7DaysSessions.map(renderSessionItem)}
                </div>
              )}
            </div>
          )}

          {/* 4. OLDER CATEGORY */}
          {olderSessions.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => toggleFolder('older')}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Folder size={12} /> Lebih Lama ({olderSessions.length})
                </span>
                {collapsedFolders['older'] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              </button>

              {!collapsedFolders['older'] && (
                <div className="pl-1.5 border-l-2 border-border-default ml-2 space-y-0.5">
                  {olderSessions.map(renderSessionItem)}
                </div>
              )}
            </div>
          )}

          {sessions.length === 0 && (
            <div className="py-8 text-center text-xs text-text-muted leading-relaxed">
              Belum ada riwayat percakapan.<br />Pesan Anda akan tersimpan di sini setelah terkirim.
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
