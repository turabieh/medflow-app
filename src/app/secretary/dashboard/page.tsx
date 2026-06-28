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
      <div className="mt-4 mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-700">🔬 Technician Schedule — Today</h2>
        <a href="/secretary/technician-schedule" className="text-xs text-blue-600 hover:underline">Full schedule →</a>
      </div>
      {(techAppts ?? []).length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-5 text-center text-sm text-neutral-400">
          No technician appointments today.{" "}
          <a href="/secretary/technician-schedule" className="text-blue-600 hover:underline">Book one →</a>
        </div>
      )}
      {(techAppts ?? []).length > 0 && (
        <div className="mt-6">
          <TechQueue appointments={techAppts ?? []} clinicId={profile.clinic_id} />
        </div>
      )}
    </div>
  );
}
