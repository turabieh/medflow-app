"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveVisitDurations(
  clinicId: string,
  durations: Record<string, number>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("users").select("role, clinic_id").eq("id", user.id).single();
  if (profile?.role !== "admin" || profile.clinic_id !== clinicId) {
    return { success: false, error: "Not authorized." };
  }

  const { error } = await supabase
    .from("clinic_settings")
    .upsert(
      { clinic_id: clinicId, key: "visit_type_durations", value: JSON.stringify(durations) },
      { onConflict: "clinic_id,key" }
    );

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings/visit-durations");
  return { success: true };
}

export async function getVisitDurations(clinicId: string): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clinic_settings")
    .select("value")
    .eq("clinic_id", clinicId)
    .eq("key", "visit_type_durations")
    .single();

  const defaults = { new: 45, follow_up: 30, urgent: 15, consultation: 30 };
  if (!data?.value) return defaults;
  try { return { ...defaults, ...JSON.parse(data.value) }; }
  catch { return defaults; }
}
