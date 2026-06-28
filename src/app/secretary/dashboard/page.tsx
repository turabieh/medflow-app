import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SecretaryDashboard } from "@/components/dashboard/secretary-dashboard";

export const dynamic = "force-dynamic";

export default async function SecretaryDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user.id).single();
  if (!profile) redirect("/login");

  return <SecretaryDashboard clinicId={profile.clinic_id} />;
}
