import { createClient } from "@/lib/supabase/server";
import { VisitDurationsForm } from "./visit-durations-form";

export const dynamic = "force-dynamic";

export const VISIT_TYPES = [
  { key: "new",          label: "New Patient",    description: "First visit, full assessment" },
  { key: "follow_up",    label: "Follow-up",      description: "Returning patient, existing case" },
  { key: "urgent",       label: "Urgent",         description: "Urgent/emergency consultation" },
  { key: "consultation", label: "Consultation",   description: "Specialist opinion or review" },
];

export const DEFAULT_DURATIONS: Record<string, number> = {
  new:          45,
  follow_up:    30,
  urgent:       15,
  consultation: 30,
};

export default async function VisitDurationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("clinic_id, role").eq("id", user?.id ?? "").single();

  if (profile?.role !== "admin") {
    return <div className="p-6 text-sm text-red-600">Access denied.</div>;
  }

  const { data: setting } = await supabase
    .from("clinic_settings")
    .select("value")
    .eq("clinic_id", profile.clinic_id)
    .eq("key", "visit_type_durations")
    .single();

  const durations: Record<string, number> = setting?.value
    ? JSON.parse(setting.value)
    : DEFAULT_DURATIONS;

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Visit Durations</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Set how long each visit type takes. These control available time slots when booking appointments.
      </p>
      <VisitDurationsForm
        clinicId={profile.clinic_id}
        durations={durations}
        visitTypes={VISIT_TYPES}
      />
    </div>
  );
}
