import { createClient } from "@/lib/supabase/server";
import { SymptomsManager } from "./symptoms-manager";

export default async function SymptomsSettingsPage() {
  const supabase = await createClient();

  const { data: symptoms, error } = await supabase
    .from("symptoms_catalog")
    .select("id, name, name_ar, is_active")
    .order("name");

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-1 text-xl font-medium text-neutral-900">Symptoms checklist</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Manage the symptom list shown during booking. Used for both new and follow-up visits.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </div>
        )}

        <SymptomsManager initialSymptoms={symptoms ?? []} />
      </div>
    </div>
  );
}
