"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const { data: profile } = await supabase.from("users").select("id, clinic_id, role").eq("id", user.id).single();
  if (!profile) return { ok: false as const, error: "Profile not found" };
  return { ok: true as const, supabase, userId: profile.id, clinicId: profile.clinic_id, role: profile.role };
}

export async function markTechArrived(appointmentId: string) {
  const auth = await getAuth();
  if (!auth.ok) return;
  await auth.supabase.from("technician_appointments")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", appointmentId).eq("clinic_id", auth.clinicId);
  revalidatePath("/secretary/dashboard");
  revalidatePath("/technician");
}

export async function markTechDone(appointmentId: string) {
  const auth = await getAuth();
  if (!auth.ok) return;
  await auth.supabase.from("technician_appointments")
    .update({ status: "done", updated_at: new Date().toISOString() })
    .eq("id", appointmentId).eq("clinic_id", auth.clinicId);
  revalidatePath("/secretary/dashboard");
  revalidatePath("/technician");
}

export async function markTechNoShow(appointmentId: string) {
  const auth = await getAuth();
  if (!auth.ok) return;
  await auth.supabase.from("technician_appointments")
    .update({ status: "no_show", updated_at: new Date().toISOString() })
    .eq("id", appointmentId).eq("clinic_id", auth.clinicId);
  revalidatePath("/secretary/dashboard");
}

export async function cancelTechAppointment(appointmentId: string) {
  const auth = await getAuth();
  if (!auth.ok) return;
  await auth.supabase.from("technician_appointments")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", appointmentId).eq("clinic_id", auth.clinicId);
  revalidatePath("/secretary/dashboard");
}

export async function bookTechAppointment(input: {
  patientId: string;
  technicianId: string;
  procedureId: string;
  apptDate: string;
  startTime: string;
  endTime?: string;
  notes?: string;
  paymentMethod?: string;
  insuranceCompanyId?: string;
  insuranceAuthStatus?: string;
  insuranceAuthNumber?: string;
  amountDue?: number;
}) {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };
  const { data, error } = await auth.supabase.from("technician_appointments").insert({
    clinic_id:             auth.clinicId,
    technician_id:         input.technicianId,
    patient_id:            input.patientId,
    procedure_id:          input.procedureId,
    appt_date:             input.apptDate,
    start_time:            input.startTime,
    end_time:              input.endTime ?? null,
    status:                "scheduled",
    notes:                 input.notes ?? null,
    payment_method:        input.paymentMethod ?? null,
    insurance_company_id:  input.insuranceCompanyId ?? null,
    insurance_auth_status: input.insuranceAuthStatus ?? null,
    insurance_auth_number: input.insuranceAuthNumber ?? null,
    amount_due:            input.amountDue ?? null,
  }).select("id").single();
  if (error) return { success: false, error: error.message };
  revalidatePath("/secretary/technician-schedule");
  revalidatePath("/technician");
  return { success: true, id: data.id };
}
