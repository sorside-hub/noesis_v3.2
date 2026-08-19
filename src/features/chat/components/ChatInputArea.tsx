import React from 'react';
import { Send } from 'lucide-react';

interface ChatInputAreaProps {
  input: string;
  setInput: (val: string) => void;
  isProcessing: boolean;
  onSend: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  placeholder: string;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  input,
  setInput,
  isProcessing,
  onSend,
  textareaRef,
  placeholder
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="shrink-0 w-full px-4 pb-4 lg:pb-6 pt-2 bg-gradient-to-t from-bg-primary via-bg-primary/90 to-transparent">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 bg-bg-surface border border-border-default focus-within:border-accent-primary rounded-2xl p-2 px-4 shadow-md transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent border-0 outline-hidden text-sm text-text-primary placeholder:text-text-muted resize-none max-h-32 py-1.5 font-sans"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim() || isProcessing}
            className="p-2.5 rounded-xl bg-text-primary text-bg-surface hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
