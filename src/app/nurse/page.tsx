import { NursePage } from "./nurse-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// This page is PUBLIC — no auth check
export default async function NursePublicPage() {
  // Fetch all active procedures from all clinics
  // Nurse will search by hospital patient ID which returns the clinic
  const supabase = await createClient();
  const { data: procedures } = await supabase
    .from("nurse_procedures_catalog")
    .select("id, name, name_ar, category, notes, clinic_id")
    .eq("is_active", true)
    .order("category").order("name");

  return <NursePage procedures={procedures ?? []} />;
}
