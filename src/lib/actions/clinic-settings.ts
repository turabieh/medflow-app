"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface SaveClinicSettingsInput {
  clinicId: string;
  name: string;
  nameAr?: string;
  currency: string;
  logoBase64?: string;
  logoMimeType?: string;
}

export async function saveClinicSettings(input: SaveClinicSettingsInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("users").select("role, clinic_id").eq("id", user.id).single();

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Only admins can change clinic settings." };
  }

  let logoUrl: string | undefined;

  // Upload logo to Supabase Storage if provided
  if (input.logoBase64 && input.logoMimeType) {
    const adminClient = createAdminClient();
    const ext = input.logoMimeType.split("/")[1] ?? "png";
    const path = `${input.clinicId}/logo.${ext}`;
    const buffer = Buffer.from(input.logoBase64, "base64");

    const { error: uploadError } = await adminClient.storage
      .from("clinic-assets")
      .upload(path, buffer, {
        contentType: input.logoMimeType,
        upsert: true,
      });

    if (!uploadError) {
      const { data: { publicUrl } } = adminClient.storage
        .from("clinic-assets")
        .getPublicUrl(path);
      logoUrl = publicUrl;
    }
  }

  // Update clinic name
  const updateData: Record<string, string> = {
    name: input.name.trim(),
  };
  if (input.nameAr !== undefined) updateData.name_ar = input.nameAr.trim();
  if (logoUrl) updateData.logo_url = logoUrl;

  const { error: clinicError } = await supabase
    .from("clinics")
    .update(updateData)
    .eq("id", input.clinicId);

  if (clinicError) return { success: false, error: clinicError.message };

  // Upsert currency setting
  const { error: settingError } = await supabase
    .from("clinic_settings")
    .upsert(
      { clinic_id: input.clinicId, key: "currency", value: input.currency },
      { onConflict: "clinic_id,key" }
    );

  if (settingError) return { success: false, error: settingError.message };

  revalidatePath("/admin/settings/clinic");
  revalidatePath("/admin/dashboard");
  return { success: true };
}
