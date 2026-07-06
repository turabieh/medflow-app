"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };
  const { data: profile, error } = await supabase
    .from("users").select("clinic_id, role").eq("id", user.id).single();
  if (error || !profile) return { ok: false as const, error: "Could not resolve your account." };
  if (profile.role !== "admin") return { ok: false as const, error: "Only admins can manage staff." };
  return { ok: true as const, supabase, clinicId: profile.clinic_id };
}

export interface CreateStaffInput {
  fullName: string; email: string; password: string;
  role: "doctor" | "secretary" | "nurse" | "admin"; specialty?: string;
}

export async function createStaffMember(input: CreateStaffInput) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!input.fullName?.trim() || !input.email?.trim() || !input.password)
    return { success: false, error: "Name, email, and password are required." };
  if (input.password.length < 6)
    return { success: false, error: "Password must be at least 6 characters." };
  const adminClient = createAdminClient();
  const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
    email: input.email.trim(), password: input.password, email_confirm: true,
  });
  if (authError || !newAuthUser.user)
    return { success: false, error: authError?.message ?? "Could not create login." };
  const { error: profileError } = await adminClient.from("users").insert({
    id: newAuthUser.user.id, clinic_id: auth.clinicId,
    full_name: input.fullName.trim(), role: input.role,
    email: input.email.trim(), specialty: input.specialty?.trim() || null,
  });
  if (profileError) {
    await adminClient.auth.admin.deleteUser(newAuthUser.user.id);
    return { success: false, error: profileError.message };
  }
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deactivateStaffMember(userId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  const { error } = await auth.supabase.from("users")
    .update({ is_active: false }).eq("id", userId).eq("clinic_id", auth.clinicId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function reactivateStaffMember(userId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  const { error } = await auth.supabase.from("users")
    .update({ is_active: true }).eq("id", userId).eq("clinic_id", auth.clinicId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateStaffMember(userId: string, input: {
  fullName: string; role: string; specialty?: string;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!input.fullName?.trim()) return { success: false, error: "Name is required." };
  const { error } = await auth.supabase.from("users")
    .update({ full_name: input.fullName.trim(), role: input.role, specialty: input.specialty?.trim() || null })
    .eq("id", userId).eq("clinic_id", auth.clinicId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings/users");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function deleteStaffMember(userId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const a = createAdminClient();

  // Verify user belongs to this clinic
  const { data: profile } = await a.from("users")
    .select("id, role").eq("id", userId).eq("clinic_id", auth.clinicId).single();
  if (!profile) return { success: false, error: "User not found in your clinic." };
  if (profile.role === "admin") return { success: false, error: "Cannot delete an admin. Deactivate instead." };

  // ── Nullify all NO ACTION / RESTRICT foreign keys ──────────────────
  // appointments
  await a.from("appointments").update({ doctor_id: null }).eq("doctor_id", userId);
  await a.from("appointments").update({ created_by: null }).eq("created_by", userId);
  await a.from("appointments").update({ archived_by: null }).eq("archived_by", userId);

  // chat messages & threads
  await a.from("chat_messages").update({ sender_id: null }).eq("sender_id", userId);
  await a.from("chat_messages").update({ recipient_id: null }).eq("recipient_id", userId);

  // prescriptions
  await a.from("prescriptions").update({ doctor_id: null }).eq("doctor_id", userId);

  // visits & addenda
  await a.from("visits").update({ doctor_id: null }).eq("doctor_id", userId);
  await a.from("visit_addenda").update({ doctor_id: null }).eq("doctor_id", userId);

  // tasks
  await a.from("tasks").update({ created_by: null }).eq("created_by", userId);
  await a.from("tasks").update({ assigned_to: null }).eq("assigned_to", userId);
  await a.from("tasks").update({ completed_by: null }).eq("completed_by", userId);

  // doctor schedule blocks created_by (doctor_id cascades automatically)
  await a.from("doctor_schedule_blocks").update({ created_by: null }).eq("created_by", userId);

  // hospital_claims & insurance_claims — RESTRICT, must nullify
  await a.from("hospital_claims").update({ doctor_id: null }).eq("doctor_id", userId);
  await a.from("insurance_claims").update({ created_by: null }).eq("created_by", userId);

  // ── Delete the users profile row ──────────────────────────────────
  // CASCADE tables (staff_attendance, staff_salaries, user_permissions,
  // doctor_working_hours, doctor_schedule_blocks, technician_* etc.)
  // will be deleted automatically by Postgres.
  const { error: profileError } = await a.from("users")
    .delete().eq("id", userId).eq("clinic_id", auth.clinicId);
  if (profileError) return { success: false, error: "Could not delete profile: " + profileError.message };

  // ── Delete from Supabase Auth (removes login entirely) ────────────
  const { error: authError } = await a.auth.admin.deleteUser(userId);
  if (authError) return { success: false, error: "Profile deleted but auth cleanup failed: " + authError.message };

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
  if (profile.role !== "admin" && user.id !== userId)
    return { success: false, error: "Not authorized." };

  const adminClient = createAdminClient();
  const ext = mimeType.split("/")[1]?.split("+")[0] ?? "png";
  const path = `${profile.clinic_id}/signatures/${userId}.${ext}`;
  const buffer = Buffer.from(signatureBase64, "base64");

  const { error: uploadError } = await adminClient.storage
    .from("clinic-assets")
    .upload(path, buffer, { contentType: mimeType, upsert: true });

  if (uploadError) return { success: false, error: uploadError.message };

  const { data: { publicUrl } } = adminClient.storage
    .from("clinic-assets").getPublicUrl(path);

  await supabase.from("users")
    .update({ signature_url: publicUrl }).eq("id", userId);

  revalidatePath("/doctor/settings");
  return { success: true, url: publicUrl };
}
