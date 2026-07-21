import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SecretaryDashboard } from "@/components/dashboard/secretary-dashboard";

export const dynamic = "force-dynamic";

export default async function SecretaryDashboardPage({ searchParams }: { searchParams: Promise<{ pdate?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const { pdate } = await searchParams;
  return <SecretaryDashboard clinicId={profile.clinic_id} pdate={pdate} />;
}
