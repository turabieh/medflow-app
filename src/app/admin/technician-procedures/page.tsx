import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TechProceduresAdmin } from "./tech-procedures-admin";

export const dynamic = "force-dynamic";

export default async function TechnicianProceduresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("clinic_id, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: procedures } = await supabase
    .from("technician_procedures")
    .select("id, name, name_ar, category, description, variables, duration_min, price, is_active, sort_order")
    .eq("clinic_id", profile.clinic_id)
    .order("sort_order").order("name");

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Technician Procedures</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Define procedures and the variables (measurements) to collect per procedure.
      </p>
      <TechProceduresAdmin clinicId={profile.clinic_id} procedures={procedures ?? []} />
    </div>
  );
}
