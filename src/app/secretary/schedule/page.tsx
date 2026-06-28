import { createClient } from "@/lib/supabase/server";
import { ScheduleCalendar } from "@/components/secretary/schedule-calendar";
import { todayClinic } from "@/lib/clinic-timezone";

export const dynamic = "force-dynamic";

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

  const today = todayClinic();
  const targetDate = date ?? today;

  const [
    { data: doctors },
    { data: technicians },
    { data: workingHours },
    { data: blocks },
    { data: appointments },
    { data: inpatientVisits },
    { data: techAppts },
  ] = await Promise.all([
    supabase.from("users").select("id, full_name")
      .eq("clinic_id", profile?.clinic_id ?? "").eq("role", "doctor").eq("is_active", true).order("full_name"),
    supabase.from("users").select("id, full_name")
      .eq("clinic_id", profile?.clinic_id ?? "").eq("role", "technician").eq("is_active", true).order("full_name"),
    supabase.from("doctor_working_hours")
      .select("doctor_id, day_of_week, open_time, close_time, has_break, break_start, break_end"),
    supabase.from("doctor_schedule_blocks")
      .select("id, doctor_id, block_date, start_time, end_time, reason").order("block_date"),
    supabase.from("appointments")
      .select("id, appt_date, start_time, end_time, status, visit_type, doctor_id, patient_id")
      .neq("status", "cancelled").neq("status", "no_show").order("start_time"),
    supabase.from("visits")
      .select("id, visit_date, visit_time, visit_fee_type, doctor_id, inpatients(location, hospitals(name), patients(full_name))")
      .eq("visit_context", "inpatient").neq("status", "finalized")
      .not("visit_date", "is", null).not("visit_time", "is", null).order("visit_date"),
    supabase.from("technician_appointments")
      .select("id, appt_date, start_time, end_time, status, technician_id, patients(full_name), technician_procedures(name)")
      .eq("clinic_id", profile?.clinic_id ?? "")
      .not("status", "in", '("cancelled","no_show")').order("start_time"),
  ]);

  const patientIds = [...new Set((appointments ?? []).map((a) => a.patient_id))];
  const { data: patients } = patientIds.length
    ? await supabase.from("patients").select("id, full_name").in("id", patientIds)
    : { data: [] };
  const patientsById = Object.fromEntries((patients ?? []).map((p) => [p.id, p.full_name]));

  const appointmentsWithNames = (appointments ?? []).map((a) => ({
    ...a,
    patientName: patientsById[a.patient_id] ?? "Unknown",
    isInpatient: false,
    isTechProcedure: false,
  }));

  // Inpatient visits → appointment-like objects
  const inpatientSlots = (inpatientVisits ?? []).map(v => {
    const ip = Array.isArray(v.inpatients) ? v.inpatients[0] : v.inpatients as any;
    const hosp = ip ? (Array.isArray(ip.hospitals) ? ip.hospitals[0] : ip.hospitals) as { name: string }|null : null;
    const pt   = ip ? (Array.isArray(ip.patients)  ? ip.patients[0]  : ip.patients)  as { full_name: string }|null : null;
    const time = v.visit_time?.slice(0,5) ?? "08:00";
    const [h,m] = time.split(":").map(Number);
    const endMins = h*60+m+45;
    const endTime = `${String(Math.floor(endMins/60)).padStart(2,"0")}:${String(endMins%60).padStart(2,"0")}`;
    return {
      id: v.id, appt_date: v.visit_date!, start_time: time, end_time: endTime,
      status: "inpatient_visit", visit_type: v.visit_fee_type ?? "inpatient",
      doctor_id: v.doctor_id, patient_id: "",
      patientName: pt?.full_name ?? "Hospital Patient",
      isInpatient: true, isTechProcedure: false,
      hospitalName: hosp?.name ?? "", location: ip?.location ?? "",
    };
  });

  // Tech appointments → appointment-like objects
  const techSlots = (techAppts ?? []).map(a => {
    const pt   = (Array.isArray(a.patients)?a.patients[0]:a.patients) as {full_name:string}|null;
    const proc = (Array.isArray(a.technician_procedures)?a.technician_procedures[0]:a.technician_procedures) as {name:string}|null;
    return {
      id: a.id, appt_date: a.appt_date, start_time: a.start_time ?? "00:00",
      end_time: a.end_time, status: a.status,
      visit_type: "procedure", doctor_id: null,
      technician_id: a.technician_id,
      patient_id: "", patientName: pt?.full_name ?? "Patient",
      procedureName: proc?.name ?? "Procedure",
      isInpatient: false, isTechProcedure: true,
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-lg font-medium text-neutral-900">Schedule</h1>
      <ScheduleCalendar
        doctors={doctors ?? []}
        technicians={technicians ?? []}
        workingHours={(workingHours ?? []).map((wh) => ({
          doctorId: wh.doctor_id, dayOfWeek: wh.day_of_week,
          openTime: wh.open_time, closeTime: wh.close_time,
          hasBreak: wh.has_break, breakStart: wh.break_start ?? undefined, breakEnd: wh.break_end ?? undefined,
        }))}
        blocks={(blocks ?? []).map((b) => ({
          id: b.id, doctorId: b.doctor_id, blockDate: b.block_date,
          startTime: b.start_time, endTime: b.end_time, reason: b.reason,
        }))}
        appointments={[...appointmentsWithNames, ...inpatientSlots, ...techSlots]}
        initialDate={targetDate}
        initialView={(view as "week"|"day") ?? "week"}
      />
    </div>
  );
}
