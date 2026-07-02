"use client";

import React, { useState, useRef, useEffect } from "react";

interface JordanDateInputProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  min?: string;
  max?: string;
  id?: string;
}

function toDisplay(iso: string): string {
  if (!iso || iso.length < 10) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function toISO(display: string): string {
  const digits = display.replace(/\D/g, "");
  if (digits.length < 8) return "";
  const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8);
  const di = parseInt(d), mi = parseInt(m), yi = parseInt(y);
  if (di < 1 || di > 31 || mi < 1 || mi > 12 || yi < 1900 || yi > 2100) return "";
  return `${y}-${m}-${d}`;
}

function autoFormat(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function JordanDateInput({
  value, onChange, required, placeholder = "DD/MM/YYYY",
  className = "", style, min, max, id,
}: JordanDateInputProps) {
  const nativeRef  = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [text, setText]       = useState(() => value ? toDisplay(value) : "");
  const [hasError, setHasError] = useState(false);
  const [showNative, setShowNative] = useState(false);

  // Keep text in sync when value changes externally
  const prevValue = useRef(value);
  if (value !== prevValue.current) {
    prevValue.current = value;
    const expected = toDisplay(value);
    if (text !== expected) setText(value ? expected : "");
  }

  // Close native picker when clicking outside
  useEffect(() => {
    if (!showNative) return;
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowNative(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showNative]);

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const formatted = autoFormat(raw);
    setText(formatted);
    setHasError(false);
    if (formatted.length === 10) {
      const iso = toISO(formatted);
      if (iso) { onChange(iso); setHasError(false); }
      else setHasError(true);
    } else if (formatted.length === 0) {
      onChange("");
    }
  }

  function handleBlur() {
    if (text.length > 0 && text.length < 10) setHasError(true);
  }

  function handleNativeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const iso = e.target.value;
    if (iso) {
      onChange(iso);
      setText(toDisplay(iso));
      setHasError(false);
      setShowNative(false); // close after picking
    }
  }

  function openCalendar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    // Try showPicker (Chrome/Firefox/Edge — not Safari)
    if (nativeRef.current && typeof nativeRef.current.showPicker === "function") {
      try {
        nativeRef.current.showPicker();
        return;
      } catch {}
    }
    
    // Safari fallback: show an absolutely-positioned native input
    setShowNative(true);
    // Focus the native input after render
    setTimeout(() => {
      nativeRef.current?.focus();
      nativeRef.current?.click();
    }, 0);
  }

  const border = hasError
    ? "border-red-400 focus:border-red-500"
    : "border-neutral-300 focus:border-neutral-500";

  return (
    <div ref={wrapperRef} className="relative" style={{ width: "100%" }}>
      <div className="flex gap-1">
        {/* Typing field */}
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
        {/* Calendar button */}
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

      {/* Native date input — always present for showPicker(), shown on top in Safari */}
      <input
        ref={nativeRef}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={handleNativeChange}
        onBlur={() => setShowNative(false)}
        tabIndex={showNative ? 0 : -1}
        aria-hidden={!showNative}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: showNative ? 1 : 0,
          zIndex: showNative ? 10 : -1,
          cursor: "pointer",
          // Make it visible but text transparent so calendar icon shows
          color: "transparent",
          background: showNative ? "white" : "transparent",
          border: showNative ? "2px solid #6366f1" : "none",
          borderRadius: "6px",
          padding: "8px 12px",
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
