import { createClient } from "@/lib/supabase/server";
import { ClinicSettingsForm } from "@/components/admin/clinic-settings-form";

export default async function ClinicSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user?.id ?? "").single();

  const clinicId = profile?.clinic_id ?? "";

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, name_ar, slug, logo_url, address, address_ar, phone, phone2, email, website, tagline, tagline_ar")
    .eq("id", clinicId)
    .single();

  const { data: settings } = await supabase
    .from("clinic_settings")
    .select("key, value")
    .eq("clinic_id", clinicId);

  const settingsMap = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));

  return (
    <div>
      <h1 className="mb-6 text-lg font-medium text-neutral-900">Clinic Settings</h1>
      <ClinicSettingsForm
        clinic={clinic ?? { id: clinicId, name: "", name_ar: null, slug: "", logo_url: null, address: null, address_ar: null, phone: null, phone2: null, email: null, website: null, tagline: null, tagline_ar: null }}
        currency={settingsMap.currency ?? "JOD"}
      />
    </div>
  );
}
