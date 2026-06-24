"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type HospitalInput = {
  name: string;
  address?: string;
  primary_phone: string;
  secondary_phone?: string;
  portal_link?: string;
};

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };
  const { data: profile } = await supabase.from("users").select("role, clinic_id").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false as const, error: "Admins only." };
  return { ok: true as const, supabase, clinicId: profile.clinic_id };
}

export async function addHospital(clinicId: string, data: HospitalInput) {
  const auth = await getAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase.from("hospitals").insert({
    clinic_id:       clinicId,
    name:            data.name.trim(),
    address:         data.address?.trim() || null,
    primary_phone:   data.primary_phone.trim(),
    secondary_phone: data.secondary_phone?.trim() || null,
    portal_link:     data.portal_link?.trim() || null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/hospitals");
  return { success: true };
}

export async function updateHospital(id: string, data: HospitalInput) {
  const auth = await getAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase.from("hospitals").update({
    name:            data.name.trim(),
    address:         data.address?.trim() || null,
    primary_phone:   data.primary_phone.trim(),
    secondary_phone: data.secondary_phone?.trim() || null,
    portal_link:     data.portal_link?.trim() || null,
    updated_at:      new Date().toISOString(),
  }).eq("id", id).eq("clinic_id", auth.clinicId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/hospitals");
  return { success: true };
}

export async function toggleHospital(id: string, isActive: boolean) {
  const auth = await getAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  await auth.supabase.from("hospitals").update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id).eq("clinic_id", auth.clinicId);
  revalidatePath("/admin/hospitals");
  return { success: true };
}

export async function deleteHospital(id: string) {
  const auth = await getAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  await auth.supabase.from("hospitals").delete().eq("id", id).eq("clinic_id", auth.clinicId);
  revalidatePath("/admin/hospitals");
  return { success: true };
}
