import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TodoTemplatesClient from "./todo-templates-client";
export const dynamic = "force-dynamic";

export default async function TodoTemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("clinic_id, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/admin/dashboard");
  const { data: templates } = await supabase
    .from("todo_templates").select("*")
    .eq("clinic_id", profile.clinic_id)
    .order("sort_order");
  return <TodoTemplatesClient clinicId={profile.clinic_id} templates={templates??[]} />;
}
