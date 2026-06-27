import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TechReportForm } from "./tech-report-form";

export const dynamic = "force-dynamic";

export default async function TechAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/technician/login");

  const { data: profile } = await supabase
    .from("users").select("id, clinic_id, full_name, role").eq("id", user.id).single();
  if (!profile || profile.role !== "technician") redirect("/login");

  const { data: appt } = await supabase
    .from("technician_appointments")
    .select("*, patients(id, full_name, full_name_ar, dob, phone, gender, blood_type), technician_procedures(id, name, name_ar, variables, price, duration_min, category)")
    .eq("id", id).single();

  if (!appt) redirect("/technician");

  const { data: report } = await supabase
    .from("technician_reports")
    .select("*")
    .eq("appointment_id", id)
    .single();

  const proc = Array.isArray(appt.technician_procedures)
    ? appt.technician_procedures[0]
    : appt.technician_procedures as {id:string;name:string;name_ar:string|null;variables:Variable[];price:number|null;duration_min:number;category:string}|null;

  const patient = Array.isArray(appt.patients)
    ? appt.patients[0]
    : appt.patients as {id:string;full_name:string;full_name_ar:string|null;dob:string|null;phone:string;gender:string|null;blood_type:string|null}|null;

  return (
    <TechReportForm
      appointment={appt}
      procedure={proc}
      patient={patient}
      existingReport={report ?? null}
      technicianId={profile.id}
      clinicId={profile.clinic_id}
      technicianName={profile.full_name}
    />
  );
}

interface Variable {
  key: string; label: string; label_ar?: string;
  type: "text"|"number"|"select"|"boolean"; unit?: string; options?: string; required: boolean;
}
