import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VisitTabs } from "@/components/doctor/visit/visit-tabs";

export const dynamic = "force-dynamic";

export default async function VisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the visit with appointment and patient data
  const { data: visit, error } = await supabase
    .from("visits")
    .select(`
      id, visit_date, visit_type, status,
      blood_pressure, heart_rate, temperature, oxygen_saturation,
      weight_kg, height_cm, resp_rate,
      subjective, objective, assessment, plan,
      voice_notes, key_clinical_points, clinical_note,
      appointment_id,
      patient_id,
      doctor_id
    `)
    .eq("id", id)
    .single();

  if (error || !visit) notFound();

  // Patient
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, full_name_ar, dob, gender, blood_type, allergies, phone, insurance_company_id, insurance_policy_number, insurance_expiry_date, insurance_companies(name)")
    .eq("id", visit.patient_id)
    .single();

  // Appointment symptoms (pre-checked from booking)
  const { data: apptSymptoms } = await supabase
    .from("appointment_symptoms")
    .select("symptom_id, symptoms_catalog(id, name, category)")
    .eq("appointment_id", visit.appointment_id);

  const preCheckedSymptomIds = new Set(
    (apptSymptoms ?? []).map((s) => s.symptom_id)
  );
  const preCheckedSymptomNames = (apptSymptoms ?? [])
    .map((s) => {
      const cat = Array.isArray(s.symptoms_catalog) ? s.symptoms_catalog[0] : s.symptoms_catalog;
      return (cat as { name?: string } | null)?.name ?? "";
    })
    .filter(Boolean);

  // Clinic's full symptoms catalog, grouped by category
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user.id).single();

  const { data: symptomsCatalog } = await supabase
    .from("symptoms_catalog")
    .select("id, name, name_ar, category, is_active")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .eq("is_active", true)
    .order("category")
    .order("name");

  // Visit symptoms already checked by doctor this visit
  const { data: visitSymptoms } = await supabase
    .from("visit_symptoms")
    .select("symptom_id")
    .eq("visit_id", visit.id);
  const checkedSymptomIds = new Set((visitSymptoms ?? []).map((s) => s.symptom_id));

  // Labs
  const { data: labs } = await supabase
    .from("visit_labs")
    .select("id, type, name, lab_date, findings, link_url")
    .eq("visit_id", visit.id)
    .order("created_at");

  // Prescriptions
  const { data: prescriptions } = await supabase
    .from("prescriptions")
    .select("id, medication_id, medication_name, dose, unit, instructions, duration")
    .eq("visit_id", visit.id)
    .order("created_at");

  // Medications catalog for dropdown
  const { data: medsCatalog } = await supabase
    .from("medications_catalog")
    .select("id, name, default_dose, default_unit")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .eq("is_active", true)
    .order("name");

  // Diagnoses
  const { data: diagnoses } = await supabase
    .from("visit_diagnoses")
    .select("id, icd_code, description, is_primary")
    .eq("visit_id", visit.id)
    .order("created_at");

  // Procedures catalog
  const { data: proceduresCatalog } = await supabase
    .from("procedures_catalog")
    .select("id, name, outpatient_price, inpatient_price")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .eq("is_active", true)
    .order("name");

  // Parse manual symptoms stored in the subjective field
  const manualSymptoms = (visit.subjective ?? "")
    .split("\n")
    .filter((line: string) => line.startsWith("[MANUAL_SYMPTOM:"))
    .map((line: string) => line.replace("[MANUAL_SYMPTOM:", "").replace("]", "").trim())
    .filter(Boolean);

  const insuranceCompany = patient?.insurance_companies
    ? (Array.isArray(patient.insurance_companies) ? patient.insurance_companies[0] : patient.insurance_companies) as { name?: string } | null
    : null;

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {/* Patient header bar */}
      <div className="flex-shrink-0 border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-neutral-900">
              {patient?.full_name}
              {patient?.full_name_ar && (
                <span className="ml-3 text-sm font-normal text-neutral-400" dir="rtl">
                  {patient.full_name_ar}
                </span>
              )}
            </h1>
            <p className="text-xs text-neutral-500">
              {patient?.dob} · {patient?.gender} · {patient?.blood_type ?? "Blood type unknown"} ·
              {visit.visit_type} visit
              {preCheckedSymptomNames.length > 0 && (
                <span className="ml-2 text-indigo-600">
                  Reported: {preCheckedSymptomNames.join(", ")}
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              visit.status === "in_progress" ? "bg-indigo-100 text-indigo-700" :
              visit.status === "done" ? "bg-orange-100 text-orange-700" :
              "bg-neutral-100 text-neutral-600"
            }`}>
              {visit.status === "in_progress" ? "In progress" : visit.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tab content - fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <VisitTabs
          visitId={visit.id}
          appointmentId={visit.appointment_id}
          clinicId={profile?.clinic_id ?? ""}
          patient={{
            id: patient?.id ?? "",
            full_name: patient?.full_name ?? "",
            full_name_ar: patient?.full_name_ar ?? null,
            dob: patient?.dob ?? null,
            gender: patient?.gender ?? null,
            blood_type: patient?.blood_type ?? null,
            allergies: patient?.allergies ?? null,
            phone: patient?.phone ?? "",
            insurance_company_name: insuranceCompany?.name ?? null,
            insurance_policy_number: patient?.insurance_policy_number ?? null,
          }}
          vitals={{
            heart_rate: visit.heart_rate,
            blood_pressure: visit.blood_pressure,
            temperature: visit.temperature,
            oxygen_saturation: visit.oxygen_saturation,
            resp_rate: visit.resp_rate,
            weight_kg: visit.weight_kg,
            height_cm: visit.height_cm,
          }}
          symptomsCatalog={symptomsCatalog ?? []}
          preCheckedSymptomIds={Array.from(preCheckedSymptomIds)}
          checkedSymptomIds={Array.from(checkedSymptomIds)}
          manualSymptoms={manualSymptoms}
          labs={labs ?? []}
          prescriptions={prescriptions ?? []}
          medsCatalog={medsCatalog ?? []}
          diagnoses={diagnoses ?? []}
          visitStatus={visit.status}
          voiceNotes={visit.voice_notes ?? null}
          keyPoints={visit.key_clinical_points ?? null}
          clinicalNote={visit.clinical_note ?? null}
        />
      </div>
    </div>
  );
}
