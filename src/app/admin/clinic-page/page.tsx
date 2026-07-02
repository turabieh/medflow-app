import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClinicPageEditor } from "./clinic-page-editor";

export const dynamic = "force-dynamic";

export default async function AdminClinicPagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("clinic_id, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const clinicId = profile.clinic_id;

  const [
    { data: clinic },
    { data: page },
    { data: services },
    { data: doctors },
    { data: testimonials },
  ] = await Promise.all([
    supabase.from("clinics").select("id, name, name_ar, slug, logo_url, phone, email, address, currency").eq("id", clinicId).single(),
    supabase.from("clinic_page").select("*").eq("clinic_id", clinicId).single(),
    supabase.from("clinic_services").select("*").eq("clinic_id", clinicId).order("sort_order"),
    supabase.from("clinic_doctors_public").select("*").eq("clinic_id", clinicId).order("sort_order"),
    supabase.from("clinic_testimonials").select("*").eq("clinic_id", clinicId).order("sort_order"),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">Public Clinic Page</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Your clinic website at{" "}
            <a href={`/clinic/${clinic?.slug}`} target="_blank"
              className="text-blue-600 hover:underline font-mono text-xs">
              /clinic/{clinic?.slug}
            </a>
          </p>
        </div>
        <a href={`/clinic/${clinic?.slug}`} target="_blank"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          Preview →
        </a>
      </div>
      <ClinicPageEditor
        clinicId={clinicId}
        clinic={clinic as Record<string,unknown>}
        page={page as Record<string,unknown> | null}
        services={(services ?? []) as Record<string,unknown>[]}
        doctors={(doctors ?? []) as Record<string,unknown>[]}
        testimonials={(testimonials ?? []) as Record<string,unknown>[]}
      />
    </div>
  );
}
