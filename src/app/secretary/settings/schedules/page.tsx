import { createClient } from "@/lib/supabase/server";
import { ScheduleManager } from "@/app/settings/schedules/schedule-manager";

export default async function SecretarySchedulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user?.id ?? "").single();

  const { data: doctors } = await supabase
    .from("users").select("id, full_name")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .eq("role", "doctor").eq("is_active", true).order("full_name");

  const { data: blocks } = await supabase
    .from("doctor_schedule_blocks")
    .select("id, doctor_id, block_date, start_time, end_time, reason")
    .gte("block_date", new Date().toISOString().split("T")[0])
    .order("block_date");

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Doctor Schedules</h1>
      <p className="mb-6 text-sm text-neutral-500">Add one-off closures and blocked dates for doctors.</p>
      <ScheduleManager
        doctors={doctors ?? []}
        initialWorkingHours={[]}
        initialBlocks={blocks ?? []}
        showWorkingHours={false}
      />
    </div>
  );
}
