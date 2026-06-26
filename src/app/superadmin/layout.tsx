import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";

// Super admin uses a simple cookie session (not Supabase auth)
// Session cookie: "sa_session" = base64 encoded {id, email, name}

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get("sa_session");

  // Allow login page without session
  // (checked by the login page itself)

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", fontFamily:"system-ui,-apple-system,sans-serif", color:"#f5f5f5" }}>
      {session && (
        <nav style={{ background:"#111", borderBottom:"1px solid #222", padding:"0 24px", display:"flex", alignItems:"center", gap:"32px", height:"52px" }}>
          <div style={{ fontSize:"15px", fontWeight:"800", color:"#fff", letterSpacing:"-0.5px" }}>
            VeloTech <span style={{ color:"#6366f1" }}>Admin</span>
          </div>
          {[
            { href:"/superadmin", label:"Dashboard" },
            { href:"/superadmin/clinics", label:"Clinics" },
            { href:"/superadmin/tiers", label:"Tiers & Pricing" },
          ].map(n => (
            <Link key={n.href} href={n.href}
              style={{ fontSize:"13px", color:"#a3a3a3", textDecoration:"none", fontWeight:"500" }}
              className="sa-nav-link">
              {n.label}
            </Link>
          ))}
          <form action="/api/superadmin/logout" method="POST" style={{ marginLeft:"auto" }}>
            <button type="submit" style={{ background:"none", border:"1px solid #333", color:"#737373", borderRadius:"6px", padding:"5px 12px", fontSize:"12px", cursor:"pointer", fontFamily:"inherit" }}>
              Sign out
            </button>
          </form>
        </nav>
      )}
      <main style={{ padding: session ? "32px 24px" : "0", maxWidth:"1200px", margin:"0 auto" }}>
        {children}
      </main>
    </div>
  );
}
