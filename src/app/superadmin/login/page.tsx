import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function SuperAdminLoginPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("sa_session")) redirect("/superadmin");

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui,-apple-system,sans-serif" }}>
      <div style={{ width:"360px" }}>
        <div style={{ textAlign:"center", marginBottom:"32px" }}>
          <div style={{ fontSize:"24px", fontWeight:"800", color:"#fff", letterSpacing:"-1px" }}>
            VeloTech <span style={{ color:"#6366f1" }}>Admin</span>
          </div>
          <p style={{ fontSize:"13px", color:"#525252", marginTop:"6px" }}>System administrator access only</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
