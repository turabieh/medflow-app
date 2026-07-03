"use client";

import { useState, useRef } from "react";
import { uploadClinicImage } from "@/lib/actions/upload-image";

interface ImageUploadButtonProps {
  currentUrl?: string;
  folder: string;
  onUploaded: (url: string) => void;
  label?: string;
  shape?: "square" | "portrait" | "landscape";
}

export function ImageUploadButton({
  currentUrl, folder, onUploaded,
  label = "Upload Photo",
  shape = "square",
}: ImageUploadButtonProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    // Show preview immediately
    setPreview(URL.createObjectURL(f));
    setError(null); setSaved(false); setSaving(true);

    try {
      // Convert to base64 — same as signature upload
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res((r.result as string).split(",")[1]);
        r.onerror = () => rej(new Error("Read failed"));
        r.readAsDataURL(f);
      });

      // Use server action with admin client — bypasses RLS
      const result = await uploadClinicImage(base64, f.type, folder);

      if (!result.success || !result.url) {
        setError(result.error ?? "Upload failed.");
        setSaving(false);
        return;
      }

      setPreview(result.url);
      setSaved(true);
      onUploaded(result.url);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const previewStyle: React.CSSProperties =
    shape === "portrait"  ? { width: 80,  height: 100, objectFit: "cover" as const, objectPosition: "top" } :
    shape === "landscape" ? { width: 160, height: 90,  objectFit: "cover" as const } :
                            { width: 72,  height: 72,  objectFit: "cover" as const };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Preview */}
      {preview ? (
        <img src={preview} alt="Preview" style={previewStyle}
          className="rounded-xl border border-neutral-200 shadow-sm flex-shrink-0"
          onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
      ) : (
        <div style={previewStyle}
          className="flex items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 flex-shrink-0 text-neutral-400 text-[10px] text-center p-1">
          No photo
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {error && <p className="text-[10px] text-red-600">{error}</p>}

        <div className="flex items-center gap-2 flex-wrap">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

          <button type="button" onClick={() => inputRef.current?.click()} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-50">
            {saving ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
                Uploading...
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {label}
              </>
            )}
          </button>

          {saved && <span className="text-[11px] font-semibold text-emerald-600">✓ Uploaded</span>}
        </div>

        <p className="text-[10px] text-neutral-400">JPG or PNG · Max 4MB</p>
      </div>
    </div>
  );
}
