import { createClient } from "@/lib/supabase/server";
import { ProceduresManager } from "./procedures-manager";

export default async function ProceduresSettingsPage() {
  const supabase = await createClient();

  const { data: procedures, error } = await supabase
    .from("procedures_catalog")
    .select("id, name, name_ar, category, outpatient_price, inpatient_price, duration_minutes, notes, is_active")
    .order("category")
    .order("name");

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-xl font-medium text-neutral-900">Procedures &amp; pricing</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Default prices for billable procedures. Doctor can override per patient at billing time.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </div>
        )}

        <ProceduresManager initialProcedures={procedures ?? []} />
      </div>
    </div>
  );
}
