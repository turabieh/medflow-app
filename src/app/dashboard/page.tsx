import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SecretaryDashboard } from "@/components/dashboard/secretary-dashboard";
import { DoctorDashboard } from "@/components/dashboard/doctor-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { LogoutButton } from "@/components/ui/logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, full_name, role, clinic_id, clinics(name, name_ar, tier)")
    .eq("id", user!.id)
    .single();

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-medium">Could not load profile</p>
          <p className="mt-1 text-red-600">{error?.message ?? "No matching user row found."}</p>
        </div>
      </div>
    );
  }

  const clinic = Array.isArray(profile.clinics) ? profile.clinics[0] : profile.clinics;

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium text-neutral-900">
              {clinic?.name ?? "Dashboard"}
            </h1>
            <p className="text-sm text-neutral-500">
              Signed in as {profile.full_name} · {profile.role}
            </p>
          </div>
          <LogoutButton />
        </div>

        {profile.role === "secretary" && <SecretaryDashboard clinicId={profile.clinic_id} />}
        {profile.role === "doctor" && <DoctorDashboard doctorId={profile.id} />}
        {profile.role === "admin" && <AdminDashboard clinicId={profile.clinic_id} />}
        {profile.role === "nurse" && <SecretaryDashboard clinicId={profile.clinic_id} />}

        {!["secretary", "doctor", "admin", "nurse"].includes(profile.role) && (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Unrecognized role &quot;{profile.role}&quot; — no dashboard configured for this role yet.
          </div>
        )}
      </div>
    </div>
  );
}
