import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DoctorSidebarNav } from "@/components/doctor/layout/sidebar";
import { FloatingChatButton } from "@/components/chat/floating-chat-button";

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

  // Chat: staff list and quick tasks for floating widget
  const [chatStaff, chatTasks] = await Promise.all([
    supabase.from("users").select("id, full_name, role")
      .eq("clinic_id", profile.clinic_id)
      .in("role", ["secretary","admin"]).neq("id", profile.id)
      .eq("is_active", true).order("full_name")
      .then(r => r.data ?? []),
    supabase.from("chat_quick_tasks").select("id, label, category")
      .eq("clinic_id", profile.clinic_id).eq("is_active", true).order("sort_order")
      .then(r => r.data ?? []),
  ]);

  // Fetch today's outpatients for this doctor
  const { data: todayAppts } = await supabase
    .from("appointments")
    .select("id, start_time, status, visit_type, patient_id")
    .eq("doctor_id", profile.id)
    .eq("appt_date", todayStr)
    .in("status", ["booked", "confirmed", "arrived", "with_doctor", "done", "finalized"])
    .order("start_time", { ascending: true });

  // Active inpatients from the inpatients table
  const { data: activeInpatients } = await supabase
    .from("inpatients")
    .select("id, location, patients(id, full_name), hospitals(name)")
    .eq("doctor_id", profile.id)
    .eq("clinic_id", profile.clinic_id)
    .eq("status", "active")
    .order("admission_date", { ascending: false })
    .limit(15);

  const allPatientIds = (todayAppts ?? []).map((a) => a.patient_id);
  const { data: patients } = allPatientIds.length
    ? await supabase.from("patients").select("id, full_name").in("id", [...new Set(allPatientIds)])
    : { data: [] };
  const patientsById = new Map((patients ?? []).map((p) => [p.id, p.full_name]));

  const allApptIds = (todayAppts ?? []).map((a) => a.id);
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

  const sidebarInpatients = (activeInpatients ?? []).map((ip) => {
    const pt = Array.isArray(ip.patients) ? ip.patients[0] : ip.patients as { id: string; full_name: string } | null;
    const hosp = Array.isArray(ip.hospitals) ? ip.hospitals[0] : ip.hospitals as { name: string } | null;
    return {
      inpatientId: ip.id,
      patientName: pt?.full_name ?? "Unknown",
      location: ip.location,
      hospitalName: hosp?.name ?? "",
    };
  });

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <style>{`@media print { aside, .doctor-sidebar { display: none !important; } .doctor-main { padding: 0 !important; } }`}</style>
      <aside className="doctor-sidebar">
        <DoctorSidebarNav
        doctorId={profile.id}
        doctorName={profile.full_name}
        specialty={profile.specialty}
        clinicName={cl?.name ?? "Clinic"}
        logoUrl={cl?.logo_url}
        patients={sidebarPatients}
        inpatients={sidebarInpatients}
      />
      </aside>
      <main className="doctor-main flex-1 overflow-y-auto">{children}</main>
      <FloatingChatButton userId={profile.id} clinicId={profile.clinic_id} staff={chatStaff as {id:string;full_name:string;role:string}[]} quickTasks={chatTasks as {id:string;label:string;category:string}[]} isDoctor={true} />
    </div>
  );
}
