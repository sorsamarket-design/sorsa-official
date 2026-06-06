import React, { useEffect, useMemo, useRef, useState } from 'react';

const REVEAL_MS = 800;
const BULLET = '\u2022';

interface TimedPasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}

export function TimedPasswordInput({
  label,
  value,
  onChange,
  placeholder = 'password',
  required,
  autoComplete = 'current-password'
}: TimedPasswordInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cursorRef = useRef<number | null>(null);
  const [visibleUntil, setVisibleUntil] = useState(0);
  const [visibleIndex, setVisibleIndex] = useState<number | null>(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!visibleUntil) return;

    const timeout = window.setTimeout(() => {
      setVisibleIndex(null);
      setVisibleUntil(0);
    }, Math.max(0, visibleUntil - Date.now()));

    return () => window.clearTimeout(timeout);
  }, [visibleUntil]);

  useEffect(() => {
    if (cursorRef.current === null || !inputRef.current) return;

    const cursor = cursorRef.current;
    cursorRef.current = null;
    inputRef.current.setSelectionRange(cursor, cursor);
  }, [value, visibleIndex]);

  useEffect(() => {
    if (!visibleUntil) return;

    const frame = window.setInterval(() => forceTick((tick) => tick + 1), 100);
    return () => window.clearInterval(frame);
  }, [visibleUntil]);

  const displayValue = useMemo(() => {
    const shouldReveal = visibleIndex !== null && Date.now() < visibleUntil;
    return Array.from(value)
      .map((character, index) => (shouldReveal && index === visibleIndex ? character : BULLET))
      .join('');
  }, [value, visibleIndex, visibleUntil]);

  const replaceRange = (text: string) => {
    const input = inputRef.current;
    const selectionStart = input?.selectionStart ?? value.length;
    const selectionEnd = input?.selectionEnd ?? selectionStart;
    const nextValue = value.slice(0, selectionStart) + text + value.slice(selectionEnd);
    const nextCursor = selectionStart + text.length;

    cursorRef.current = nextCursor;
    onChange(nextValue);

    if (text.length > 0) {
      setVisibleIndex(nextCursor - 1);
      setVisibleUntil(Date.now() + REVEAL_MS);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    const selectionStart = input?.selectionStart ?? value.length;
    const selectionEnd = input?.selectionEnd ?? selectionStart;

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      replaceRange(event.key);
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      const deleteStart = selectionStart === selectionEnd ? Math.max(0, selectionStart - 1) : selectionStart;
      const nextValue = value.slice(0, deleteStart) + value.slice(selectionEnd);
      cursorRef.current = deleteStart;
      setVisibleIndex(null);
      setVisibleUntil(0);
      onChange(nextValue);
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      const deleteEnd = selectionStart === selectionEnd ? Math.min(value.length, selectionEnd + 1) : selectionEnd;
      const nextValue = value.slice(0, selectionStart) + value.slice(deleteEnd);
      cursorRef.current = selectionStart;
      setVisibleIndex(null);
      setVisibleUntil(0);
      onChange(nextValue);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    replaceRange(event.clipboardData.getData('text'));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-2">{label}</label>
      <input
        ref={inputRef}
        type="text"
        required={required}
        value={displayValue}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onChange={() => undefined}
        autoComplete={autoComplete}
        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-cyan/50 focus:bg-white/10 transition-all placeholder:text-muted"
        placeholder={placeholder}
      />
    </div>
  );
}
