import { PendingList } from "@/components/secretary/pending-list";
import { ConfirmationCallForm } from "@/components/secretary/confirmation-call-form";
import { TodayQueue } from "@/components/secretary/today-queue";
import { computeConfirmationCallDate, type ExistingAppointmentForSlots } from "@/lib/scheduling/slots";
import { todayClinic } from "@/lib/clinic-timezone";
import { createClient } from "@/lib/supabase/server";

export async function SecretaryDashboard({ clinicId }: { clinicId: string }) {
  const supabase = await createClient();

  // Pending appointments: no time slot assigned yet, secretary needs to call.
  // Archived ones are hidden here but stay in the database.
  const { data: pendingAppointments } = await supabase
    .from("appointments")
    .select(
      "id, appt_date, visit_type, period, secretary_notes, pending_call_attempts, pending_is_cold, patient_id"
    )
    .eq("status", "pending")
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  const patientIds = (pendingAppointments ?? []).map((a) => a.patient_id);

  const { data: patients } = patientIds.length
    ? await supabase
        .from("patients")
        .select("id, full_name, full_name_ar, first_name, middle_name, last_name, first_name_ar, middle_name_ar, last_name_ar, gender, dob, address, phone, phone2, phone2_relation")
        .in("id", patientIds)
    : { data: [] };

  const patientsById = new Map((patients ?? []).map((p) => [p.id, p]));

  const pendingItems = (pendingAppointments ?? [])
    .map((appt) => {
      const patient = patientsById.get(appt.patient_id);
      if (!patient) return null;
      return { appointment: appt, patient };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const { data: symptomsCatalog } = await supabase
    .from("symptoms_catalog")
    .select("id, name, name_ar")
    .eq("is_active", true)
    .order("name");

  const uniqueDates = Array.from(new Set((pendingAppointments ?? []).map((a) => a.appt_date)));

  const appointmentsByDate: Record<string, ExistingAppointmentForSlots[]> = {};
  if (uniqueDates.length > 0) {
    const { data: dateAppts } = await supabase
      .from("appointments")
      .select("id, start_time, visit_type, status, appt_date, doctor_id")
      .in("appt_date", uniqueDates)
      .neq("status", "pending");

    for (const date of uniqueDates) {
      appointmentsByDate[date] = (dateAppts ?? [])
        .filter((a) => a.appt_date === date)
        .map((a) => ({
          id: a.id,
          start_time: a.start_time,
          visit_type: a.visit_type,
          status: a.status,
          doctor_id: a.doctor_id,
        }));
    }
  }

  const { data: doctors } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("clinic_id", clinicId)
    .eq("role", "doctor")
    .eq("is_active", true)
    .order("full_name");

  const { data: workingHoursData } = await supabase
    .from("doctor_working_hours")
    .select("doctor_id, day_of_week, open_time, close_time, has_break, break_start, break_end");

  const { data: blocksData } = await supabase
    .from("doctor_schedule_blocks")
    .select("doctor_id, block_date, start_time, end_time, reason");

  const { data: bookedAppointments } = await supabase
    .from("appointments")
    .select("id, appt_date, start_time, visit_type, doctor_id, confirmation_call_attempts, no_answer_flag, patient_id")
    .eq("status", "booked")
    .order("appt_date", { ascending: true });

  const todayStr = todayClinic();

  const doctorWorkingDaysMap = new Map<string, number[]>();
  for (const wh of workingHoursData ?? []) {
    const days = doctorWorkingDaysMap.get(wh.doctor_id) ?? [];
    days.push(wh.day_of_week);
    doctorWorkingDaysMap.set(wh.doctor_id, days);
  }

  const callTodayAppointments = (bookedAppointments ?? []).filter((appt) => {
    if (!appt.doctor_id) return false;
    const workingDays = doctorWorkingDaysMap.get(appt.doctor_id) ?? [0, 1, 2, 3, 4];
    const callDate = computeConfirmationCallDate(appt.appt_date, workingDays);
    return callDate === todayStr;
  });

  const callTodayPatientIds = callTodayAppointments.map((a) => a.patient_id);
  const { data: callTodayPatients } = callTodayPatientIds.length
    ? await supabase.from("patients").select("id, full_name").in("id", callTodayPatientIds)
    : { data: [] };
  const callTodayPatientsById = new Map((callTodayPatients ?? []).map((p) => [p.id, p]));

  const { data: todayAppointments } = await supabase
    .from("appointments")
    .select("id, start_time, status, is_overbooked, no_answer_flag, visit_type, patient_id, vital_heart_rate, vital_bp, vital_temperature, vital_o2_saturation, vital_resp_rate, vital_weight_kg, vital_height_cm, vitals_recorded_at, payment_confirmed")
    .eq("appt_date", todayStr)
    .neq("status", "pending")
    .order("start_time", { ascending: true });

  const todayPatientIds = (todayAppointments ?? []).map((a) => a.patient_id);
  const { data: todayPatients } = todayPatientIds.length
    ? await supabase.from("patients").select("id, full_name, full_name_ar, phone").in("id", todayPatientIds)
    : { data: [] };
  const todayPatientsById = new Map((todayPatients ?? []).map((p) => [p.id, p]));

  const todayQueueItems = (todayAppointments ?? []).map((appt) => {
    const patient = todayPatientsById.get(appt.patient_id);
    return {
      id: appt.id,
      start_time: appt.start_time,
      status: appt.status,
      visit_type: appt.visit_type,
      is_overbooked: appt.is_overbooked,
      patientId: appt.patient_id,
      patientName: patient?.full_name ?? "Unknown patient",
      patientNameAr: patient?.full_name_ar ?? null,
      phone: patient?.phone ?? null,
      vital_heart_rate: appt.vital_heart_rate,
      vital_bp: appt.vital_bp,
      vital_temperature: appt.vital_temperature,
      vital_o2_saturation: appt.vital_o2_saturation,
      vital_resp_rate: appt.vital_resp_rate,
      vital_weight_kg: appt.vital_weight_kg,
      vital_height_cm: appt.vital_height_cm,
      vitals_recorded_at: appt.vitals_recorded_at,
      payment_confirmed: appt.payment_confirmed,
    };
  });

  const { data: currencySetting } = await supabase
    .from("clinic_settings")
    .select("value")
    .eq("clinic_id", clinicId)
    .eq("key", "currency")
    .maybeSingle();

  const currency = currencySetting?.value ?? "JOD";

  return (
    <>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">Today</span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
              {todayQueueItems.length}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">Pending</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {pendingItems.length}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">Call today</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              {callTodayAppointments.length}
            </span>
          </div>
        </div>
      </div>

      {(!doctors || doctors.length === 0) && (
        <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No active doctors found for this clinic — booking will not work until at least one doctor user exists.
        </div>
      )}

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
        Today&apos;s queue
      </h2>
      <div className="mb-6">
        <TodayQueue items={todayQueueItems} currency={currency} />
      </div>

      {callTodayAppointments.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Call today — confirm tomorrow&apos;s appointments
          </h2>
          <div className="mb-6 space-y-2">
            {callTodayAppointments.map((appt) => {
              const patient = callTodayPatientsById.get(appt.patient_id);
              if (!patient) return null;
              return (
                <ConfirmationCallForm
                  key={appt.id}
                  appointment={appt}
                  patientName={patient.full_name}
                />
              );
            })}
          </div>
        </>
      )}

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
        Pending calls
      </h2>
      <PendingList
        items={pendingItems}
        doctors={doctors ?? []}
        symptomsCatalog={symptomsCatalog ?? []}
        appointmentsByDate={appointmentsByDate}
        workingHours={(workingHoursData ?? []).map((wh) => ({
          doctorId: wh.doctor_id,
          dayOfWeek: wh.day_of_week,
          openTime: wh.open_time,
          closeTime: wh.close_time,
          hasBreak: wh.has_break,
          breakStart: wh.break_start ?? undefined,
          breakEnd: wh.break_end ?? undefined,
        }))}
        blocks={(blocksData ?? []).map((b) => ({
          doctorId: b.doctor_id,
          blockDate: b.block_date,
          startTime: b.start_time,
          endTime: b.end_time,
          reason: b.reason,
        }))}
      />
    </>
  );
}
