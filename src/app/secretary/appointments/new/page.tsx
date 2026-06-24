import { createClient } from "@/lib/supabase/server";
import { getVisitDurations } from "@/lib/actions/visit-durations";
import { NewAppointmentForm } from "@/components/secretary/new-appointment-form";
import Link from "next/link";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const { patientId } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user?.id ?? "").single();

  const { data: doctors } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .eq("role", "doctor")
    .eq("is_active", true)
    .order("full_name");

  const { data: workingHours } = await supabase
    .from("doctor_working_hours")
    .select("doctor_id, day_of_week, open_time, close_time, has_break, break_start, break_end");

  const { data: blocks } = await supabase
    .from("doctor_schedule_blocks")
    .select("doctor_id, block_date, start_time, end_time, reason");

  const { data: symptoms } = await supabase
    .from("symptoms_catalog")
    .select("id, name, name_ar")
    .eq("is_active", true)
    .order("name");

  // Pre-load patient if patientId provided (booking from patient record)
  let preloadedPatient = null;
  if (patientId) {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, phone")
      .eq("id", patientId)
      .single();
    preloadedPatient = data;
  }

  const visitDurations = await getVisitDurations(profile?.clinic_id ?? "");

  // Fetch upcoming booked appointments for conflict detection (next 90 days)
  const today = new Date().toISOString().split("T")[0];
  const future = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split("T")[0];
  const { data: bookedSlots } = await supabase
    .from("appointments")
    .select("doctor_id, appt_date, start_time, end_time, patient_id, patients(full_name)")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .in("status", ["booked", "confirmed", "arrived", "with_doctor"])
    .gte("appt_date", today)
    .lte("appt_date", future);

  return (
    <div>
      <div className="mb-4">
        <Link href="/secretary/appointments" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← Appointments
        </Link>
      </div>
      <h1 className="mb-6 text-lg font-medium text-neutral-900">Book appointment</h1>
      <NewAppointmentForm
        clinicId={profile?.clinic_id ?? ""}
        doctors={doctors ?? []}
        workingHours={(workingHours ?? []).map((wh) => ({
          doctorId: wh.doctor_id,
          dayOfWeek: wh.day_of_week,
          openTime: wh.open_time,
          closeTime: wh.close_time,
          hasBreak: wh.has_break,
          breakStart: wh.break_start ?? undefined,
          breakEnd: wh.break_end ?? undefined,
        }))}
        blocks={(blocks ?? []).map((b) => ({
          doctorId: b.doctor_id,
          blockDate: b.block_date,
          startTime: b.start_time,
          endTime: b.end_time,
          reason: b.reason,
        }))}
        symptoms={symptoms ?? []}
        preloadedPatient={preloadedPatient}
        visitDurations={visitDurations}
        bookedSlots={(bookedSlots ?? []).map(b => ({
          doctorId: b.doctor_id,
          date: b.appt_date,
          startTime: b.start_time,
          endTime: b.end_time,
          patientName: Array.isArray(b.patients) ? b.patients[0]?.full_name : (b.patients as {full_name?: string} | null)?.full_name ?? "Another patient",
        }))}
      />
    </div>
  );
}
