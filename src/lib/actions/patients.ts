"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CreatePatientInput {
  full_name: string;
  full_name_ar?: string;
  dob?: string;
  gender?: "male" | "female";
  phone: string;
  phone2?: string;
  phone2_relation?: string;
  address?: string;
  email?: string;
  national_id?: string;
  blood_type?: string;
  allergies?: string;
}

export interface CreatePatientResult {
  success: boolean;
  patientId?: string;
  error?: string;
}

/**
 * Creates a new patient record.
 *
 * clinic_id is NOT taken from the client — it's looked up server-side from
 * the logged-in user's own row, so there's no way for a request to inject
 * a different clinic_id and create a patient under someone else's tenant.
 * RLS provides a second layer of defense even if this check were bypassed.
 */
export async function createPatient(
  input: CreatePatientInput
): Promise<CreatePatientResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  if (!input.full_name?.trim()) {
    return { success: false, error: "Patient name is required." };
  }
  if (!input.phone?.trim()) {
    return { success: false, error: "Phone number is required." };
  }

  // Look up the caller's own clinic_id — never trust a client-supplied value.
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("clinic_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "Could not resolve your clinic. Try logging in again." };
  }

  const { data, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: profile.clinic_id,
      full_name: input.full_name.trim(),
      full_name_ar: input.full_name_ar?.trim() || null,
      dob: input.dob || null,
      gender: input.gender || null,
      phone: input.phone.trim(),
      phone2: input.phone2?.trim() || null,
      phone2_relation: input.phone2_relation?.trim() || null,
      address: input.address?.trim() || null,
      email: input.email?.trim() || null,
      national_id: input.national_id?.trim() || null,
      blood_type: input.blood_type || null,
      allergies: input.allergies?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/patients");

  return { success: true, patientId: data.id };
}
