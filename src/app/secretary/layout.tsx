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
      <div className="flex flex-1 flex-col overflow-hidden">
        {profile.role === "doctor" && (
          <div className="flex-shrink-0 flex items-center justify-between bg-indigo-700 px-5 py-2.5">
            <div className="flex items-center gap-2 text-sm text-white">
              <span className="font-medium">Secretary Mode</span>
              <span className="text-indigo-300">— you are acting as secretary</span>
            </div>
            <a
              href="/doctor/dashboard"
              className="rounded-md bg-indigo-600 border border-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              ← Back to Doctor Dashboard
            </a>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
