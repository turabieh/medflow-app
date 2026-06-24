"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface SaveClinicSettingsInput {
  clinicId: string;
  name: string;
  nameAr?: string;
  tagline?: string;
  taglineAr?: string;
  address?: string;
  addressAr?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  website?: string;
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
  if (input.logoBase64 && input.logoMimeType) {
    const ext = input.logoMimeType.split("/")[1]?.split("+")[0] ?? "png";
    const path = `${input.clinicId}/logo.${ext}`;
    const buffer = Buffer.from(input.logoBase64, "base64");

    let uploadError: { message: string } | null = null;
    let publicUrl = "";

    try {
      const adminClient = createAdminClient();
      const { error } = await adminClient.storage
        .from("clinic-assets")
        .upload(path, buffer, { contentType: input.logoMimeType, upsert: true });
      uploadError = error;
      if (!error) {
        const { data: { publicUrl: url } } = adminClient.storage.from("clinic-assets").getPublicUrl(path);
        publicUrl = url;
      }
    } catch {
      const { error } = await supabase.storage
        .from("clinic-assets")
        .upload(path, buffer, { contentType: input.logoMimeType, upsert: true });
      uploadError = error;
      if (!error) {
        const { data: { publicUrl: url } } = supabase.storage.from("clinic-assets").getPublicUrl(path);
        publicUrl = url;
      }
    }

    if (uploadError) {
      return { success: false, error: `Logo upload failed: ${uploadError.message}. Make sure the "clinic-assets" storage bucket exists and is public in Supabase Dashboard → Storage.` };
    }
    logoUrl = publicUrl;
  }

  const updateData: Record<string, string | null> = {
    name:       input.name.trim(),
    name_ar:    input.nameAr?.trim()    || null,
    tagline:    input.tagline?.trim()   || null,
    tagline_ar: input.taglineAr?.trim() || null,
    address:    input.address?.trim()   || null,
    address_ar: input.addressAr?.trim() || null,
    phone:      input.phone?.trim()     || null,
    phone2:     input.phone2?.trim()    || null,
    email:      input.email?.trim()     || null,
    website:    input.website?.trim()   || null,
  };
  if (logoUrl) updateData.logo_url = logoUrl;

  const { error: clinicError } = await supabase
    .from("clinics").update(updateData).eq("id", input.clinicId);
  if (clinicError) return { success: false, error: clinicError.message };

  await supabase.from("clinic_settings").upsert(
    { clinic_id: input.clinicId, key: "currency", value: input.currency },
    { onConflict: "clinic_id,key" }
  );

  revalidatePath("/admin/settings/clinic");
  revalidatePath("/admin/dashboard");
  return { success: true };
}
