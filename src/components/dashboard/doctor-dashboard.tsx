import { createClient } from "@/lib/supabase/server";
import { TodoPanel } from "@/components/shared/todo-panel";
import { DoctorQueue } from "@/components/doctor/doctor-queue";

export async function DoctorDashboard({ doctorId }: { doctorId: string }) {
  const supabase = await createClient();
  const { data: currentUser } = await supabase.from("users").select("id, full_name, role, clinic_id").eq("id", doctorId).single();

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, start_time, status, visit_type, patient_id, visits(id)")
    .eq("doctor_id", doctorId)
    .eq("appt_date", todayStr)
    .in("status", ["arrived", "with_doctor"])
    .order("start_time", { ascending: true });

  const patientIds = (appointments ?? []).map((a) => a.patient_id);
  const { data: patients } = patientIds.length
    ? await supabase.from("patients").select("id, full_name").in("id", patientIds)
    : { data: [] };
  const patientsById = new Map((patients ?? []).map((p) => [p.id, p]));

  const items = (appointments ?? []).map((appt) => ({
    id: appt.id,
    start_time: appt.start_time,
    status: appt.status,
    visit_type: appt.visit_type,
    patientName: patientsById.get(appt.patient_id)?.full_name ?? "Unknown patient",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visitId: (() => { const v = (appt as any).visits; return Array.isArray(v) ? v[0]?.id ?? null : v?.id ?? null; })(),
  }));

  const withDoctorCount = items.filter((i) => i.status === "with_doctor").length;
  const arrivedCount = items.filter((i) => i.status === "arrived").length;

  return (
    <>
<div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">Waiting</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
              {arrivedCount}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">With you</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
              {withDoctorCount}
            </span>
          </div>
        </div>
      </div>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
        Your patients today
      </h2>
      <DoctorQueue items={items} />

      <p className="mt-6 text-xs text-neutral-400">
        Clinical notes, vitals, and prescriptions will be added here in the next phase.
      </p>
    </>
  );
}
