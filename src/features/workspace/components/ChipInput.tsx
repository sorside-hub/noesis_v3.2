import React, { useState, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface ChipInputProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  prefix?: string;
  chipColorClass?: string;
  helperText?: string;
}

export const ChipInput: React.FC<ChipInputProps> = ({
  label,
  items,
  onChange,
  placeholder = 'Add...',
  prefix = '',
  chipColorClass = 'bg-blue-500/10 text-accent-primary border-blue-500/20',
  helperText,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commitValue = () => {
    const rawVal = inputRef.current ? inputRef.current.value : inputValue;
    let clean = rawVal.trim();
    if (prefix && clean.startsWith(prefix)) {
      clean = clean.substring(prefix.length).trim();
    }
    if (!clean) return;

    if (!items.includes(clean)) {
      onChange([...items, clean]);
    }
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    
    // Retain focus on this input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const isDelimiter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    return (
      e.key === 'Enter' ||
      e.key === ',' ||
      e.key === 'Tab' ||
      e.code === 'Enter' ||
      e.code === 'NumpadEnter' ||
      e.code === 'Comma' ||
      e.keyCode === 13 ||
      e.keyCode === 188 ||
      e.keyCode === 9 ||
      e.which === 13 ||
      e.which === 188 ||
      e.which === 9
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isDelimiter(e)) {
      e.preventDefault();
      e.stopPropagation();
      commitValue();
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isDelimiter(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleRemove = (itemToRemove: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onChange(items.filter((item) => item !== itemToRemove));
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-[11px] font-semibold text-text-muted tracking-wider uppercase">
          {label}
        </label>
        {helperText && (
          <span className="text-[10px] text-text-muted/70 flex-1 truncate lowercase">
            ({helperText})
          </span>
        )}
      </div>
      <div
        onClick={() => inputRef.current?.focus()}
        className="min-h-[42px] p-2 bg-bg-primary border border-border-default rounded-xl flex flex-wrap gap-1.5 items-center cursor-text transition-colors focus-within:border-accent-primary focus-within:ring-1 focus-within:ring-accent-primary"
      >
        {items.map((item) => (
          <span
            key={item}
            className={twMerge(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
              chipColorClass
            )}
          >
            <span>
              {prefix}
              {item}
            </span>
            <button
              type="button"
              onClick={(e) => handleRemove(item, e)}
              className="hover:text-red-500 rounded-full p-0.5 cursor-pointer"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1 flex-1 min-w-[120px]">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            enterKeyHint="done"
            autoComplete="off"
            placeholder={items.length === 0 ? placeholder : 'Add...'}
            className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none px-1 py-0.5"
          />
          {inputValue && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                commitValue();
              }}
              className="p-1 rounded-md text-accent-primary hover:bg-bg-hover cursor-pointer shrink-0"
            >
              <Plus size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
