import { todayClinic } from "@/lib/clinic-timezone";
import { createClient } from "@/lib/supabase/server";
import { AppointmentsView } from "@/components/secretary/appointments-view";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SecretaryAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const targetDate = params.date ?? todayClinic();
  const supabase = await createClient();

  // Fetch ALL non-pending appointments for this date
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      appt_date,
      start_time,
      status,
      visit_type,
      is_overbooked,
      patient_id,
      doctor_id,
      users!appointments_doctor_id_fkey ( full_name )
    `)
    .eq("appt_date", targetDate)
    .order("start_time", { ascending: true });

  // Debug: log what we got
  console.log(`[Appointments] date=${targetDate} count=${appointments?.length ?? 0} error=${error?.message}`);

  const patientIds = [...new Set((appointments ?? []).map((a) => a.patient_id))];
  const { data: patients } = patientIds.length
    ? await supabase.from("patients").select("id, full_name, phone").in("id", patientIds)
    : { data: [] };
  const patientsById = new Map((patients ?? []).map((p) => [p.id, p]));

  const items = (appointments ?? []).map((appt) => {
    const patient = patientsById.get(appt.patient_id);
    const doctor = Array.isArray(appt.users) ? appt.users[0] : appt.users;
    return {
      id: appt.id,
      start_time: appt.start_time,
      status: appt.status,
      visit_type: appt.visit_type,
      is_overbooked: appt.is_overbooked ?? false,
      patientName: patient?.full_name ?? "Unknown",
      phone: patient?.phone ?? "",
      doctorName: (doctor as { full_name?: string } | null)?.full_name ?? "—",
    };
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium text-neutral-900">Appointments</h1>
        <Link
          href="/secretary/appointments/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Book appointment
        </Link>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Error: {error.message}
        </div>
      )}

      <AppointmentsView items={items} currentDate={targetDate} />
    </div>
  );
}
