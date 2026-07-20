import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReportTypesClient from "./report-types-client";

export const dynamic = "force-dynamic";

export default async function ReportTypesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("clinic_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/admin/dashboard");

  const { data: reportTypes } = await supabase
    .from("report_types")
    .select("*")
    .eq("clinic_id", profile.clinic_id)
    .order("sort_order");

  return (
    <ReportTypesClient
      clinicId={profile.clinic_id}
      reportTypes={reportTypes ?? []}
    />
  );
}
