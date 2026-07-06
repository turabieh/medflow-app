import { requireSASession, getSASupabase } from "@/lib/superadmin-session";
import { LoginPageSettings } from "./login-settings-client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SuperadminLoginSettingsPage() {
  await requireSASession();
  const supabase = getSASupabase();

  const { data: rows } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", [
      "login_banner_url", "login_company_name", "login_tagline",
      "login_description", "login_contact_email", "login_contact_phone", "login_website",
    ]);

  const s = Object.fromEntries((rows ?? []).map(r => [r.key, r.value ?? ""]));

  const initial = {
    login_banner_url:    s.login_banner_url    ?? "",
    login_company_name:  s.login_company_name  ?? "VeloTech",
    login_tagline:       s.login_tagline       ?? "Smart Clinic Management",
    login_description:   s.login_description   ?? "",
    login_contact_email: s.login_contact_email ?? "",
    login_contact_phone: s.login_contact_phone ?? "",
    login_website:       s.login_website       ?? "",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", padding: "2rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="mb-6 flex items-center gap-3">
          <Link href="/superadmin" className="text-sm text-neutral-500 hover:text-neutral-700">← Dashboard</Link>
          <span className="text-neutral-300">/</span>
          <span className="text-sm font-medium text-neutral-700">Login Page Settings</span>
        </div>
        <LoginPageSettings initial={initial} />
      </div>
    </div>
  );
}
