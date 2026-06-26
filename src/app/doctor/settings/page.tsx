import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScheduleManager } from "@/app/settings/schedules/schedule-manager";
import { SignatureUpload } from "@/components/doctor/signature-upload";
import { DoctorQuickTasks } from "@/components/chat/doctor-quick-tasks";

export default async function DoctorSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("id, full_name, clinic_id, signature_url").eq("id", user.id).single();

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

  const { data: quickTasks } = await supabase
    .from("chat_quick_tasks")
    .select("id, label, category, sort_order, is_active")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .order("sort_order");

  // Only pass this doctor as the list so they can only edit their own
  const doctors = [{ id: profile?.id ?? "", full_name: profile?.full_name ?? "" }];

  return (
    <div className="p-6">
      <h1 className="mb-1 text-lg font-medium text-neutral-900">My Settings</h1>

      {/* Signature */}
      <div className="mb-8">
        <h2 className="mb-1 text-sm font-medium text-neutral-700">Handwritten Signature</h2>
        <p className="mb-3 text-xs text-neutral-500">Upload an image of your signature. It appears at the bottom of printed reports.</p>
        <SignatureUpload userId={profile?.id ?? ""} currentSignatureUrl={profile?.signature_url ?? null} />
      </div>

      <h2 className="mb-1 text-sm font-medium text-neutral-700">My Schedule</h2>
      <p className="mb-4 text-xs text-neutral-500">Set your working hours and block dates when unavailable.</p>
      <ScheduleManager
        doctors={doctors}
        initialWorkingHours={workingHours ?? []}
        initialBlocks={blocks ?? []}
      />
      <div className="mt-8">
        <h2 className="mb-1 text-base font-semibold text-neutral-900">⚡ Quick Chat Tasks</h2>
        <p className="mb-4 text-sm text-neutral-500">Manage your one-tap messages to send to the secretary.</p>
        <DoctorQuickTasks clinicId={profile?.clinic_id ?? ""} tasks={quickTasks ?? []} />
      </div>
    </div>
  );
}
