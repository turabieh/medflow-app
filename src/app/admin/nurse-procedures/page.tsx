import { createClient } from "@/lib/supabase/server";
import { NurseProceduresAdmin } from "./nurse-procedures-admin";

export const dynamic = "force-dynamic";

export const NURSE_CATEGORIES = [
  { key: "general",    label: "General",    color: "bg-neutral-100 text-neutral-700" },
  { key: "monitoring", label: "Monitoring", color: "bg-blue-100 text-blue-700" },
  { key: "lab",        label: "Lab",        color: "bg-purple-100 text-purple-700" },
  { key: "setup",      label: "Setup",      color: "bg-amber-100 text-amber-700" },
  { key: "medication", label: "Medication", color: "bg-red-100 text-red-700" },
  { key: "other",      label: "Other",      color: "bg-neutral-100 text-neutral-500" },
];

export default async function NurseProceduresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("clinic_id, role").eq("id", user?.id ?? "").single();

  if (profile?.role !== "admin") return <div className="p-6 text-sm text-red-600">Access denied.</div>;

  const { data: procedures } = await supabase
    .from("nurse_procedures_catalog")
    .select("id, name, name_ar, category, notes, is_active")
    .eq("clinic_id", profile.clinic_id)
    .order("category").order("name");

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-medium text-neutral-900">Nurse Procedures</h1>
        <a href="/nurse" target="_blank" rel="noreferrer"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
          Open Nurse Page ↗
        </a>
      </div>
      <p className="mb-5 text-sm text-neutral-500">
        Manage procedures nurses can record at the bedside. Share the Nurse Page link with your nursing staff.
      </p>
      <NurseProceduresAdmin clinicId={profile.clinic_id} procedures={procedures ?? []} categories={NURSE_CATEGORIES} />
    </div>
  );
}
