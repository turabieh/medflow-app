"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Not authenticated." };

  const { data: profile, error } = await supabase
    .from("users")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) return { ok: false as const, error: "Could not resolve your account." };
  if (profile.role !== "admin") return { ok: false as const, error: "Only admins can manage staff." };

  return { ok: true as const, supabase, clinicId: profile.clinic_id };
}

export interface CreateStaffInput {
  fullName: string;
  email: string;
  password: string;
  role: "doctor" | "secretary" | "nurse" | "admin";
  specialty?: string;
}

/**
 * Creates a new staff member: a real Supabase Auth user plus the linked
 * profile row in `users`. Uses the admin client (service_role) since
 * creating auth users requires elevated privileges the logged-in admin's
 * own session doesn't have.
 */
export async function createStaffMember(input: CreateStaffInput) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.fullName?.trim() || !input.email?.trim() || !input.password) {
    return { success: false, error: "Name, email, and password are required." };
  }
  if (input.password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  const adminClient = createAdminClient();

  const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
    email: input.email.trim(),
    password: input.password,
    email_confirm: true,
  });

  if (authError || !newAuthUser.user) {
    return { success: false, error: authError?.message ?? "Could not create login for this staff member." };
  }

  const { error: profileError } = await adminClient.from("users").insert({
    id: newAuthUser.user.id,
    clinic_id: auth.clinicId,
    full_name: input.fullName.trim(),
    role: input.role,
    email: input.email.trim(),
    specialty: input.specialty?.trim() || null,
  });

  if (profileError) {
    // Roll back the auth user so we don't leave an orphaned login with
    // no profile -- that would be confusing and broken.
    await adminClient.auth.admin.deleteUser(newAuthUser.user.id);
    return { success: false, error: profileError.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deactivateStaffMember(userId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from("users")
    .update({ is_active: false })
    .eq("id", userId)
    .eq("clinic_id", auth.clinicId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function reactivateStaffMember(userId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from("users")
    .update({ is_active: true })
    .eq("id", userId)
    .eq("clinic_id", auth.clinicId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateStaffMember(userId: string, input: {
  fullName: string;
  role: string;
  specialty?: string;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!input.fullName?.trim()) return { success: false, error: "Name is required." };

  const { error } = await auth.supabase
    .from("users")
    .update({
      full_name: input.fullName.trim(),
      role: input.role,
      specialty: input.specialty?.trim() || null,
    })
    .eq("id", userId)
    .eq("clinic_id", auth.clinicId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings/users");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function uploadDoctorSignature(
  userId: string,
  signatureBase64: string,
  mimeType: string
): Promise<{ success: boolean; error?: string; url?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("users").select("role, clinic_id").eq("id", user.id).single();
  if (!profile) return { success: false, error: "Profile not found." };
  if (profile.role !== "admin" && user.id !== userId) {
    return { success: false, error: "Not authorized." };
  }

  const ext = mimeType.split("/")[1]?.split("+")[0] ?? "png";
  const path = `${profile.clinic_id}/signatures/${userId}.${ext}`;
  const buffer = Buffer.from(signatureBase64, "base64");

  // Try admin client first, fall back to regular client
  let uploadError: { message: string } | null = null;
  let publicUrl = "";

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.storage
      .from("clinic-assets")
      .upload(path, buffer, { contentType: mimeType, upsert: true });
    uploadError = error;
    if (!error) {
      const { data: { publicUrl: url } } = adminClient.storage.from("clinic-assets").getPublicUrl(path);
      publicUrl = url;
    }
  } catch {
    // Admin client not configured — try regular client
    const { error } = await supabase.storage
      .from("clinic-assets")
      .upload(path, buffer, { contentType: mimeType, upsert: true });
    uploadError = error;
    if (!error) {
      const { data: { publicUrl: url } } = supabase.storage.from("clinic-assets").getPublicUrl(path);
      publicUrl = url;
    }
  }

  if (uploadError) return { success: false, error: `Upload failed: ${uploadError.message}. Make sure the "clinic-assets" storage bucket exists and is public in Supabase.` };

  const { error: dbError } = await supabase.from("users")
    .update({ signature_url: publicUrl })
    .eq("id", userId);

  if (dbError) return { success: false, error: `Saved to storage but DB update failed: ${dbError.message}` };

  revalidatePath("/doctor/settings");
  return { success: true, url: publicUrl };
}
