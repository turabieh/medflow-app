import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SecretarySidebar } from "@/components/secretary/layout/sidebar";

export default async function SecretaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, role, clinic_id, clinics(name, logo_url)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Only secretary, nurse, and admin can access the secretary workspace.
  if (!["secretary", "nurse", "admin", "doctor"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const clinic = Array.isArray(profile.clinics)
    ? profile.clinics[0]
    : profile.clinics;

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <SecretarySidebar
        clinicName={clinic?.name ?? "Clinic"}
        userName={profile.full_name}
        userRole={profile.role}
        logoUrl={(clinic as { logo_url?: string | null } | null)?.logo_url}
      />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
