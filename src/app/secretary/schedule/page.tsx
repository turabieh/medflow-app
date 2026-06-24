import { createClient } from "@/lib/supabase/server";
import { ScheduleCalendar } from "@/components/secretary/schedule-calendar";

export default async function SecretarySchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const { date, view } = await searchParams;
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
    .select("id, doctor_id, block_date, start_time, end_time, reason")
    .order("block_date");

  // Fetch appointments for the visible date range (server computes, client renders)
  const targetDate = date ?? new Date().toISOString().split("T")[0];

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, appt_date, start_time, end_time, status, visit_type, doctor_id, patient_id")
    .neq("status", "cancelled")
    .neq("status", "no_show")
    .order("start_time");

  const patientIds = [...new Set((appointments ?? []).map((a) => a.patient_id))];
  const { data: patients } = patientIds.length
    ? await supabase.from("patients").select("id, full_name").in("id", patientIds)
    : { data: [] };
  const patientsById = Object.fromEntries((patients ?? []).map((p) => [p.id, p.full_name]));

  const appointmentsWithNames = (appointments ?? []).map((a) => ({
    ...a,
    patientName: patientsById[a.patient_id] ?? "Unknown",
    isInpatient: false,
  }));

  // Fetch inpatient visits for the schedule view — doctor is at hospital
  const { data: inpatientVisits } = await supabase
    .from("visits")
    .select("id, visit_date, visit_time, visit_fee_type, doctor_id, inpatients(location, hospitals(name), patients(full_name))")
    .eq("visit_context", "inpatient")
    .neq("status", "finalized")
    .not("visit_date", "is", null)
    .not("visit_time", "is", null)
    .order("visit_date");

  // Convert inpatient visits to appointment-like objects for the calendar
  const inpatientSlots = (inpatientVisits ?? []).map(v => {
    const ip = Array.isArray(v.inpatients) ? v.inpatients[0] : v.inpatients as { location: string; hospitals: { name: string } | { name: string }[] | null; patients: { full_name: string } | { full_name: string }[] | null } | null;
    const hosp = ip ? (Array.isArray(ip.hospitals) ? ip.hospitals[0] : ip.hospitals) as { name: string } | null : null;
    const pt   = ip ? (Array.isArray(ip.patients)  ? ip.patients[0]  : ip.patients)  as { full_name: string } | null : null;
    const time = v.visit_time?.slice(0, 5) ?? "08:00";
    // Add 15-min buffer: end time = visit_time + 45min (30 travel + 15 buffer)
    const [h, m] = time.split(":").map(Number);
    const endMins = h * 60 + m + 45;
    const endTime = `${String(Math.floor(endMins/60)).padStart(2,"0")}:${String(endMins%60).padStart(2,"0")}`;
    return {
      id: v.id,
      appt_date: v.visit_date!,
      start_time: time,
      end_time: endTime,
      status: "inpatient_visit",
      visit_type: v.visit_fee_type ?? "inpatient",
      doctor_id: v.doctor_id,
      patient_id: "",
      patientName: pt?.full_name ?? "Hospital Patient",
      isInpatient: true,
      hospitalName: hosp?.name ?? "",
      location: ip?.location ?? "",
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-lg font-medium text-neutral-900">Schedule</h1>
      <ScheduleCalendar
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
          id: b.id,
          doctorId: b.doctor_id,
          blockDate: b.block_date,
          startTime: b.start_time,
          endTime: b.end_time,
          reason: b.reason,
        }))}
        appointments={[...appointmentsWithNames, ...inpatientSlots]}
        initialDate={targetDate}
        initialView={(view as "week" | "day") ?? "week"}
      />
    </div>
  );
}
