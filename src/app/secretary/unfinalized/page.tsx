import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { markFinalized } from "@/lib/actions/appointments";
import UnfinalizedClient from "./unfinalized-client";

export const dynamic = "force-dynamic";

export default async function UnfinalizedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user.id).single();
  const clinicId = profile?.clinic_id ?? "";

  // Fetch all appointments that are "done" (doctor finished) but not finalized
  // Also include old "with_doctor" from previous days
  const { data: appts } = await supabase
    .from("appointments")
    .select("id, appt_date, start_time, visit_type, status, payment_confirmed, payment_method, patient_id, doctor_id, patients(id, full_name, full_name_ar, phone), users!appointments_doctor_id_fkey(full_name)")
    .eq("clinic_id", clinicId)
    .in("status", ["done", "with_doctor"])
    .order("appt_date", { ascending: false })
    .limit(200);

  const { data: currency_setting } = await supabase
    .from("clinic_settings").select("value").eq("clinic_id", clinicId).eq("key", "currency").single();
  const currency = currency_setting?.value ?? "JOD";

  return (
    <UnfinalizedClient
      appointments={(appts ?? []).map(a => ({
        id: a.id,
        appt_date: a.appt_date,
        start_time: a.start_time,
        visit_type: a.visit_type,
        status: a.status,
        payment_confirmed: a.payment_confirmed,
        payment_method: a.payment_method,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        patientName: (Array.isArray(a.patients) ? a.patients[0] : a.patients as any)?.full_name ?? "Unknown",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        patientId: (Array.isArray(a.patients) ? a.patients[0] : a.patients as any)?.id ?? "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        phone: (Array.isArray(a.patients) ? a.patients[0] : a.patients as any)?.phone ?? "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        doctorName: (Array.isArray(a.users) ? a.users[0] : a.users as any)?.full_name ?? "—",
      }))}
      currency={currency}
    />
  );
}
