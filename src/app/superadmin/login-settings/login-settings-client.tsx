"use client";
import { useState, useRef } from "react";

interface S { login_banner_url:string; login_company_name:string; login_tagline:string; login_contact_email:string; login_contact_phone:string; login_website:string; }

export function LoginPageSettings({ initial }:{ initial:S }) {
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]   = useState<string|null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const inp = {width:"100%",border:"1.5px solid #E5E7EB",borderRadius:8,padding:"0.65rem 0.875rem",fontSize:"0.88rem",outline:"none",background:"#FAFAFA",boxSizing:"border-box" as const};
  const lbl = {display:"block",fontSize:"0.75rem",fontWeight:600 as const,color:"#6B7280",marginBottom:"0.3rem",textTransform:"uppercase" as const,letterSpacing:"0.05em"};

  async function upload(file:File) {
    setUploading(true); setError(null);
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      let {width,height} = img;
      if (width>1200){height=Math.round(height*1200/width);width=1200;}
      const c=document.createElement("canvas"); c.width=width; c.height=height;
      c.getContext("2d")!.drawImage(img,0,0,width,height);
      const base64=c.toDataURL("image/jpeg",0.88).split(",")[1];
      try {
        const res=await fetch("/api/superadmin/upload-banner",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({base64,mimeType:"image/jpeg"})});
        const d=await res.json();
        if(d.url) setS(p=>({...p,login_banner_url:d.url}));
        else setError(d.error??"Upload failed");
      } catch(e){setError(String(e));}
      setUploading(false);
    };
    img.onerror=()=>{setError("Failed to read image");setUploading(false);};
    img.src=url;
  }

  async function save() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const res=await fetch("/api/superadmin/login-settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});
      const d=await res.json();
      if(d.ok){setSaved(true);setTimeout(()=>setSaved(false),3000);}
      else setError(d.error??"Save failed");
    } catch(e){setError(String(e));}
    setSaving(false);
  }

  return (
    <div style={{fontFamily:"'Inter','Segoe UI',sans-serif",maxWidth:600}}>
      <h2 style={{fontSize:"1.25rem",fontWeight:700,color:"#0A2342",marginBottom:"0.25rem"}}>Login Page Settings</h2>
      <p style={{fontSize:"0.85rem",color:"#9CA3AF",marginBottom:"1.5rem"}}>Edit what appears on the MedFlow login screen.</p>

      {error && <div style={{marginBottom:"1rem",padding:"0.75rem 1rem",borderRadius:8,background:"#FEF2F2",border:"1px solid #FECACA",fontSize:"0.83rem",color:"#DC2626"}}>{error}</div>}

      {/* Banner */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #E5E7EB",padding:"1.25rem",marginBottom:"1rem"}}>
        <p style={{fontSize:"0.85rem",fontWeight:600,color:"#111827",marginBottom:"0.75rem"}}>Banner Image</p>
        {s.login_banner_url && <div style={{marginBottom:"0.75rem",borderRadius:8,overflow:"hidden",border:"1px solid #E5E7EB",maxWidth:280}}><img src={s.login_banner_url} alt="" style={{width:"100%",display:"block",objectFit:"contain"}}/></div>}
        <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)upload(f);}}/>
        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.75rem"}}>
          <button onClick={()=>ref.current?.click()} disabled={uploading} style={{padding:"0.5rem 1rem",borderRadius:8,border:"1px solid #D1D5DB",background:"#fff",fontSize:"0.82rem",fontWeight:600,cursor:"pointer",opacity:uploading?0.5:1}}>{uploading?"Uploading…":"Upload Image"}</button>
          {s.login_banner_url && <button onClick={()=>setS(p=>({...p,login_banner_url:""}))} style={{padding:"0.5rem 1rem",borderRadius:8,border:"1px solid #FCA5A5",background:"#FEF2F2",fontSize:"0.82rem",fontWeight:600,cursor:"pointer",color:"#DC2626"}}>Remove</button>}
        </div>
        <label style={lbl}>Or paste URL</label>
        <input style={inp} value={s.login_banner_url} onChange={e=>setS(p=>({...p,login_banner_url:e.target.value}))} placeholder="https://..."/>
      </div>

      {/* Branding */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #E5E7EB",padding:"1.25rem",marginBottom:"1rem",display:"flex",flexDirection:"column",gap:"1rem"}}>
        <p style={{fontSize:"0.85rem",fontWeight:600,color:"#111827",margin:0}}>Branding</p>
        <div><label style={lbl}>Company Name</label><input style={inp} value={s.login_company_name} onChange={e=>setS(p=>({...p,login_company_name:e.target.value}))} placeholder="VeloTech"/></div>
        <div><label style={lbl}>Tagline</label><input style={inp} value={s.login_tagline} onChange={e=>setS(p=>({...p,login_tagline:e.target.value}))} placeholder="Smart Clinic Management"/></div>
      </div>

      {/* Contact */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #E5E7EB",padding:"1.25rem",marginBottom:"1.5rem",display:"flex",flexDirection:"column",gap:"1rem"}}>
        <p style={{fontSize:"0.85rem",fontWeight:600,color:"#111827",margin:0}}>Contact Info</p>
        <div><label style={lbl}>Email</label><input style={inp} value={s.login_contact_email} onChange={e=>setS(p=>({...p,login_contact_email:e.target.value}))} placeholder="hello@velotech.app"/></div>
        <div><label style={lbl}>Phone</label><input style={inp} value={s.login_contact_phone} onChange={e=>setS(p=>({...p,login_contact_phone:e.target.value}))} placeholder="+962 79 000 0000"/></div>
        <div><label style={lbl}>Website</label><input style={inp} value={s.login_website} onChange={e=>setS(p=>({...p,login_website:e.target.value}))} placeholder="https://velotech.app"/></div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
        <button onClick={save} disabled={saving} style={{padding:"0.75rem 2rem",borderRadius:10,background:saving?"#6B7280":"#0A2342",color:"#fff",fontSize:"0.9rem",fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer"}}>
          {saving?"Saving…":"Save Changes"}
        </button>
        {saved && <span style={{fontSize:"0.85rem",fontWeight:600,color:"#059669"}}>✓ Saved</span>}
      </div>
    </div>
  );
}
