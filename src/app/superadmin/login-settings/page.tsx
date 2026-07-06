import { requireSASession, getSASupabase } from "@/lib/superadmin-session";
import { LoginPageSettings } from "./login-settings-client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoginSettingsPage() {
  await requireSASession();
  const sb = getSASupabase();

  const { data: rows } = await sb.from("app_settings").select("key,value")
    .in("key",["login_banner_url","login_company_name","login_tagline","login_description","login_contact_email","login_contact_phone","login_website"]);

  const s = Object.fromEntries((rows??[]).map(r=>[r.key,r.value??""]));

  return (
    <div style={{minHeight:"100vh",background:"#f8f7f4",padding:"2rem 1.5rem"}}>
      <div style={{maxWidth:680,margin:"0 auto"}}>
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link href="/superadmin" className="text-neutral-400 hover:text-neutral-600">← Dashboard</Link>
        </div>
        <LoginPageSettings initial={{
          login_banner_url:    s.login_banner_url    ?? "",
          login_company_name:  s.login_company_name  ?? "VeloTech",
          login_tagline:       s.login_tagline       ?? "Smart Clinic Management",
          login_description:   s.login_description   ?? "",
          login_contact_email: s.login_contact_email ?? "",
          login_contact_phone: s.login_contact_phone ?? "",
          login_website:       s.login_website       ?? "",
        }}/>
      </div>
    </div>
  );
}
