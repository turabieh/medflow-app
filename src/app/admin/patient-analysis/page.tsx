import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PatientAnalysisClient from "./patient-analysis-client";

export const dynamic = "force-dynamic";

export default async function PatientAnalysisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user.id).single();
  const clinicId = profile?.clinic_id ?? "";
  const { data: patients } = await supabase
    .from("patients")
    .select("id, gender, dob, address, referral_source, referral_source_detail, created_at")
    .eq("clinic_id", clinicId);
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, appt_date, visit_type, status, patient_id, payment_method, visit_fee")
    .eq("clinic_id", clinicId)
    .in("status", ["finalized", "done"]);
  const { data: clinic } = await supabase
    .from("clinics").select("name, currency").eq("id", clinicId).single();
  return (
    <PatientAnalysisClient
      patients={patients ?? []}
      appointments={appointments ?? []}
      clinicName={clinic?.name ?? "Clinic"}
      currency={clinic?.currency ?? "JOD"}
    />
  );
}
