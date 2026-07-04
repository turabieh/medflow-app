import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClinicPageEditor } from "./clinic-page-editor";

export default async function ClinicPageAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("clinic_id, role").eq("id", user.id).single();
  if (!profile?.clinic_id) redirect("/login");

  const clinicId = profile.clinic_id as string;

  const { data: clinic } = await supabase
    .from("clinics").select("*").eq("id", clinicId).single();

  const [
    { data: page },
    { data: services },
    { data: doctors },
    { data: testimonials },
    { data: customSections },
  ] = await Promise.all([
    supabase.from("clinic_page").select("*").eq("clinic_id", clinicId).single(),
    supabase.from("clinic_services").select("*").eq("clinic_id", clinicId).order("sort_order"),
    supabase.from("clinic_doctors_public").select("*").eq("clinic_id", clinicId).order("sort_order"),
    supabase.from("clinic_testimonials").select("*").eq("clinic_id", clinicId).order("sort_order"),
    supabase.from("clinic_custom_sections").select("*").eq("clinic_id", clinicId).order("sort_order"),
  ]);

  return (
    <ClinicPageEditor
      clinicId={clinicId}
      clinic={clinic ?? {}}
      page={page ?? null}
      services={services ?? []}
      doctors={doctors ?? []}
      testimonials={testimonials ?? []}
      customSections={customSections ?? []}
    />
  );
}
