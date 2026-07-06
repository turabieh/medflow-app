"use client";
import { useState, useRef } from "react";

interface S {
  login_banner_url: string; login_company_name: string; login_tagline: string;
  login_description: string; login_contact_email: string; login_contact_phone: string; login_website: string;
}

export function LoginPageSettings({ initial }: { initial: S }) {
  const [s, setS]     = useState<S>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]   = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inp = "w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-700 transition bg-white";

  async function upload(file: File) {
    setUploading(true); setError(null);
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(objUrl);
      let { width, height } = img;
      if (width > 1200) { height = Math.round(height * 1200 / width); width = 1200; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      const base64 = canvas.toDataURL("image/jpeg", 0.88).split(",")[1];
      try {
        const res = await fetch("/api/superadmin/upload-banner", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ base64, mimeType:"image/jpeg" }),
        });
        const data = await res.json();
        if (data.url) setS(p=>({...p,login_banner_url:data.url}));
        else setError(data.error??"Upload failed");
      } catch(e) { setError((e as Error).message); }
      setUploading(false);
    };
    img.onerror = () => { setError("Failed to read image"); setUploading(false); };
    img.src = objUrl;
  }

  async function save() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch("/api/superadmin/login-settings", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(s),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(t); }
      const data = await res.json();
      if (data.ok) { setSaved(true); setTimeout(()=>setSaved(false),3000); }
      else setError(data.error??"Save failed");
    } catch(e) { setError((e as Error).message); }
    setSaving(false);
  }

  return (
    <div style={{maxWidth:640}}>
      <h2 className="mb-1 text-xl font-bold text-neutral-900">Login Page Settings</h2>
      <p className="mb-6 text-sm text-neutral-500">These settings appear on the left side of the MedFlow login page.</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Banner */}
      <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-5">
        <p className="mb-1 text-sm font-semibold text-neutral-800">Banner Image</p>
        <p className="mb-3 text-xs text-neutral-400">Displayed on the login page left panel. White background, max 1200px wide.</p>
        {s.login_banner_url && (
          <div className="mb-3 rounded-lg overflow-hidden border border-neutral-200" style={{maxWidth:300}}>
            <img src={s.login_banner_url} alt="" className="w-full object-contain"/>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)upload(f);}}/>
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={()=>fileRef.current?.click()} disabled={uploading}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition">
            {uploading?"Uploading…":"Upload Image"}
          </button>
          {s.login_banner_url && (
            <button onClick={()=>setS(p=>({...p,login_banner_url:""}))}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">Remove</button>
          )}
        </div>
        <input value={s.login_banner_url} onChange={e=>setS(p=>({...p,login_banner_url:e.target.value}))}
          className={`${inp} mt-2`} placeholder="or paste image URL…"/>
      </div>

      {/* Text */}
      <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <p className="text-sm font-semibold text-neutral-800">Branding</p>
        <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Company Name</label>
          <input value={s.login_company_name} onChange={e=>setS(p=>({...p,login_company_name:e.target.value}))} className={inp} placeholder="VeloTech"/></div>
        <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Tagline</label>
          <input value={s.login_tagline} onChange={e=>setS(p=>({...p,login_tagline:e.target.value}))} className={inp} placeholder="Smart Clinic Management"/></div>
      </div>

      {/* Contact */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <p className="text-sm font-semibold text-neutral-800">Contact Information</p>
        <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Email</label>
          <input value={s.login_contact_email} onChange={e=>setS(p=>({...p,login_contact_email:e.target.value}))} className={inp} placeholder="hello@velotech.app"/></div>
        <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Phone</label>
          <input value={s.login_contact_phone} onChange={e=>setS(p=>({...p,login_contact_phone:e.target.value}))} className={inp} placeholder="+962 79 000 0000"/></div>
        <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Website</label>
          <input value={s.login_website} onChange={e=>setS(p=>({...p,login_website:e.target.value}))} className={inp} placeholder="https://velotech.app"/></div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition">
          {saving?"Saving…":"Save Changes"}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-600">✓ Saved</span>}
      </div>
    </div>
  );
}
