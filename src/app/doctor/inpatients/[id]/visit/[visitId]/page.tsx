import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InpatientVisitNotes } from "./inpatient-visit-notes";

export const dynamic = "force-dynamic";

const VISIT_TYPE_LABELS: Record<string, string> = {
  consultation: "Consultation",
  urgent:       "Urgent",
  follow_up:    "Follow-up",
  procedure:    "Procedure",
  round:        "Morning Round",
};

export default async function InpatientVisitPage({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const { id: inpatientId, visitId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user?.id ?? "").single();

  const { data: visit } = await supabase
    .from("visits")
    .select("id, visit_date, visit_time, visit_type, visit_fee, visit_fee_type, status, clinical_note, voice_notes, key_clinical_points, patient_summary, subjective, inpatient_id")
    .eq("id", visitId).single();

  if (!visit || visit.inpatient_id !== inpatientId) notFound();

  const { data: admission } = await supabase
    .from("inpatients")
    .select("patients(full_name, dob, blood_type, allergies), hospitals(name)")
    .eq("id", inpatientId).single();

  const { data: procedures } = await supabase
    .from("inpatient_visit_procedures")
    .select("id, procedure_name, price, notes, procedure_id")
    .eq("visit_id", visitId)
    .order("created_at");

  const { data: proceduresCatalog } = await supabase
    .from("procedures_catalog")
    .select("id, name, inpatient_price")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .eq("is_active", true)
    .order("name");

  const { data: clinicSetting } = await supabase
    .from("clinic_settings").select("value").eq("clinic_id", profile?.clinic_id ?? "").eq("key", "currency").single();
  const currency = clinicSetting?.value ?? "JOD";

  const patient = Array.isArray(admission?.patients) ? admission?.patients[0] : (admission?.patients ?? null) as unknown as { full_name: string; dob: string | null; blood_type: string | null; allergies: string | null } | null;
  const hospital = Array.isArray(admission?.hospitals) ? admission?.hospitals[0] : (admission?.hospitals ?? null) as unknown as { name: string } | null;

  const visitLabel = VISIT_TYPE_LABELS[visit.visit_fee_type ?? visit.visit_type] ?? visit.visit_type;
  const proceduresTotal = (procedures ?? []).reduce((sum, p) => sum + (p.price ?? 0), 0);
  const visitTotal = (visit.visit_fee ?? 0) + proceduresTotal;

  // Parse manual symptoms from subjective
  const manualSymptoms = (visit.subjective ?? "")
    .split("\n")
    .filter((l: string) => l.startsWith("[MANUAL_SYMPTOM:"))
    .map((l: string) => l.replace("[MANUAL_SYMPTOM:", "").replace("]", "").trim());

  return (
    <div className="p-6 max-w-2xl">
      {/* Back + header */}
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/doctor/inpatients/${inpatientId}`} className="text-sm text-neutral-500 hover:text-neutral-700">
          ← {patient?.full_name ?? "Inpatient"}
        </Link>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            visit.status === "done" || visit.status === "finalized"
              ? "bg-neutral-100 text-neutral-600"
              : "bg-blue-100 text-blue-700"
          }`}>{visit.status?.replace(/_/g, " ")}</span>
          <a href={`/print/inpatient-visit?visitId=${visitId}&inpatientId=${inpatientId}&currency=${currency}`}
            target="_blank" rel="noreferrer"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50">
            Print Report
          </a>
        </div>
      </div>

      {/* Visit header card */}
      <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-900">
            {hospital?.name} · {visitLabel}
          </p>
          <p className="text-xs text-blue-700 mt-0.5">
            {visit.visit_date}
            {visit.visit_time && ` at ${visit.visit_time.slice(0, 5)}`}
            {patient?.blood_type && <span className="ml-2 font-medium text-red-600">{patient.blood_type}</span>}
          </p>
          {patient?.allergies && (
            <p className="text-xs text-red-600 mt-0.5">⚠ Allergies: {patient.allergies}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-blue-600">Visit fee</p>
          <p className="text-sm font-bold text-blue-900">{visitTotal.toFixed(2)} {currency}</p>
          {proceduresTotal > 0 && (
            <p className="text-[10px] text-blue-500">
              {visit.visit_fee?.toFixed(2)} + {proceduresTotal.toFixed(2)} procedures
            </p>
          )}
        </div>
      </div>

      {/* Main notes component */}
      <InpatientVisitNotes
        visitId={visitId}
        inpatientId={inpatientId}
        clinicId={profile?.clinic_id ?? ""}
        existingNote={visit.clinical_note ?? ""}
        existingVoiceNotes={visit.voice_notes ?? ""}
        existingKeyPoints={visit.key_clinical_points ?? ""}
        existingAbstract={visit.patient_summary ?? ""}
        manualSymptoms={manualSymptoms}
        procedures={procedures ?? []}
        proceduresCatalog={(proceduresCatalog ?? []).map(p => ({
          id: p.id,
          name: p.name,
          inpatient_price: p.inpatient_price,
        }))}
        currency={currency}
        visitStatus={visit.status}
        patientName={patient?.full_name ?? ""}
        hospitalName={hospital?.name ?? ""}
        visitDate={visit.visit_date ?? ""}
        visitType={visitLabel}
      />
    </div>
  );
}
