import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BackupClient } from "./backup-client";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("id, clinic_id, role, full_name").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  // Get row counts for display
  const tables = [
    "patients", "appointments", "visits", "prescriptions",
    "inpatients", "insurance_claims", "outpatient_procedure_claims",
    "visit_diagnoses", "visit_labs", "visit_symptoms",
    "expenses", "staff_salaries",
  ];

  const counts: Record<string, number> = {};
  await Promise.all(tables.map(async t => {
    const { count } = await supabase.from(t).select("*", { count:"exact", head:true })
      .eq("clinic_id", profile.clinic_id);
    counts[t] = count ?? 0;
  }));

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Data Backup</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Download your clinic data as CSV files. Keep regular backups for your records.
      </p>
      <BackupClient clinicId={profile.clinic_id} counts={counts} />
    </div>
  );
}
