import { requireSASession, getSASupabase } from "@/lib/superadmin-session";
import { LoginPageSettings } from "./login-settings-client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoginSettingsPage() {
  await requireSASession();
  const sb = getSASupabase();
  const { data } = await sb.from("app_settings").select("key,value")
    .in("key",["login_banner_url","login_company_name","login_tagline","login_contact_email","login_contact_phone","login_website"]);
  const s = Object.fromEntries((data??[]).map((r:{key:string;value:string})=>[r.key,r.value??""]));

  return (
    <div style={{minHeight:"100vh",background:"#F9F8F6",padding:"2rem 1.5rem",fontFamily:"'Inter','Segoe UI',sans-serif"}}>
      <div style={{maxWidth:640,margin:"0 auto"}}>
        <div style={{marginBottom:"1.5rem"}}><Link href="/superadmin" style={{fontSize:"0.85rem",color:"#9CA3AF",textDecoration:"none"}}>← Back to Dashboard</Link></div>
        <LoginPageSettings initial={{
          login_banner_url:   s.login_banner_url   ??"",
          login_company_name: s.login_company_name ??"VeloTech",
          login_tagline:      s.login_tagline      ??"Smart Clinic Management",
          login_contact_email:s.login_contact_email??"",
          login_contact_phone:s.login_contact_phone??"",
          login_website:      s.login_website      ??"",
        }}/>
      </div>
    </div>
  );
}
