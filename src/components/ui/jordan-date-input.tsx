"use client";

import React, { useState, useRef } from "react";

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

/** Convert YYYY-MM-DD → DD/MM/YYYY for display */
function toDisplay(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Convert DD/MM/YYYY → YYYY-MM-DD for storage */
function toISO(display: string): string {
  const clean = display.replace(/[^0-9]/g, "");
  if (clean.length < 8) return "";
  const d = clean.slice(0, 2);
  const m = clean.slice(2, 4);
  const y = clean.slice(4, 8);
  // Basic validation
  const di = parseInt(d), mi = parseInt(m), yi = parseInt(y);
  if (di < 1 || di > 31 || mi < 1 || mi > 12 || yi < 1900 || yi > 2100) return "";
  return `${y}-${m}-${d}`;
}

/** Format raw digits into DD/MM/YYYY as user types */
function formatAsTyped(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 8);
  let result = "";
  if (digits.length > 0) result += digits.slice(0, 2);
  if (digits.length > 2) result += "/" + digits.slice(2, 4);
  if (digits.length > 4) result += "/" + digits.slice(4, 8);
  return result;
}

export function JordanDateInput({
  value, onChange, required, placeholder = "DD/MM/YYYY",
  className = "", style, min, max, id,
}: JordanDateInputProps) {
  // Display state: DD/MM/YYYY string
  const [display, setDisplay] = useState(() => value ? toDisplay(value) : "");
  const [error, setError]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const formatted = formatAsTyped(raw);
    setDisplay(formatted);
    setError(false);

    if (formatted.length === 10) {
      const iso = toISO(formatted);
      if (iso) {
        // Check min/max
        if (min && iso < min) { setError(true); return; }
        if (max && iso > max) { setError(true); return; }
        onChange(iso);
      } else {
        setError(true);
        onChange("");
      }
    } else if (formatted.length === 0) {
      onChange("");
    }
  }

  function handleBlur() {
    if (display.length > 0 && display.length < 10) {
      setError(true);
    }
  }

  // Sync display when value prop changes externally
  const prevValue = useRef(value);
  if (value !== prevValue.current) {
    prevValue.current = value;
    const newDisplay = value ? toDisplay(value) : "";
    if (newDisplay !== display) setDisplay(newDisplay);
  }

  const baseClass = `w-full rounded-md border px-3 py-2 text-sm outline-none font-mono tracking-wider ${
    error
      ? "border-red-400 bg-red-50 focus:border-red-500"
      : "border-neutral-300 focus:border-neutral-500"
  } ${className}`;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        maxLength={10}
        style={style}
        className={baseClass}
      />
      {error && (
        <p className="mt-0.5 text-[10px] text-red-500">
          Enter a valid date: DD/MM/YYYY
        </p>
      )}
    </div>
  );
}

// ── Utility exports for use elsewhere ───────────────────────────────────────
export { toDisplay as isoToDisplay, toISO as displayToISO };
