import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Trash2, 
  BookOpen, 
  MessageSquare, 
  Loader2, 
  Plus, 
  PanelLeft, 
  PanelRight, 
  Pencil, 
  Check, 
  X, 
  Sparkles, 
  Layers, 
  SlidersHorizontal,
  ExternalLink,
  Pin,
  PinOff,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Clock,
  Calendar,
  Folder,
  BrainCircuit,
  Eye
} from 'lucide-react';
import { VaultData, FileNode } from '../../../types/vault';
import { useNavigation } from '../../../context/NavigationContext';
import { renderMarkdown } from '../../../lib/editor/markdownRenderer';
import { RAGPipeline, SearchResultChunk } from '../../rag/services/ragPipeline';
import { executeWithFailover } from '../../../lib/ai/failoverAdapter';
import { balancedCascade, speedCascade } from '../../../lib/ai/cascadeProfiles';
import { getAllLocalKeyOverrides } from '../../../lib/ai/keyManager';
import { ChatSessionRecord, ChatMessageRecord } from '../../../lib/db';
import { 
  getAllChatSessions, 
  createChatSession, 
  renameChatSession, 
  deleteChatSession, 
  togglePinChatSession,
  getSessionMessages, 
  saveChatMessage 
} from '../services/chatStorage';

export type ChatMode = 'rag' | 'current';
type QueryIntent = 'CHITCHAT' | 'GENERAL' | 'VAULT';

interface ChatViewProps {
  vault: VaultData;
}

// Ultra-Fast Intent Classifier using Pair 2 (analyzer) + speedCascade
async function classifyQueryIntent(
  query: string,
  customKeys: Record<string, string>
): Promise<QueryIntent> {
  const qLower = query.toLowerCase().trim();
  
  // Fast rule-based checks for instant zero-latency response on basic greetings
  if (/^(halo|hai|hi|hello|pagi|siang|malam|terima kasih|makasih|thanks|ok|oke|siap|siapa kamu\??|bisa bantu apa\??)$/i.test(qLower)) {
    return 'CHITCHAT';
  }

  // Explicit vault keywords
  if (/(catatan|vault|file|dokumen|rangkuman catatan|isi catatan|di catatan saya|nota|catatanku)/i.test(qLower)) {
    return 'VAULT';
  }

  try {
    const prompt = `Tugas Anda adalah mengklasifikasikan niat (intent) dari pertanyaan pengguna ke dalam SATU kategori berikut:

1. "CHITCHAT": Sapaan, basa-basi, ucapan terima kasih, atau pertanyaan seputar identitas AI.
2. "VAULT": Pertanyaan yang secara khusus meminta informasi dari catatan, dokumen, atau memori pribadi pengguna di Vault.
3. "GENERAL": Pertanyaan pengetahuan umum, pemrograman/coding, sains, matematika, sejarah, penerjemahan, resep umum, saran, atau pembuatan konten umum.

Pertanyaan Pengguna: "${query}"

Respon HANYA dengan salah satu kata ini (tanpa tanda baca atau penjelasan): CHITCHAT, VAULT, atau GENERAL.`;

    const result = await executeWithFailover(
      {
        pair: 'analyzer',
        cascade: speedCascade,
        customKeys,
      },
      async (aiClient, _slotId, _role, model) => {
        const res = await aiClient.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.0,
          },
        });
        return res.text?.trim() || 'GENERAL';
      }
    );

    if (result.success && result.data) {
      const tag = result.data.toUpperCase();
      if (tag.includes('CHITCHAT')) return 'CHITCHAT';
      if (tag.includes('VAULT')) return 'VAULT';
      if (tag.includes('GENERAL')) return 'GENERAL';
    }
  } catch (err) {
    console.warn('Intent classification fallback to GENERAL:', err);
  }

  return 'GENERAL';
}

export const ChatView: React.FC<ChatViewProps> = ({ vault }) => {
  const { activeTabId, navigateToNote, navigateView } = useNavigation();
  
  // Sidebars open states
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  // Sessions & Messages State
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);

  // Folder Collapsed States
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Context Inspector Expand States per Message ID
  const [expandedContexts, setExpandedContexts] = useState<Record<string, boolean>>({});

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

  // Input & Settings
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ChatMode>('rag');
  const [topK, setTopK] = useState<number>(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [renderedHtmlMap, setRenderedHtmlMap] = useState<Record<string, string>>({});

  // Touch Swipe Reference
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeNode = activeTabId && vault.nodes[activeTabId] ? (vault.nodes[activeTabId] as FileNode) : null;
  const allNodes = Object.values(vault.nodes) as FileNode[];
  const ragEnabledCount = allNodes.filter((n) => n.type === 'file' && n.metadata?.includeInAiRag === true).length;

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
          setIsRightSidebarOpen(false);
        } else if (!isLeftSidebarOpen) {
          setIsLeftSidebarOpen(true);
        }
      } else {
        if (isLeftSidebarOpen) {
          setIsLeftSidebarOpen(false);
        } else if (!isRightSidebarOpen) {
          setIsRightSidebarOpen(true);
        }
      }
    }

    touchStartRef.current = null;
  };

  // Auto-scroll messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat sessions on mount (Clean up empty sessions)
  const loadSessions = async () => {
    try {
      const list = await getAllChatSessions();
      const validSessions: ChatSessionRecord[] = [];
      for (const sess of list) {
        const msgs = await getSessionMessages(sess.id);
        if (msgs.length > 0) {
          validSessions.push(sess);
        } else {
          await deleteChatSession(sess.id);
        }
      }

      setSessions(validSessions);
      if (validSessions.length > 0) {
        setActiveSessionId(validSessions[0].id);
      } else {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Load messages when activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    let isMounted = true;

    const loadMsgs = async () => {
      const msgs = await getSessionMessages(activeSessionId);
      if (isMounted) {
        setMessages(msgs);
      }
    };

    loadMsgs();
    return () => {
      isMounted = false;
    };
  }, [activeSessionId]);

  // Render markdown for assistant messages
  useEffect(() => {
    let isMounted = true;
    const processMarkdown = async () => {
      const newMap: Record<string, string> = {};
      for (const msg of messages) {
        if (msg.role === 'assistant' && msg.content) {
          try {
            const html = await renderMarkdown(msg.content, vault.nodes);
            newMap[msg.id] = html;
          } catch (err) {
            newMap[msg.id] = `<p>${msg.content}</p>`;
          }
        }
      }
      if (isMounted) {
        setRenderedHtmlMap(newMap);
      }
    };

    processMarkdown();
    return () => {
      isMounted = false;
    };
  }, [messages, vault.nodes]);

  // Toggle Folder Section Collapse
  const toggleFolder = (folderKey: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderKey]: !prev[folderKey],
    }));
  };

  // Toggle Context Inspector Accordion per Message
  const toggleContextInspector = (msgId: string) => {
    setExpandedContexts((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Start new clean chat
  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setIsLeftSidebarOpen(false);
  };

  // Delete chat session
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

  // Toggle Pin Chat Session
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

  // Start renaming session
  const handleStartRename = (sess: ChatSessionRecord, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingSessionId(sess.id);
    setEditingTitle(sess.title);
    setContextMenu(null);
  };

  // Save session title
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

  // Long-press detection helpers
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

  // Send Message Logic with Smart Intent Classification
  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isProcessing) return;

    setInput('');
    setIsProcessing(true);

    let currentSessionId = activeSessionId;
    let isNewSessionCreated = false;

    if (!currentSessionId) {
      const autoTitle = query.length > 25 ? query.substring(0, 25) + '...' : query;
      const newSess = await createChatSession(autoTitle);
      currentSessionId = newSess.id;
      setActiveSessionId(newSess.id);
      setSessions((prev) => [newSess, ...prev]);
      isNewSessionCreated = true;
    }

    const userMsgId = `msg_${Date.now()}_usr`;
    const userMsg: ChatMessageRecord = {
      id: userMsgId,
      sessionId: currentSessionId,
      role: 'user',
      content: query,
      createdAt: new Date().toISOString(),
    };

    const aiMsgId = `msg_${Date.now() + 1}_ai`;
    const aiMsg: ChatMessageRecord = {
      id: aiMsgId,
      sessionId: currentSessionId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    await saveChatMessage(userMsg);
    setMessages((prev) => [...prev, userMsg, aiMsg]);

    const currentSession = sessions.find((s) => s.id === currentSessionId);
    if (!isNewSessionCreated && currentSession && currentSession.title === 'Percakapan Baru' && messages.length === 0) {
      const autoTitle = query.length > 25 ? query.substring(0, 25) + '...' : query;
      await renameChatSession(currentSessionId, autoTitle);
      setSessions((prev) =>
        prev.map((s) => (s.id === currentSessionId ? { ...s, title: autoTitle } : s))
      );
    }

    try {
      const customKeys = getAllLocalKeyOverrides();

      // Step 1: Run Smart Classifier via Pair 2 (analyzer) + speedCascade
      const intent = await classifyQueryIntent(query, customKeys);

      let contextText = '';
      let sources: Array<{ noteId: string; noteTitle: string }> = [];
      let chunksToSave: Array<{ noteId: string; noteTitle: string; snippet: string }> = [];

      if (mode === 'rag') {
        if (intent !== 'CHITCHAT') {
          // Perform RAG search
          const pipeline = new RAGPipeline(customKeys);
          const results = await pipeline.searchSimilarChunks(query, topK);

          // For GENERAL intent, filter out low-relevance noise chunks (< 0.2 score)
          const filteredResults = intent === 'GENERAL'
            ? results.filter((r) => r.score >= 0.20)
            : results;

          if (filteredResults.length > 0) {
            contextText = filteredResults
              .map((r, idx) => `[Catatan "${r.noteTitle}"]:\n${r.snippet}`)
              .join('\n\n');

            const uniqueSourceMap = new Map<string, string>();
            filteredResults.forEach((r) => {
              uniqueSourceMap.set(r.noteId, r.noteTitle);
            });
            sources = Array.from(uniqueSourceMap.entries()).map(([noteId, noteTitle]) => ({
              noteId,
              noteTitle,
            }));

            chunksToSave = filteredResults.map((r) => ({
              noteId: r.noteId,
              noteTitle: r.noteTitle,
              snippet: r.snippet,
            }));
          }
        }
      } else {
        // Catatan Aktif Mode
        if (activeNode && activeNode.content) {
          contextText = `[Catatan Aktif "${activeNode.name}"]:\n${activeNode.content}`;
          sources = [{ noteId: activeNode.id, noteTitle: activeNode.name }];
          chunksToSave = [
            {
              noteId: activeNode.id,
              noteTitle: activeNode.name,
              snippet: activeNode.content.substring(0, 300) + '...',
            },
          ];
        }
      }

      // Step 2: Build Flexible Prompt based on Intent
      let prompt = '';
      if (intent === 'CHITCHAT') {
        prompt = `Pengguna mengirim pesan sapaan atau obrolan santai: "${query}"
Jawablah secara ramah, hangat, dan menyenangkan dalam Bahasa Indonesia. Tawarkan bantuan untuk menjawab pertanyaan tentang catatan Vault Anda atau pengetahuan umum lainnya.`;
      } else if (contextText) {
        prompt = `KONTEKS CATATAN VAULT PENGGUNA:
---
${contextText}
---

PERTANYAAN PENGGUNA:
${query}

INSTRUKSI PENTING:
- Gunakan konteks catatan di atas sebagai rujukan utama jika relevan.
- Jika konteks catatan mencukupi, utamakan jawaban berdasarkan catatan tersebut.
- Jika konteks catatan hanya memberikan sebagian informasi, padukan secara fleksibel dengan pengetahuan umum AI Anda.
- Jawab dengan ramah, lugas, dan terstruktur menggunakan format Markdown yang rapi dalam Bahasa Indonesia.`;
      } else {
        prompt = `PERTANYAAN PENGGUNA:
${query}

INSTRUKSI PENTING:
- Jawab pertanyaan pengguna secara lengkap, cerdas, akurat, dan bermanfaat menggunakan pengetahuan umum AI Anda.
- Gunakan Bahasa Indonesia yang ramah, profesional, dan mudah dipahami dengan format Markdown yang rapi.
- Jangan pernah mengatakan "Catatan tidak ditemukan" kecuali jika pengguna secara khusus meminta mencari catatan spesifik yang tidak ada.`;
      }

      // Step 3: Stream response via Pair 1 (chat) + balancedCascade
      const failoverResult = await executeWithFailover(
        {
          pair: 'chat',
          cascade: balancedCascade,
          customKeys,
        },
        async (aiClient, _slotId, _role, model) => {
          const responseStream = await aiClient.models.generateContentStream({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              temperature: 0.3,
            },
          });

          let fullContent = '';
          for await (const chunk of responseStream) {
            const textChunk = chunk.text;
            if (textChunk) {
              fullContent += textChunk;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId ? { ...msg, content: fullContent } : msg
                )
              );
            }
          }
          return fullContent;
        }
      );

      const finalContent = failoverResult.success
        ? failoverResult.data || 'Jawaban tidak dapat dibuat.'
        : '⚠️ Maaf, gagal menghubungkan ke Gemini AI. Mohon periksa API Key Anda di menu Settings.';

      const finalAiMsg: ChatMessageRecord = {
        ...aiMsg,
        content: finalContent,
        sources,
        chunks: chunksToSave,
      };

      await saveChatMessage(finalAiMsg);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === aiMsgId ? finalAiMsg : msg))
      );
    } catch (err) {
      console.error('Chat error:', err);
      const errAiMsg: ChatMessageRecord = {
        ...aiMsg,
        content: '⚠️ Terjadi kesalahan saat memproses jawaban AI.',
      };
      await saveChatMessage(errAiMsg);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === aiMsgId ? errAiMsg : msg))
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);

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

  // Folder Tree Item Renderer
  const renderSessionItem = (sess: ChatSessionRecord) => {
    const isActive = sess.id === activeSessionId;
    const isEditing = sess.id === editingSessionId;

    return (
      <div
        key={sess.id}
        onClick={() => {
          setActiveSessionId(sess.id);
          setIsLeftSidebarOpen(false);
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
          onClick={() => setIsLeftSidebarOpen(false)}
          className="absolute inset-0 bg-black/30 backdrop-blur-xs z-30 transition-opacity duration-300 cursor-pointer"
        />
      )}
      {isRightSidebarOpen && (
        <div
          onClick={() => setIsRightSidebarOpen(false)}
          className="absolute inset-0 bg-black/30 backdrop-blur-xs z-30 transition-opacity duration-300 cursor-pointer"
        />
      )}

      {/* ========================================================================= */}
      {/* POPUP CONTEXT MENU (PIN, RENAME, DELETE) */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR (FOLDER TREE CHAT HISTORY - OVERLAY LAYER) */}
      {/* ========================================================================= */}
      <aside
        className={`absolute inset-y-0 left-0 w-72 max-w-[80vw] bg-bg-surface border-r border-border-default flex flex-col transition-transform duration-300 ease-out z-40 shadow-2xl ${
          isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Left Sidebar */}
        <div className="h-14 px-4 border-b border-border-default flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <Folder size={14} className="text-text-secondary" /> Vault Chat Tree
          </span>
          <button
            type="button"
            onClick={handleNewChat}
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
              setIsLeftSidebarOpen(!isLeftSidebarOpen);
              if (isRightSidebarOpen) setIsRightSidebarOpen(false);
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
              setIsRightSidebarOpen(!isRightSidebarOpen);
              if (isLeftSidebarOpen) setIsLeftSidebarOpen(false);
            }}
            title="Pengaturan Chat"
            className="pointer-events-auto p-2 rounded-full bg-bg-surface/85 backdrop-blur-md border border-border-default shadow-xs hover:bg-bg-hover text-text-muted hover:text-text-primary transition-all cursor-pointer"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 pt-14 pb-6">
          <div className="max-w-3xl mx-auto space-y-8 pb-10">
            {messages.length === 0 ? (
              <div className="py-12 md:py-20 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-bg-surface border border-border-default flex items-center justify-center shadow-xs">
                  <BrainCircuit className="w-7 h-7 text-accent-primary" />
                </div>

                <div className="space-y-1.5 max-w-md">
                  <h2 className="text-lg font-bold text-text-heading">
                    Smart Vault AI
                  </h2>
                  <p className="text-xs md:text-sm text-text-muted leading-relaxed">
                    {mode === 'rag'
                      ? 'AI cerdas yang siap menjawab pertanyaan seputar catatan Anda maupun pengetahuan umum dunia.'
                      : activeNode
                      ? `AI berfokus menjawab berdasarkan isi catatan "${activeNode.name}".`
                      : 'Buka catatan atau gunakan Smart Vault AI untuk mulai bertanya.'}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="w-full space-y-3">
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="bg-bg-surface border border-border-default text-text-primary rounded-2xl px-4 py-2.5 max-w-[85%] sm:max-w-[75%] shadow-xs text-sm font-sans leading-relaxed break-words">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-3 pt-1">
                      {msg.content ? (
                        <div
                          className="prose dark:prose-invert max-w-none text-text-primary text-sm font-sans leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: renderedHtmlMap[msg.id] || msg.content,
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-text-muted text-xs font-medium">
                          <Loader2 size={14} className="animate-spin text-text-secondary" />
                          <span>Menganalisis pertanyaan & menyusun jawaban...</span>
                        </div>
                      )}

                      {/* Source Citations & Expandable Context Inspector Accordion */}
                      {msg.role === 'assistant' && msg.content && (
                        <div className="mt-3 pt-2.5 border-t border-border-subtle space-y-2">
                          {/* Sources list */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-text-muted font-medium flex items-center gap-1.5">
                                <BookOpen size={13} /> Sumber Rujukan:
                              </span>
                              {msg.sources.map((src, sIdx) => (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => {
                                    navigateToNote(src.noteId);
                                    navigateView('vault');
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-surface hover:bg-bg-hover border border-border-default text-text-secondary hover:text-text-heading transition-colors cursor-pointer text-xs font-medium shadow-2xs"
                                >
                                  <span>{src.noteTitle}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Expandable Context Inspector Accordion Button */}
                          {msg.chunks && msg.chunks.length > 0 && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => toggleContextInspector(msg.id)}
                                className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer py-1 font-medium"
                              >
                                <Eye size={13} />
                                <span>
                                  {expandedContexts[msg.id]
                                    ? 'Sembunyikan Inspeksi Konteks'
                                    : `Inspeksi Konteks Vault (${msg.chunks.length} Chunks)`}
                                </span>
                                {expandedContexts[msg.id] ? (
                                  <ChevronDown size={13} />
                                ) : (
                                  <ChevronRight size={13} />
                                )}
                              </button>

                              {/* Collapsible Context Inspector Content Box */}
                              {expandedContexts[msg.id] && (
                                <div className="mt-2 p-3 bg-bg-surface border border-border-default rounded-xl space-y-2 text-xs animate-in fade-in duration-200">
                                  <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted border-b border-border-subtle pb-1.5">
                                    <span className="flex items-center gap-1.5">
                                      <Layers size={13} /> Potongan Catatan Yang Digunakan AI
                                    </span>
                                    <span>{msg.chunks.length} Chunks</span>
                                  </div>

                                  <div className="space-y-2 pt-1">
                                    {msg.chunks.map((chunk, cIdx) => (
                                      <div
                                        key={cIdx}
                                        className="p-2 bg-bg-primary border border-border-subtle rounded-lg space-y-1"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-semibold text-text-heading truncate text-[11px]">
                                            {chunk.noteTitle}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigateToNote(chunk.noteId);
                                              navigateView('vault');
                                            }}
                                            title="Buka Catatan"
                                            className="text-text-muted hover:text-text-primary shrink-0 cursor-pointer"
                                          >
                                            <ExternalLink size={12} />
                                          </button>
                                        </div>
                                        <p className="text-[11px] text-text-secondary line-clamp-3 leading-relaxed font-mono">
                                          {chunk.snippet}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* FLOATING INPUT AREA */}
        <div className="shrink-0 w-full px-4 pb-4 lg:pb-6 pt-2 bg-gradient-to-t from-bg-primary via-bg-primary/90 to-transparent">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 bg-bg-surface border border-border-default focus-within:border-accent-primary rounded-2xl p-2 px-4 shadow-md transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'rag'
                    ? 'Tanyakan apa saja tentang catatan Anda atau topik umum...'
                    : activeNode
                    ? `Tanyakan sesuatu tentang "${activeNode.name}"...`
                    : 'Buka catatan untuk bertanya pada catatan aktif...'
                }
                rows={1}
                className="flex-1 bg-transparent border-0 outline-hidden text-sm text-text-primary placeholder:text-text-muted resize-none max-h-32 py-1.5 font-sans"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isProcessing}
                className="p-2.5 rounded-xl bg-text-primary text-bg-surface hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. RIGHT SIDEBAR (CHAT SETTINGS ONLY - OVERLAY LAYER) */}
      {/* ========================================================================= */}
      <aside
        className={`absolute inset-y-0 right-0 w-72 max-w-[80vw] bg-bg-surface border-l border-border-default flex flex-col transition-transform duration-300 ease-out z-40 shadow-2xl ${
          isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header Right Sidebar */}
        <div className="h-14 px-4 border-b border-border-default flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <SlidersHorizontal size={14} /> Chat Settings
          </span>
          <button
            type="button"
            onClick={() => setIsRightSidebarOpen(false)}
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
                : activeNode
                ? `Fokus pada "${activeNode.name}".`
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
    </div>
  );
};
