import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SecretaryDashboard } from "@/components/dashboard/secretary-dashboard";
import { TechQueue } from "@/components/secretary/tech-queue";
import { todayClinic } from "@/lib/clinic-timezone";

export const dynamic = "force-dynamic";

export default async function SecretaryDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const today = todayClinic();

  // Today's technician appointments
  const { data: techAppts } = await supabase
    .from("technician_appointments")
    .select("id, start_time, status, patients(id, full_name, phone), technician_procedures(name, price), users!technician_appointments_technician_id_fkey(id, full_name), technician_reports(id, status)")
    .eq("clinic_id", profile.clinic_id)
    .eq("appt_date", today)
    .order("start_time");

  return (
    <div>
      <SecretaryDashboard clinicId={profile.clinic_id} />
      {(techAppts ?? []).length > 0 && (
        <div className="mt-6">
          <TechQueue appointments={techAppts ?? []} clinicId={profile.clinic_id} />
        </div>
      )}
    </div>
  );
}
