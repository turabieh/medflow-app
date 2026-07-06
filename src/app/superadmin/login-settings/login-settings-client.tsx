"use client";

import { useState, useRef } from "react";

interface Settings {
  login_banner_url:    string;
  login_company_name:  string;
  login_tagline:       string;
  login_description:   string;
  login_contact_email: string;
  login_contact_phone: string;
  login_website:       string;
}

interface Props {
  initial: Settings;
}

export function LoginPageSettings({ initial }: Props) {
  const [s, setS]         = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const inp = "w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-600 transition";

  async function uploadBanner(file: File) {
    setUploading(true); setError(null);
    try {
      // Resize client-side
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = async () => {
        URL.revokeObjectURL(url);
        const maxW = 1200;
        let { width, height } = img;
        if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL("image/jpeg", 0.88).split(",")[1];

        const res = await fetch("/api/superadmin/upload-banner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mimeType: "image/jpeg" }),
        });
        const data = await res.json();
        if (data.url) {
          setS(prev => ({ ...prev, login_banner_url: data.url }));
        } else {
          setError(data.error ?? "Upload failed");
        }
        setUploading(false);
      };
      img.src = url;
    } catch (e) {
      setError((e as Error).message);
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true); setError(null);
    const res = await fetch("/api/superadmin/login-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else setError(data.error ?? "Save failed");
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <h2 className="mb-1 text-lg font-semibold text-neutral-900">Login Page</h2>
      <p className="mb-6 text-sm text-neutral-500">Customize what clinic staff see when they log in to MedFlow.</p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Banner image */}
      <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-5">
        <label className="mb-3 block text-sm font-semibold text-neutral-800">Banner Image</label>
        <p className="mb-3 text-xs text-neutral-400">Displayed on the left side of the login page. White background recommended. Ideal width: 1200px.</p>

        {s.login_banner_url && (
          <div className="mb-3 rounded-lg overflow-hidden border border-neutral-200" style={{ maxWidth: 320 }}>
            <img src={s.login_banner_url} alt="Banner preview" className="w-full object-contain" />
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadBanner(f); }} />

        <div className="flex gap-3 flex-wrap">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition">
            {uploading ? (
              <><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />Uploading...</>
            ) : (
              <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Upload Image</>
            )}
          </button>
          {s.login_banner_url && (
            <button onClick={() => setS(prev => ({ ...prev, login_banner_url: "" }))}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
              Remove
            </button>
          )}
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-neutral-400">Or paste image URL</label>
          <input value={s.login_banner_url} onChange={e => setS(prev => ({...prev, login_banner_url: e.target.value}))}
            className={inp} placeholder="https://..." />
        </div>
      </div>

      {/* Text content */}
      <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <label className="block text-sm font-semibold text-neutral-800">Left Panel Content</label>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Company Name</label>
          <input value={s.login_company_name} onChange={e => setS(p=>({...p,login_company_name:e.target.value}))} className={inp} placeholder="VeloTech" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Tagline</label>
          <input value={s.login_tagline} onChange={e => setS(p=>({...p,login_tagline:e.target.value}))} className={inp} placeholder="Smart Clinic Management" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Description</label>
          <textarea value={s.login_description} onChange={e => setS(p=>({...p,login_description:e.target.value}))}
            rows={4} className={`${inp} resize-none`}
            placeholder="MedFlow is a modern clinic management platform..." />
        </div>
      </div>

      {/* Contact info */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <label className="block text-sm font-semibold text-neutral-800">Contact Information</label>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Email</label>
          <input value={s.login_contact_email} onChange={e => setS(p=>({...p,login_contact_email:e.target.value}))} className={inp} placeholder="hello@velotech.app" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Phone</label>
          <input value={s.login_contact_phone} onChange={e => setS(p=>({...p,login_contact_phone:e.target.value}))} className={inp} placeholder="+962 79 000 0000" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Website</label>
          <input value={s.login_website} onChange={e => setS(p=>({...p,login_website:e.target.value}))} className={inp} placeholder="https://velotech.app" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition">
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-600">✓ Saved — login page updated</span>}
      </div>
    </div>
  );
}
