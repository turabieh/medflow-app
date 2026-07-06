"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string|null>(null);
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/dashboard"); router.refresh();
  }

  const fieldStyle: React.CSSProperties = {
    width:"100%", border:"1.5px solid #E5E7EB", borderRadius:10,
    padding:"0.75rem 1rem", fontSize:"0.9rem", outline:"none",
    background:"#FAFAFA", boxSizing:"border-box",
  };

  return (
    <form onSubmit={handleLogin}>
      {error && <div style={{marginBottom:"1rem",padding:"0.7rem 1rem",borderRadius:8,background:"#FEF2F2",border:"1px solid #FECACA",fontSize:"0.82rem",color:"#DC2626"}}>{error}</div>}
      <label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"#6B7280",marginBottom:"0.35rem",textTransform:"uppercase",letterSpacing:"0.05em"}}>Email</label>
      <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
        placeholder="you@clinic.com" style={{...fieldStyle,marginBottom:"1rem"}}
        onFocus={e=>e.currentTarget.style.borderColor="#0A2342"}
        onBlur={e=>e.currentTarget.style.borderColor="#E5E7EB"}/>
      <label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"#6B7280",marginBottom:"0.35rem",textTransform:"uppercase",letterSpacing:"0.05em"}}>Password</label>
      <input type="password" required value={password} onChange={e=>setPassword(e.target.value)}
        placeholder="••••••••" style={{...fieldStyle,marginBottom:"1.5rem"}}
        onFocus={e=>e.currentTarget.style.borderColor="#0A2342"}
        onBlur={e=>e.currentTarget.style.borderColor="#E5E7EB"}/>
      <button type="submit" disabled={loading} style={{
        width:"100%", padding:"0.8rem", borderRadius:10,
        background:loading?"#6B7280":"#0A2342",
        color:"#fff", fontSize:"0.9rem", fontWeight:700,
        border:"none", cursor:loading?"not-allowed":"pointer",
      }}>{loading?"Signing in…":"Sign In"}</button>
    </form>
  );
}
