import React from 'react';
import { BrainCircuit, Loader2, BookOpen, Eye, ChevronDown, ChevronRight, Layers, ExternalLink } from 'lucide-react';
import { ChatMessageRecord } from '../../../lib/db';
import { ChatMode } from '../hooks/useChatLogic';
import { useNavigation } from '../../../context/NavigationContext';

interface ChatMessageFeedProps {
  messages: ChatMessageRecord[];
  renderedHtmlMap: Record<string, string>;
  expandedContexts: Record<string, boolean>;
  toggleContextInspector: (msgId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  mode: ChatMode;
  activeNodeName?: string;
}

export const ChatMessageFeed: React.FC<ChatMessageFeedProps> = ({
  messages,
  renderedHtmlMap,
  expandedContexts,
  toggleContextInspector,
  messagesEndRef,
  mode,
  activeNodeName
}) => {
  const { navigateToNote, navigateView } = useNavigation();

  return (
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
                  : activeNodeName
                  ? `AI berfokus menjawab berdasarkan isi catatan "${activeNodeName}".`
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
  );
};
