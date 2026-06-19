"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * A single text input that automatically right-aligns and switches to RTL
 * when the typed content is Arabic — without affecting the rest of the
 * page layout, which stays English/LTR throughout the app.
 *
 * Use this for any field where staff might type Arabic OR English:
 * patient names, addresses, clinic names, free-text notes, etc.
 *
 * Detection is based on the presence of Arabic Unicode characters in the
 * current value — as soon as an Arabic letter appears, the field flips
 * to dir="rtl" and right-aligned text for natural typing.
 */

const ARABIC_PATTERN = /[\u0600-\u06FF\u0750-\u077F]/;

interface BilingualInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "dir"> {
  label?: string;
}

export function BilingualInput({
  label,
  value,
  className,
  ...props
}: BilingualInputProps) {
  const isArabic = useMemo(() => {
    const str = typeof value === "string" ? value : "";
    return ARABIC_PATTERN.test(str);
  }, [value]);

  return (
    <div>
      {label && (
        <label className="mb-1 block text-sm text-neutral-700">{label}</label>
      )}
      <input
        {...props}
        value={value}
        dir={isArabic ? "rtl" : "ltr"}
        className={cn(
          "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500",
          isArabic ? "text-right font-arabic" : "text-left",
          className
        )}
      />
    </div>
  );
}

interface BilingualTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "dir"> {
  label?: string;
}

/**
 * Same auto-detection behavior as BilingualInput, for longer free-text
 * fields like clinical note content where Arabic/English may be mixed.
 */
export function BilingualTextarea({
  label,
  value,
  className,
  ...props
}: BilingualTextareaProps) {
  const isArabic = useMemo(() => {
    const str = typeof value === "string" ? value : "";
    return ARABIC_PATTERN.test(str);
  }, [value]);

  return (
    <div>
      {label && (
        <label className="mb-1 block text-sm text-neutral-700">{label}</label>
      )}
      <textarea
        {...props}
        value={value}
        dir={isArabic ? "rtl" : "ltr"}
        className={cn(
          "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500",
          isArabic ? "text-right font-arabic" : "text-left",
          className
        )}
      />
    </div>
  );
}
