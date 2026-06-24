import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AdmitPatientForm } from "./admit-patient-form";

export const dynamic = "force-dynamic";

export default async function NewInpatientPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user?.id ?? "").single();

  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("id, name, primary_phone")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="p-6">
      <div className="mb-5">
        <Link href="/doctor/inpatients" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← Inpatients
        </Link>
      </div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Admit Inpatient</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Register a hospital patient under your care. Search for existing patient or add new.
      </p>
      <AdmitPatientForm hospitals={hospitals ?? []} />
    </div>
  );
}
