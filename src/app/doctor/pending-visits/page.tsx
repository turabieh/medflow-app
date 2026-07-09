import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PendingVisitsClient from "./pending-visits-client";

export const dynamic = "force-dynamic";

export default async function PendingVisitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("id, clinic_id").eq("id", user.id).single();
  const doctorId = profile?.id ?? "";
  const clinicId = profile?.clinic_id ?? "";

  const { data: appts } = await supabase
    .from("appointments")
    .select("id, appt_date, start_time, visit_type, status, patient_id, patients(id, full_name, full_name_ar, phone, dob), visits(id)")
    .eq("clinic_id", clinicId)
    .eq("doctor_id", doctorId)
    .eq("status", "with_doctor")
    .order("appt_date", { ascending: false })
    .limit(100);

  return (
    <PendingVisitsClient
      appointments={(appts ?? []).map(a => ({
        id: a.id,
        appt_date: a.appt_date,
        start_time: a.start_time,
        visit_type: a.visit_type,
        status: a.status,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        patientName: (Array.isArray(a.patients) ? a.patients[0] : a.patients as any)?.full_name ?? "Unknown",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        patientId: (Array.isArray(a.patients) ? a.patients[0] : a.patients as any)?.id ?? "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        phone: (Array.isArray(a.patients) ? a.patients[0] : a.patients as any)?.phone ?? "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        visitId: (Array.isArray(a.visits) ? a.visits[0] : a.visits as any)?.id ?? null,
      }))}
    />
  );
}
