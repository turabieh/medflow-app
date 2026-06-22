"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireStaffAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "Not authenticated." };
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return { ok: false as const, error: "Could not resolve your account." };
  }

  // Secretary, doctor, and admin can all manage schedules — per the
  // clinic's actual workflow, the secretary needs to update a doctor's
  // schedule when they call in, not just view it.
  if (!["admin", "doctor", "secretary"].includes(profile.role)) {
    return { ok: false as const, error: "Not authorized to manage schedules." };
  }

  return { ok: true as const, supabase, clinicId: profile.clinic_id };
}

export interface SetWorkingHoursInput {
  doctorId: string;
  dayOfWeek: number; // 0-6
  isWorking: boolean; // false = remove the row entirely (doctor off that day)
  openTime?: string;
  closeTime?: string;
  hasBreak?: boolean;
  breakStart?: string;
  breakEnd?: string;
}

export async function setDoctorWorkingHours(input: SetWorkingHoursInput) {
  const auth = await requireStaffAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.isWorking) {
    const { error } = await auth.supabase
      .from("doctor_working_hours")
      .delete()
      .eq("doctor_id", input.doctorId)
      .eq("day_of_week", input.dayOfWeek);

    if (error) return { success: false, error: error.message };
    revalidatePath("/settings/schedules");
    return { success: true };
  }

  if (!input.openTime || !input.closeTime) {
    return { success: false, error: "Open and close time are required." };
  }

  const { error } = await auth.supabase.from("doctor_working_hours").upsert(
    {
      doctor_id: input.doctorId,
      clinic_id: auth.clinicId,
      day_of_week: input.dayOfWeek,
      open_time: input.openTime,
      close_time: input.closeTime,
      has_break: input.hasBreak ?? false,
      break_start: input.hasBreak ? input.breakStart || null : null,
      break_end: input.hasBreak ? input.breakEnd || null : null,
    },
    { onConflict: "doctor_id,day_of_week" }
  );

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/schedules");
  return { success: true };
}

export interface AddScheduleBlockInput {
  doctorId: string;
  blockDate: string;
  wholeDay: boolean;
  startTime?: string;
  endTime?: string;
  reason: string;
}

export async function addScheduleBlock(input: AddScheduleBlockInput) {
  const auth = await requireStaffAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.reason?.trim()) {
    return { success: false, error: "A reason is required for the block." };
  }
  if (!input.wholeDay && (!input.startTime || !input.endTime)) {
    return { success: false, error: "Start and end time are required for a partial-day block." };
  }

  const {
    data: { user },
  } = await auth.supabase.auth.getUser();

  const { error } = await auth.supabase.from("doctor_schedule_blocks").insert({
    doctor_id: input.doctorId,
    clinic_id: auth.clinicId,
    block_date: input.blockDate,
    start_time: input.wholeDay ? null : input.startTime,
    end_time: input.wholeDay ? null : input.endTime,
    reason: input.reason.trim(),
    created_by: user?.id ?? null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/schedules");
  return { success: true };
}

export async function removeScheduleBlock(blockId: string) {
  const auth = await requireStaffAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from("doctor_schedule_blocks")
    .delete()
    .eq("id", blockId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/schedules");
  return { success: true };
}
