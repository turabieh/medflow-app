import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BackupClient } from "./backup-client";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("id, clinic_id, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  // Tables with clinic_id
  const directTables = [
    "patients", "appointments", "visits", "prescriptions",
    "visit_diagnoses", "visit_labs",
    "inpatients", "inpatient_visit_procedures",
    "insurance_claims", "hospital_claims", "outpatient_procedure_claims",
    "expenses", "staff_salaries",
  ];

  const counts: Record<string, number> = {};

  await Promise.all(directTables.map(async t => {
    const { count } = await supabase.from(t)
      .select("*", { count:"exact", head:true })
      .eq("clinic_id", profile.clinic_id);
    counts[t] = count ?? 0;
  }));

  // visit_symptoms — filter via visits join
  const vsq = await supabase.from("visit_symptoms")
    .select("visits!inner(clinic_id)", { count:"exact", head:true })
    .eq("visits.clinic_id", profile.clinic_id);
  counts["visit_symptoms"] = vsq.count ?? 0;

  // appointment_symptoms — filter via appointments join
  const asq = await supabase.from("appointment_symptoms")
    .select("appointments!inner(clinic_id)", { count:"exact", head:true })
    .eq("appointments.clinic_id", profile.clinic_id);
  counts["appointment_symptoms"] = asq.count ?? 0;

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Data Backup</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Download your clinic data as CSV. Recommended weekly for full records.
      </p>
      <BackupClient clinicId={profile.clinic_id} counts={counts} />
    </div>
  );
}
