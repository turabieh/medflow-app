import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DoctorSidebarNav } from "@/components/doctor/layout/sidebar";

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, role, clinic_id, specialty, clinics(name, logo_url)")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "doctor") redirect("/dashboard");

  const clinic = Array.isArray(profile.clinics) ? profile.clinics[0] : profile.clinics;
  const cl = clinic as { name?: string; logo_url?: string | null } | null;
  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch today's outpatients for this doctor
  const { data: todayAppts } = await supabase
    .from("appointments")
    .select("id, start_time, status, visit_type, patient_id")
    .eq("doctor_id", profile.id)
    .eq("appt_date", todayStr)
    .in("status", ["booked", "confirmed", "arrived", "with_doctor", "done", "finalized"])
    .order("start_time", { ascending: true });

  // Inpatients — appointments without a specific date (or marked as inpatient)
  // For now: booked appointments where appt_date is past (still active)
  const { data: inpatientAppts } = await supabase
    .from("appointments")
    .select("id, start_time, status, visit_type, patient_id, appt_date")
    .eq("doctor_id", profile.id)
    .eq("visit_type", "inpatient")
    .in("status", ["arrived", "with_doctor", "done"])
    .order("appt_date", { ascending: false })
    .limit(10);

  const allPatientIds = [
    ...(todayAppts ?? []).map((a) => a.patient_id),
    ...(inpatientAppts ?? []).map((a) => a.patient_id),
  ];
  const { data: patients } = allPatientIds.length
    ? await supabase.from("patients").select("id, full_name").in("id", [...new Set(allPatientIds)])
    : { data: [] };
  const patientsById = new Map((patients ?? []).map((p) => [p.id, p.full_name]));

  const allApptIds = [
    ...(todayAppts ?? []).map((a) => a.id),
    ...(inpatientAppts ?? []).map((a) => a.id),
  ];
  const { data: visits } = allApptIds.length
    ? await supabase.from("visits").select("id, appointment_id").in("appointment_id", allApptIds)
    : { data: [] };
  const visitByAppt = new Map((visits ?? []).map((v) => [v.appointment_id, v.id]));

  const sidebarPatients = (todayAppts ?? []).map((a) => ({
    appointmentId: a.id,
    visitId: visitByAppt.get(a.id) ?? null,
    patientName: patientsById.get(a.patient_id) ?? "Unknown",
    startTime: a.start_time,
    status: a.status,
    visitType: a.visit_type,
  }));

  const sidebarInpatients = (inpatientAppts ?? []).map((a) => ({
    appointmentId: a.id,
    visitId: visitByAppt.get(a.id) ?? null,
    patientName: patientsById.get(a.patient_id) ?? "Unknown",
    startTime: a.start_time,
    status: a.status,
    visitType: a.visit_type,
  }));

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <DoctorSidebarNav
        doctorId={profile.id}
        doctorName={profile.full_name}
        specialty={profile.specialty}
        clinicName={cl?.name ?? "Clinic"}
        logoUrl={cl?.logo_url}
        patients={sidebarPatients}
        inpatients={sidebarInpatients}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
