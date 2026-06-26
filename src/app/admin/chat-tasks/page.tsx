import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatTasksAdmin } from "./tasks-admin";

export const dynamic = "force-dynamic";

export default async function AdminChatTasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("clinic_id, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: tasks } = await supabase
    .from("chat_quick_tasks")
    .select("id, label, category, sort_order, is_active")
    .eq("clinic_id", profile.clinic_id)
    .order("sort_order");

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Quick Tasks</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Manage predefined tasks doctors can send to secretary in one tap.
      </p>
      <ChatTasksAdmin clinicId={profile.clinic_id} tasks={tasks ?? []} />
    </div>
  );
}
