"use client";

import { useState } from "react";
import { uploadDoctorSignature } from "@/lib/actions/staff";

export function SignatureUpload({
  userId,
  currentSignatureUrl,
}: {
  userId: string;
  currentSignatureUrl: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(currentSignatureUrl);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setSaved(false);
  }

  async function handleSave() {
    if (!file) return;
    setSaving(true); setError(null);
    const b64 = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(",")[1]);
      r.readAsDataURL(file);
    });
    const result = await uploadDoctorSignature(userId, b64, file.type);
    setSaving(false);
    if (!result.success) { setError(result.error ?? "Upload failed."); return; }
    if (result.url) setPreview(result.url);
    setFile(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm max-w-md">
      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <div className="mb-3 flex items-center gap-4">
        {preview ? (
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2">
            <img src={preview} alt="Signature" className="h-16 w-auto max-w-[220px] object-contain" />
          </div>
        ) : (
          <div className="flex h-16 w-48 items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-50">
            <span className="text-xs text-neutral-400">No signature uploaded</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input type="file" id="sig-upload" accept="image/*" className="hidden" onChange={handleFile} />
        <label htmlFor="sig-upload"
          className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50">
          Choose image
        </label>
        {file && (
          <button onClick={handleSave} disabled={saving}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
            {saving ? "Uploading..." : "Save signature"}
          </button>
        )}
        {saved && <span className="text-xs text-emerald-600">✓ Saved</span>}
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        Use a white background image (PNG recommended). Appears on clinical notes and prescriptions.
      </p>
    </div>
  );
}
