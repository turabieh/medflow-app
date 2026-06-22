import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppointmentEditForm } from "@/components/secretary/appointment-edit-form";

export default async function AppointmentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: appt, error } = await supabase
    .from("appointments")
    .select(`
      id, appt_date, start_time, end_time, status, visit_type,
      is_overbooked, secretary_notes, doctor_id, patient_id,
      pending_call_attempts, confirmation_call_attempts,
      payment_confirmed, payment_method, payment_amount,
      vital_heart_rate, vital_bp, vital_temperature,
      vital_o2_saturation, vital_resp_rate, vital_weight_kg, vital_height_cm
    `)
    .eq("id", id)
    .single();

  if (error || !appt) notFound();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, full_name_ar, phone")
    .eq("id", appt.patient_id)
    .single();

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

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={`/secretary/appointments?date=${appt.appt_date}`}
          className="text-sm text-neutral-500 hover:text-neutral-700"
        >
          ← Appointments
        </Link>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-medium text-neutral-900">
          Edit appointment — {patient?.full_name}
        </h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
          appt.status === "finalized" ? "bg-neutral-100 text-neutral-600" :
          appt.status === "cancelled" || appt.status === "no_show" ? "bg-red-100 text-red-700" :
          appt.status === "with_doctor" ? "bg-indigo-100 text-indigo-700" :
          "bg-blue-100 text-blue-700"
        }`}>
          {appt.status.replace(/_/g, " ")}
        </span>
      </div>

      <AppointmentEditForm
        appointment={appt}
        patient={patient ?? { id: appt.patient_id, full_name: "Unknown", full_name_ar: null, phone: "" }}
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
      />
    </div>
  );
}
