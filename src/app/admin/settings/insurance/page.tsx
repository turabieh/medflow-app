import { createClient } from "@/lib/supabase/server";
import { InsuranceManager } from "@/app/settings/insurance/insurance-manager";
import { ProceduresManager } from "@/app/settings/procedures/procedures-manager";

export default async function InsuranceProceduresPage() {
  const supabase = await createClient();

  const [{ data: companies }, { data: procedures }] = await Promise.all([
    supabase.from("insurance_companies")
      .select("id, name, name_ar, portal_url, phone, email, notes, is_covered, is_active")
      .order("name"),
    supabase.from("procedures_catalog")
      .select("id, name, name_ar, category, outpatient_price, inpatient_price, duration_minutes, notes, is_active")
      .order("category").order("name"),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-lg font-medium text-neutral-900">Insurance &amp; Procedures</h1>
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Insurance Companies</h2>
        <InsuranceManager initialCompanies={companies ?? []} />
      </div>
      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Procedure Catalogue</h2>
        <ProceduresManager initialProcedures={procedures ?? []} />
      </div>
    </div>
  );
}
