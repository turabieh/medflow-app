import { createClient } from "@/lib/supabase/server";
import { MedicationsAndSymptomsManager } from "@/components/admin/medications-symptoms-manager";

export default async function MedicationsAndSymptomsPage() {
  const supabase = await createClient();

  const { data: medications } = await supabase
    .from("medications_catalog")
    .select("id, name, name_ar, default_dose, default_unit, is_active")
    .order("name");

  const { data: symptoms } = await supabase
    .from("symptoms_catalog")
    .select("id, name, name_ar, is_active, category")
    .order("category").order("name");

  return (
    <div>
      <h1 className="mb-6 text-lg font-medium text-neutral-900">Medications &amp; Symptoms</h1>
      <MedicationsAndSymptomsManager
        initialMedications={medications ?? []}
        initialSymptoms={symptoms ?? []}
      />
    </div>
  );
}
