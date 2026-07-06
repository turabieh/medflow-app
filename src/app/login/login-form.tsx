"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleLogin} style={{width:"100%"}}>
      {error && (
        <div style={{marginBottom:"1rem",padding:"0.75rem 1rem",borderRadius:8,background:"#fef2f2",border:"1px solid #fecaca",fontSize:"0.83rem",color:"#dc2626"}}>
          {error}
        </div>
      )}
      <div style={{marginBottom:"1rem"}}>
        <label style={{display:"block",marginBottom:"0.35rem",fontSize:"0.8rem",fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.05em"}}>Email</label>
        <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@clinic.com"
          style={{width:"100%",border:"1.5px solid #E5E7EB",borderRadius:8,padding:"0.7rem 0.9rem",fontSize:"0.9rem",outline:"none",background:"#FAFAFA",transition:"border 0.2s"}}
          onFocus={e=>e.currentTarget.style.borderColor="#0A2342"}
          onBlur={e=>e.currentTarget.style.borderColor="#E5E7EB"} />
      </div>
      <div style={{marginBottom:"1.75rem"}}>
        <label style={{display:"block",marginBottom:"0.35rem",fontSize:"0.8rem",fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.05em"}}>Password</label>
        <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"
          style={{width:"100%",border:"1.5px solid #E5E7EB",borderRadius:8,padding:"0.7rem 0.9rem",fontSize:"0.9rem",outline:"none",background:"#FAFAFA",transition:"border 0.2s"}}
          onFocus={e=>e.currentTarget.style.borderColor="#0A2342"}
          onBlur={e=>e.currentTarget.style.borderColor="#E5E7EB"} />
      </div>
      <button type="submit" disabled={loading} style={{
        width:"100%",padding:"0.8rem",borderRadius:8,
        background:loading?"#6B7280":"#0A2342",
        color:"#fff",fontSize:"0.9rem",fontWeight:700,
        border:"none",cursor:loading?"not-allowed":"pointer",
        letterSpacing:"0.02em",transition:"background 0.2s",
      }}>
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
