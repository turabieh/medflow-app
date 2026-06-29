"use client";

import React, { useRef } from "react";

interface JordanDateInputProps {
  value: string;               // YYYY-MM-DD
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

/**
 * JordanDateInput
 * - Shows the native calendar picker (from hidden type="date" input)
 * - Displays selected date as DD/MM/YYYY in a visible text field
 * - Clicking anywhere opens the calendar
 */
export function JordanDateInput({
  value, onChange, required, placeholder = "DD/MM/YYYY",
  className = "", style, min, max, id,
}: JordanDateInputProps) {
  const hiddenRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    hiddenRef.current?.showPicker?.();
    hiddenRef.current?.click();
  }

  const display = value ? toDisplay(value) : "";

  return (
    <div className="relative" style={{ display: "inline-block", width: "100%" }}>
      {/* Visible display field — shows DD/MM/YYYY, clicking opens picker */}
      <div
        onClick={openPicker}
        className={`flex cursor-pointer items-center justify-between rounded-md border bg-white px-3 py-2 text-sm select-none ${
          value ? "text-neutral-900" : "text-neutral-400"
        } ${className}`}
        style={style}
      >
        <span>{display || placeholder}</span>
        {/* Calendar icon */}
        <svg className="h-4 w-4 flex-shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      {/* Hidden native date input — provides the calendar */}
      <input
        ref={hiddenRef}
        id={id}
        type="date"
        value={value}
        required={required}
        min={min}
        max={max}
        onChange={e => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          pointerEvents: "none",  // clicks go to the div above, which calls showPicker
        }}
      />
    </div>
  );
}

// Utility exports
export function isoToDisplay(iso: string): string {
  if (!iso || iso.length < 10) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
