import { createClient } from "@/lib/supabase/server";
import { HospitalsManager } from "./hospitals-manager";

export const dynamic = "force-dynamic";

export default async function AdminHospitalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("clinic_id, role").eq("id", user?.id ?? "").single();

  if (profile?.role !== "admin") {
    return <div className="p-6 text-sm text-red-600">Access denied.</div>;
  }

  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("id, name, address, primary_phone, secondary_phone, portal_link, is_active")
    .eq("clinic_id", profile.clinic_id)
    .order("name");

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Hospitals</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Hospitals where the doctor accepts inpatients. Used for referrals and inpatient documentation.
      </p>
      <HospitalsManager clinicId={profile.clinic_id} hospitals={hospitals ?? []} />
    </div>
  );
}
