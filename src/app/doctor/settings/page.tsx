import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScheduleManager } from "@/app/settings/schedules/schedule-manager";

export default async function DoctorSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("id, full_name, clinic_id").eq("id", user.id).single();

  const { data: workingHours } = await supabase
    .from("doctor_working_hours")
    .select("id, doctor_id, day_of_week, open_time, close_time, has_break, break_start, break_end")
    .eq("doctor_id", profile?.id ?? "");

  const { data: blocks } = await supabase
    .from("doctor_schedule_blocks")
    .select("id, doctor_id, block_date, start_time, end_time, reason")
    .eq("doctor_id", profile?.id ?? "")
    .gte("block_date", new Date().toISOString().split("T")[0])
    .order("block_date");

  // Only pass this doctor as the list so they can only edit their own
  const doctors = [{ id: profile?.id ?? "", full_name: profile?.full_name ?? "" }];

  return (
    <div className="p-6">
      <h1 className="mb-1 text-lg font-medium text-neutral-900">My Schedule</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Set your working hours and block dates when unavailable.
      </p>
      <ScheduleManager
        doctors={doctors}
        initialWorkingHours={workingHours ?? []}
        initialBlocks={blocks ?? []}
      />
    </div>
  );
}
