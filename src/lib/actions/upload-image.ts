"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadClinicImage(
  base64: string,
  mimeType: string,
  folder: string
): Promise<{ success: boolean; error?: string; url?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("users").select("clinic_id, role").eq("id", user.id).single();
  if (!profile?.clinic_id) return { success: false, error: "No clinic found." };

  const ext    = mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
  const path   = `${profile.clinic_id}/${folder}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(base64, "base64");

  let publicUrl = "";
  let uploadError: { message: string } | null = null;

  // Use admin client (bypasses RLS — same as signature upload)
  try {
    const admin = createAdminClient();
    const { error } = await admin.storage
      .from("clinic-assets")
      .upload(path, buffer, { contentType: mimeType, upsert: false });
    uploadError = error;
    if (!error) {
      const { data: { publicUrl: url } } = admin.storage.from("clinic-assets").getPublicUrl(path);
      publicUrl = url;
    }
  } catch {
    // Fallback: regular client
    const { error } = await supabase.storage
      .from("clinic-assets")
      .upload(path, buffer, { contentType: mimeType, upsert: false });
    uploadError = error;
    if (!error) {
      const { data: { publicUrl: url } } = supabase.storage.from("clinic-assets").getPublicUrl(path);
      publicUrl = url;
    }
  }

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }
  return { success: true, url: publicUrl };
}
