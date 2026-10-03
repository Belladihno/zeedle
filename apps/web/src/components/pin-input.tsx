'use client';

import { useEffect, useRef, useState } from 'react';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

/** Hidden tel input (native keyboard) driving display-only dot boxes. */
export function PinInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const press = (key: string) => {
    if (key === '⌫') {
      onChange(value.slice(0, -1));
    } else if (key !== '' && value.length < 4 && /^\d$/.test(key)) {
      onChange(value + key);
    }
    inputRef.current?.focus();
  };

  return (
    <div>
      <button
        type="button"
        aria-label="Enter PIN"
        onClick={() => inputRef.current?.focus()}
        className="flex w-full cursor-text justify-center gap-3"
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`flex h-14 w-14 items-center justify-center rounded-xl border text-xl ${
              focused && value.length === i
                ? 'border-brand'
                : value.length > i
                  ? 'border-border-strong bg-elevated'
                  : 'border-border bg-surface'
            }`}
          >
            {value.length > i ? '●' : ''}
          </span>
        ))}
      </button>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        aria-hidden
        tabIndex={-1}
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
          onChange(digits);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="h-0 w-0 opacity-0"
      />
      <div className="mx-auto mt-4 grid max-w-[280px] grid-cols-3 gap-2">
        {DIGITS.map((key, i) => (
          <button
            key={`${key}-${i}`}
            type="button"
            onClick={() => press(key)}
            disabled={key === ''}
            className="flex h-14 items-center justify-center rounded-xl bg-elevated text-xl font-semibold text-text-primary active:bg-hover disabled:opacity-0"
          >
            {key}
          </button>
        ))}
      </div>
      {error ? <p className="mt-3 text-center text-sm text-debit">{error}</p> : null}
    </div>
  );
}
