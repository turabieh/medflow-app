import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InpatientPortalClient } from "./portal-client";

export const dynamic = "force-dynamic";

export default async function InpatientPortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/inpatient-portal");

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, clinic_id, role, specialty")
    .eq("id", user.id).single();

  if (!profile || !["doctor", "admin"].includes(profile.role ?? "")) {
    redirect("/login");
  }

  // Fetch active inpatients for this doctor
  const { data: inpatients } = await supabase
    .from("inpatients")
    .select(`
      id, hospital_patient_id, location, status, admitted_at,
      hospitals(id, name),
      patients(id, full_name, full_name_ar, dob, gender, blood_type)
    `)
    .eq("clinic_id", profile.clinic_id)
    .eq("doctor_id", profile.id)
    .eq("status", "active")
    .order("admitted_at", { ascending: false });

  // Fetch today's visits for these inpatients
  const today = new Date().toISOString().split("T")[0];
  const inpatientIds = (inpatients ?? []).map(ip => ip.id);

  const { data: todayVisits } = inpatientIds.length ? await supabase
    .from("visits")
    .select("id, inpatient_id, visit_date, status, visit_type")
    .in("inpatient_id", inpatientIds)
    .eq("visit_date", today) : { data: [] };

  const visitedToday = new Set((todayVisits ?? []).map(v => v.inpatient_id));

  // Group by hospital
  const byHospital = new Map<string, { hospital: { id: string; name: string }; patients: typeof inpatients }>();
  for (const ip of inpatients ?? []) {
    const hosp = Array.isArray(ip.hospitals) ? ip.hospitals[0] : ip.hospitals as { id: string; name: string } | null;
    if (!hosp) continue;
    if (!byHospital.has(hosp.id)) byHospital.set(hosp.id, { hospital: hosp, patients: [] });
    byHospital.get(hosp.id)!.patients!.push(ip);
  }

  return (
    <InpatientPortalClient
      doctor={{ id: profile.id, name: profile.full_name, specialty: profile.specialty }}
      groups={Array.from(byHospital.values())}
      visitedToday={[...visitedToday]}
      today={today}
      clinicId={profile.clinic_id}
    />
  );
}
