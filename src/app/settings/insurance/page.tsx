import { createClient } from "@/lib/supabase/server";
import { InsuranceManager } from "./insurance-manager";

export default async function InsuranceSettingsPage() {
  const supabase = await createClient();

  const { data: companies, error } = await supabase
    .from("insurance_companies")
    .select("id, name, name_ar, portal_url, phone, email, notes, is_covered, is_active")
    .order("name");

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-xl font-medium text-neutral-900">Insurance companies</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Companies patients may use. Secretary selects from this list when adding insurance info to a patient record.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </div>
        )}

        <InsuranceManager initialCompanies={companies ?? []} />
      </div>
    </div>
  );
}
