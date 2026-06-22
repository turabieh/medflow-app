import { createClient } from "@/lib/supabase/server";
import { ScheduleManager } from "./schedule-manager";

export default async function SchedulesSettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("clinic_id")
    .eq("id", user?.id ?? "")
    .single();

  const { data: doctors } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .eq("role", "doctor")
    .eq("is_active", true)
    .order("full_name");

  const { data: workingHours } = await supabase
    .from("doctor_working_hours")
    .select("id, doctor_id, day_of_week, open_time, close_time, has_break, break_start, break_end");

  const { data: blocks } = await supabase
    .from("doctor_schedule_blocks")
    .select("id, doctor_id, block_date, start_time, end_time, reason")
    .gte("block_date", new Date().toISOString().split("T")[0])
    .order("block_date");

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-xl font-medium text-neutral-900">Doctor schedules</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Set each doctor&apos;s regular weekly hours and add one-off closures (holidays, time off).
        </p>

        {(!doctors || doctors.length === 0) ? (
          <p className="text-sm text-neutral-500">No doctors found for this clinic yet.</p>
        ) : (
          <ScheduleManager
            doctors={doctors}
            initialWorkingHours={workingHours ?? []}
            initialBlocks={blocks ?? []}
          />
        )}
      </div>
    </div>
  );
}
