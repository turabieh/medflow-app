"use client";

import React, { useState, useRef } from "react";

interface JordanDateInputProps {
  value: string;               // YYYY-MM-DD stored value
  onChange: (val: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  min?: string;
  max?: string;
  id?: string;
}

/** YYYY-MM-DD → DD/MM/YYYY */
function toDisplay(iso: string): string {
  if (!iso || iso.length < 10) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** DD/MM/YYYY → YYYY-MM-DD. Returns "" if invalid */
function toISO(display: string): string {
  const digits = display.replace(/\D/g, "");
  if (digits.length < 8) return "";
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  const di = parseInt(d), mi = parseInt(m), yi = parseInt(y);
  if (di < 1 || di > 31 || mi < 1 || mi > 12 || yi < 1900 || yi > 2100) return "";
  return `${y}-${m}-${d}`;
}

/** Auto-insert slashes: "2906" → "29/06", "290620" → "29/06/20" */
function autoFormat(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function JordanDateInput({
  value, onChange, required, placeholder = "DD/MM/YYYY or 📅",
  className = "", style, min, max, id,
}: JordanDateInputProps) {
  const nativeRef = useRef<HTMLInputElement>(null);
  // Text field value — either typed or from picker
  const [text, setText] = useState(() => value ? toDisplay(value) : "");
  const [hasError, setHasError] = useState(false);

  // Keep text in sync when value prop changes externally
  const prevValue = useRef(value);
  if (value !== prevValue.current) {
    prevValue.current = value;
    const expected = toDisplay(value);
    if (text !== expected) setText(value ? expected : "");
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const formatted = autoFormat(raw);
    setText(formatted);
    setHasError(false);

    if (formatted.length === 10) {
      const iso = toISO(formatted);
      if (iso) {
        onChange(iso);
        setHasError(false);
      } else {
        setHasError(true);
        onChange("");
      }
    } else if (formatted.length === 0) {
      onChange("");
    }
  }

  function handleBlur() {
    if (text.length > 0 && text.length < 10) setHasError(true);
  }

  function handleNativeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const iso = e.target.value; // YYYY-MM-DD
    if (iso) {
      onChange(iso);
      setText(toDisplay(iso));
      setHasError(false);
    }
  }

  function openCalendar() {
    try {
      nativeRef.current?.showPicker?.();
    } catch {}
    nativeRef.current?.click();
  }

  const border = hasError ? "border-red-400 focus:border-red-500" : "border-neutral-300 focus:border-neutral-500";

  return (
    <div className="relative" style={{ width: "100%" }}>
      <div className="flex gap-1">
        {/* Manual text entry — DD/MM/YYYY with auto-slash */}
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required && !value}
          maxLength={10}
          className={`flex-1 rounded-md border px-3 py-2 text-sm outline-none font-mono tracking-wide ${border} ${className}`}
          style={style}
        />
        {/* Calendar icon button */}
        <button
          type="button"
          onClick={openCalendar}
          title="Open calendar"
          className="flex-shrink-0 flex items-center justify-center rounded-md border border-neutral-300 bg-white px-2.5 hover:bg-neutral-50 transition-colors"
        >
          <svg className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {/* Invisible native date input — only for calendar picker */}
      <input
        ref={nativeRef}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={handleNativeChange}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {hasError && (
        <p className="mt-0.5 text-[10px] text-red-500">Enter date as DD/MM/YYYY</p>
      )}
    </div>
  );
}

export function isoToDisplay(iso: string): string {
  if (!iso || iso.length < 10) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
