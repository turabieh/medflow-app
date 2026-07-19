import { PendingList } from "@/components/secretary/pending-list";
import { ConfirmationCallForm } from "@/components/secretary/confirmation-call-form";
import { TodayQueue } from "@/components/secretary/today-queue";
import { computeConfirmationCallDate, type ExistingAppointmentForSlots } from "@/lib/scheduling/slots";
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
        .select("id, full_name, full_name_ar, gender, dob, address, phone, phone2, phone2_relation")
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
    .select("id, appt_date, start_time, visit_type, doctor_id, confirmation_call_attempts, patient_id")
    .eq("status", "booked")
    .order("appt_date", { ascending: true });

  const todayStr = new Date().toISOString().split("T")[0];

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
    .select("id, start_time, status, is_overbooked, visit_type, patient_id, vital_heart_rate, vital_bp, vital_temperature, vital_o2_saturation, vital_resp_rate, vital_weight_kg, vital_height_cm, vitals_recorded_at, payment_confirmed, payment_method, visit_fee, patient_cash_amount, insurance_claim_amount")
    .eq("appt_date", todayStr)
    .neq("status", "pending")
    .order("start_time", { ascending: true });

  const todayPatientIds = (todayAppointments ?? []).map((a) => a.patient_id);
  const { data: todayPatients } = todayPatientIds.length
    ? await supabase.from("patients").select("id, full_name, full_name_ar, phone, insurance_company_id, insurance_coverage_pct, insurance_companies(id, name, default_coverage_pct)").in("id", todayPatientIds)
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
      payment_confirmed:    appt.payment_confirmed,
      payment_method:       appt.payment_method ?? null,
      visit_fee:            appt.visit_fee ?? null,
      patient_cash_amount:  appt.patient_cash_amount ?? null,
      insurance_claim_amount: appt.insurance_claim_amount ?? null,
      // Insurance from patient profile
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      insuranceCompanyId:   (patient as any)?.insurance_company_id ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      insuranceCompanyName: (patient as any)?.insurance_companies?.name ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      insuranceCoveragePct: (patient as any)?.insurance_coverage_pct ?? (patient as any)?.insurance_companies?.default_coverage_pct ?? 80,
    };
  });

  const { data: currencySetting } = await supabase
    .from("clinic_settings")
    .select("value")
    .eq("clinic_id", clinicId)
    .eq("key", "currency")
    .maybeSingle();

  const currency = currencySetting?.value ?? "JOD";


  // Unclaimed insurance revenue banner
  const { data: unclaimedAppts } = await supabase
    .from("appointments")
    .select("id, insurance_claim_amount, insurance_fee")
    .eq("clinic_id", clinicId)
    .eq("payment_method", "insurance")
    .eq("payment_confirmed", true);
  const { data: claimedLinks } = await supabase
    .from("insurance_claim_appointments")
    .select("appointment_id");
  const claimedSet = new Set(
    (claimedLinks ?? []).map((r: { appointment_id: string }) => r.appointment_id)
  );
  const unclaimedCount = (unclaimedAppts ?? []).filter(a => !claimedSet.has(a.id)).length;
  const unclaimedAmount = (unclaimedAppts ?? [])
    .filter(a => !claimedSet.has(a.id))
    .reduce((s, a) => s + ((a.insurance_claim_amount ?? a.insurance_fee) ?? 0), 0);

  return (
    <>
      {unclaimedCount > 0 && (
        <a href="/secretary/insurance-claims"
          className="mb-4 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 hover:bg-amber-100 transition">
          <div>
            <p className="text-sm font-semibold text-amber-900">🔴 {unclaimedCount} unclaimed insurance visit{unclaimedCount !== 1 ? "s" : ""}</p>
            <p className="text-xs text-amber-700">{unclaimedAmount.toFixed(2)} JOD not yet claimed from insurance companies</p>
          </div>
          <span className="text-xs font-semibold text-amber-800">Generate Claims →</span>
        </a>
      )}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {/* Today total */}
        <div className="rounded-2xl bg-neutral-100 border-2 border-neutral-300 p-5 shadow-sm">
          <p className="text-5xl font-black text-neutral-800">{todayQueueItems.length}</p>
          <p className="mt-2 text-sm font-bold text-neutral-700">📋 Today</p>
          <p className="text-xs text-neutral-500 mt-0.5">total appointments</p>
        </div>
        {/* Finalized */}
        <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-5 shadow-sm">
          <p className="text-5xl font-black text-emerald-700">
            {todayQueueItems.filter(i => i.status === "finalized").length}
          </p>
          <p className="mt-2 text-sm font-bold text-emerald-800">✓ Finalized</p>
          <p className="text-xs text-emerald-600 mt-0.5">completed &amp; done</p>
        </div>
        {/* Pending */}
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-5 shadow-sm">
          <p className="text-5xl font-black text-amber-700">{pendingItems.length}</p>
          <p className="mt-2 text-sm font-bold text-amber-800">⏳ Pending</p>
          <p className="text-xs text-amber-600 mt-0.5">awaiting confirmation</p>
        </div>
        {/* Call today */}
        <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-5 shadow-sm">
          <p className="text-5xl font-black text-blue-700">{callTodayAppointments.length}</p>
          <p className="mt-2 text-sm font-bold text-blue-800">📞 Call today</p>
          <p className="text-xs text-blue-600 mt-0.5">confirm tomorrow</p>
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
