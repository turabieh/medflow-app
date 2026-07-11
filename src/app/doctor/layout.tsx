import { redirect } from "next/navigation";
import { FloatingChatButton } from "@/components/chat/floating-chat-button";
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

  // Active inpatients from inpatients table (created via inpatient portal)
  const { data: activeInpatients } = await supabase
    .from("inpatients")
    .select("id, admission_date, hospital_patient_id, patient_id, patients(id, full_name)")
    .eq("doctor_id", profile.id)
    .eq("clinic_id", profile.clinic_id)
    .eq("status", "active")
    .order("admission_date", { ascending: false })
    .limit(20);

  // Today's visits for inpatients
  const inpatientIds = (activeInpatients ?? []).map(i => i.id);
  const { data: todayInpatientVisits } = inpatientIds.length
    ? await supabase.from("visits")
        .select("id, inpatient_id")
        .in("inpatient_id", inpatientIds)
        .eq("visit_date", todayStr)
        .eq("visit_context", "inpatient")
    : { data: [] };
  const todayVisitByInpatient = new Map((todayInpatientVisits ?? []).map(v => [v.inpatient_id, v.id]));

  // Outpatient visit IDs (for sidebar links)
  const { data: outpatientVisits } = (todayAppts ?? []).length
    ? await supabase.from("visits").select("id, appointment_id")
        .in("appointment_id", (todayAppts ?? []).map(a => a.id))
    : { data: [] };
  const visitByAppt = new Map((outpatientVisits ?? []).map(v => [v.appointment_id, v.id]));

  // Patient names for outpatients
  const outPatientIds = (todayAppts ?? []).map(a => a.patient_id);
  const { data: outPatients } = outPatientIds.length
    ? await supabase.from("patients").select("id, full_name").in("id", outPatientIds)
    : { data: [] };
  const patientsById = new Map((outPatients ?? []).map(p => [p.id, p.full_name]));

  const sidebarPatients = (todayAppts ?? []).map((a) => ({
    appointmentId: a.id,
    visitId: visitByAppt.get(a.id) ?? null,
    patientName: patientsById.get(a.patient_id) ?? "Unknown",
    startTime: a.start_time,
    status: a.status,
    visitType: a.visit_type,
  }));

  const sidebarInpatients = (activeInpatients ?? []).map(ip => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pt = Array.isArray(ip.patients) ? ip.patients[0] : ip.patients as any;
    return {
      inpatientId: ip.id,
      appointmentId: ip.id,
      visitId: todayVisitByInpatient.get(ip.id) ?? null,
      patientName: pt?.full_name ?? "Unknown",
      startTime: ip.admission_date,
      status: "active",
      visitType: "inpatient",
      hospitalMrn: ip.hospital_patient_id,
    };
  });

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
      <FloatingChatButton
        userId={user.id}
        clinicId={profile?.clinic_id ?? ""}
        staff={chatStaff.data as {id:string;full_name:string;role:string}[]}
        quickTasks={chatTasks.data as {id:string;label:string;category:string}[]}
      />
    </div>
  );
}
