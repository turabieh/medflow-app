import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { todayClinic } from "@/lib/clinic-timezone";
import { TechScheduleView } from "./tech-schedule-view";

export const dynamic = "force-dynamic";

export default async function SecretaryTechSchedulePage({
  searchParams,
}: { searchParams: Promise<{ date?: string }> }) {
  const { date: paramDate } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const today = todayClinic();
  const date  = paramDate ?? today;

  const [
    { data: technicians },
    { data: procedures },
    { data: appointments },
    { data: patients },
    { data: insuranceCompanies },
  ] = await Promise.all([
    supabase.from("users").select("id, full_name")
      .eq("clinic_id", profile.clinic_id).eq("role", "technician").eq("is_active", true).order("full_name"),
    supabase.from("technician_procedures").select("id, name, price, duration_min, category")
      .eq("clinic_id", profile.clinic_id).eq("is_active", true).order("category").order("name"),
    supabase.from("technician_appointments")
      .select("id, start_time, end_time, status, technician_id, payment_method, insurance_auth_status, patients(id, full_name, phone), technician_procedures(name, price, duration_min), users!technician_appointments_technician_id_fkey(full_name)")
      .eq("clinic_id", profile.clinic_id).eq("appt_date", date).order("start_time"),
    supabase.from("patients").select("id, full_name, phone")
      .eq("clinic_id", profile.clinic_id).order("full_name").limit(300),
    supabase.from("insurance_companies").select("id, name")
      .eq("clinic_id", profile.clinic_id).eq("is_active", true).order("name"),
  ]);

  return (
    <TechScheduleView
      date={date}
      today={today}
      clinicId={profile.clinic_id}
      technicians={technicians ?? []}
      procedures={procedures ?? []}
      appointments={(appointments ?? []) as any[]}
      patients={patients ?? []}
      insuranceCompanies={insuranceCompanies ?? []}
    />
  );
}
