import { useState, useRef, useEffect, useCallback } from 'react';
import { VaultData, FileNode } from '../../../types/vault';
import { renderMarkdown } from '../../../lib/editor/markdownRenderer';
import { RAGPipeline } from '../../rag/services/ragPipeline';
import { executeWithFailover } from '../../../lib/ai/failoverAdapter';
import { balancedCascade, speedCascade } from '../../../lib/ai/cascadeProfiles';
import { getAllLocalKeyOverrides } from '../../../lib/ai/keyManager';
import { ChatSessionRecord, ChatMessageRecord } from '../../../lib/db';
import { 
  getAllChatSessions, 
  createChatSession, 
  renameChatSession, 
  deleteChatSession, 
  getSessionMessages, 
  saveChatMessage 
} from '../services/chatStorage';

export type ChatMode = 'rag' | 'current';
export type QueryIntent = 'CHITCHAT' | 'QUERY';

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

  try {
    const prompt = `Tugas Anda adalah mengklasifikasikan niat (intent) dari pertanyaan pengguna ke dalam SATU kategori berikut:

1. "CHITCHAT": Sapaan murni, basa-basi, atau ucapan terima kasih (tanpa muatan pertanyaan spesifik).
2. "QUERY": Semua jenis pertanyaan lainnya (baik itu pertanyaan umum, koding, sains, maupun pertanyaan tentang catatan pengguna).

Pertanyaan Pengguna: "${query}"

Respon HANYA dengan salah satu kata ini (tanpa tanda baca atau penjelasan): CHITCHAT atau QUERY.`;

    const result = await executeWithFailover<string>(
      {
        pair: 'feature',
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
        return res.text?.trim() || 'QUERY';
      }
    );

    if (result.success && typeof result.data === 'string') {
      const tag = result.data.toUpperCase();
      if (tag.includes('CHITCHAT')) return 'CHITCHAT';
      return 'QUERY';
    }
  } catch (err) {
    console.warn('Intent classification fallback to QUERY:', err);
  }

  return 'QUERY';
}

export function useChatLogic(vault: VaultData, activeTabId: string | null) {
  // Sessions & Messages State
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);

  // Context Inspector Expand States per Message ID
  const [expandedContexts, setExpandedContexts] = useState<Record<string, boolean>>({});

  // Input & Settings
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ChatMode>('rag');
  const [topK, setTopK] = useState<number>(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [renderedHtmlMap, setRenderedHtmlMap] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeNode = activeTabId && vault.nodes[activeTabId] ? (vault.nodes[activeTabId] as FileNode) : null;
  const allNodes = Object.values(vault.nodes) as FileNode[];
  const ragEnabledCount = allNodes.filter((n) => n.type === 'file' && n.metadata?.includeInAiRag === true).length;

  // Auto-scroll messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load chat sessions on mount (Clean up empty sessions)
  const loadSessions = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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

  // Toggle Context Inspector Accordion per Message
  const toggleContextInspector = useCallback((msgId: string) => {
    setExpandedContexts((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  }, []);

  // Start new clean chat
  const handleNewChat = useCallback((onCloseSidebar?: () => void) => {
    setActiveSessionId(null);
    setMessages([]);
    if (onCloseSidebar) {
      onCloseSidebar();
    }
  }, []);

  // Send Message Logic
  const handleSend = useCallback(async (textToSend?: string) => {
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
          // Perform RAG search for ALL queries (Vault-First approach)
          const pipeline = new RAGPipeline(customKeys);
          const results = await pipeline.searchSimilarChunks(query, topK);

          // Filter out low-relevance noise chunks (< 0.20 score) to determine HIT vs MISS
          const filteredResults = results.filter((r) => r.score >= 0.20);

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

      // Step 2: Build Socratic Persona Prompt based on HIT/MISS status
      let prompt = '';
      if (intent === 'CHITCHAT') {
        prompt = `Pengguna mengirim pesan sapaan atau obrolan santai: "${query}"
Jawablah secara ramah, hangat, dan menyenangkan dalam Bahasa Indonesia. Tawarkan bantuan untuk menjadi rekan diskusi atau menjawab pertanyaan terkait catatan Vault pengguna.`;
      } else if (contextText) {
        // HIT: Context Found
        prompt = `Anda adalah 'Rekan Diskusi & Brainstorming' (Second Brain AI) yang cerdas.
Anda bertugas membantu pengguna mengeksplorasi ide, dengan mengacu pada catatan Vault mereka.

INFORMASI DARI VAULT PENGGUNA:
---
${contextText}
---

PERTANYAAN PENGGUNA:
${query}

TUGAS ANDA:
1. Jadikan informasi dari Vault di atas sebagai rujukan utama.
2. Sintesis dan gabungkan informasi tersebut dengan pengetahuan umum Anda secara proporsional. Jangan mendominasi dengan informasi luar jika catatan Vault sudah kuat.
3. Jika ada hubungan konseptual yang menarik antara catatan dan pertanyaan pengguna (meskipun tidak sama persis), tunjukkan "benang merah" atau korelasi tersebut secara natural.
4. Di akhir jawaban, berikan 1 pertanyaan reflektif atau ide lanjutan untuk memancing pengguna melakukan brainstorming lebih dalam.
5. Gunakan Bahasa Indonesia yang ramah, profesional, dan format Markdown yang rapi.`;
      } else {
        // MISS: No Context Found
        prompt = `Anda adalah 'Rekan Diskusi & Brainstorming' (Second Brain AI) yang cerdas.
Anda bertugas membantu pengguna mengeksplorasi ide, dengan mengacu pada catatan Vault mereka.

PERTANYAAN PENGGUNA:
${query}

STATUS VAULT: Tidak ada catatan yang cukup relevan dengan topik ini di Vault pengguna.

TUGAS ANDA:
1. Jawablah secara jujur dan transparan di AWAL kalimat bahwa topik ini belum ada di catatan Vault mereka (contoh: "Di catatan Vault Anda belum ada bahasan tentang [Topik], namun berdasarkan pengetahuan saya...").
2. Jawab pertanyaan pengguna secara komprehensif menggunakan pengetahuan umum Anda.
3. Di akhir jawaban, berikan 1 pertanyaan reflektif untuk memicu diskusi atau menyarankan pengguna untuk mulai mengeksplorasi dan mencatat topik ini di Vault mereka.
4. Gunakan Bahasa Indonesia yang ramah, profesional, dan format Markdown yang rapi.`;
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
  }, [input, isProcessing, activeSessionId, sessions, messages.length, mode, topK, activeNode]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return {
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
  };
}
