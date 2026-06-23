import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DoctorPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("*, insurance_companies(name)")
    .eq("id", id)
    .single();

  if (!patient) notFound();

  const { data: visits } = await supabase
    .from("visits")
    .select("id, visit_date, visit_type, status, clinical_note, voice_notes, key_clinical_points")
    .eq("patient_id", id)
    .order("visit_date", { ascending: false });

  const visitIds = (visits ?? []).map(v => v.id);
  const [{ data: prescriptions }, { data: diagnoses }] = await Promise.all([
    visitIds.length ? supabase.from("prescriptions").select("visit_id, medication_name, dose, unit, instructions, duration").in("visit_id", visitIds) : { data: [] },
    visitIds.length ? supabase.from("visit_diagnoses").select("visit_id, icd_code, description, is_primary").in("visit_id", visitIds) : { data: [] },
  ]);

  const age = patient.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const insurance = Array.isArray(patient.insurance_companies) ? patient.insurance_companies[0] : patient.insurance_companies;

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/doctor/patients" className="text-sm text-neutral-500 hover:text-neutral-700">← Patient Search</Link>
      </div>

      {/* Patient header */}
      <div className="mb-5 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">{patient.full_name}</h1>
            {patient.full_name_ar && <p className="text-sm text-neutral-400" dir="rtl">{patient.full_name_ar}</p>}
          </div>
          <Link href={`/secretary/patients/${id}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50">
            Edit patient info →
          </Link>
        </div>
        <div className="grid grid-cols-5 gap-3 text-sm">
          <div><p className="text-xs text-neutral-500">Phone</p><p className="font-mono font-medium">{patient.phone}</p></div>
          {age !== null && <div><p className="text-xs text-neutral-500">Age</p><p className="font-medium">{age} yrs</p></div>}
          <div><p className="text-xs text-neutral-500">Gender</p><p className="font-medium capitalize">{patient.gender ?? "—"}</p></div>
          <div><p className="text-xs text-neutral-500">Blood type</p><p className="font-medium text-red-600">{patient.blood_type ?? "—"}</p></div>
          <div><p className="text-xs text-neutral-500">DOB</p><p className="font-medium">{patient.dob ?? "—"}</p></div>
        </div>
        {patient.allergies && (
          <div className="mt-3 border-t border-neutral-100 pt-3">
            <p className="text-xs text-neutral-500 mb-1">Allergies</p>
            <div className="flex flex-wrap gap-1">
              {patient.allergies.split(",").map((a: string) => (
                <span key={a} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{a.trim()}</span>
              ))}
            </div>
          </div>
        )}
        {insurance && (
          <div className="mt-3 border-t border-neutral-100 pt-3">
            <p className="text-xs text-neutral-500">Insurance: <span className="font-medium text-neutral-900">{insurance.name}</span>
              {patient.insurance_policy_number && <span className="ml-2 text-neutral-400">{patient.insurance_policy_number}</span>}
            </p>
          </div>
        )}
      </div>

      {/* Visit history */}
      <h2 className="mb-3 text-sm font-medium text-neutral-700">
        Visit History ({visits?.length ?? 0} visits)
      </h2>
      <div className="space-y-2">
        {(!visits || visits.length === 0) && (
          <p className="text-sm text-neutral-500">No visits on record.</p>
        )}
        {(visits ?? []).map((visit) => {
          const vDiagnoses = (diagnoses ?? []).filter(d => d.visit_id === visit.id);
          const vMeds = (prescriptions ?? []).filter(p => p.visit_id === visit.id);
          return (
            <details key={visit.id} className="rounded-lg border border-neutral-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-neutral-50 list-none">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${visit.status === "finalized" ? "bg-neutral-300" : "bg-blue-400"}`} />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {visit.visit_date ?? "—"}
                      <span className="ml-2 text-xs font-normal text-neutral-400 capitalize">{visit.visit_type}</span>
                    </p>
                    {vDiagnoses.find(d => d.is_primary) && (
                      <p className="text-xs text-neutral-500">{vDiagnoses.find(d => d.is_primary)?.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  {vMeds.length > 0 && <span>{vMeds.length} medications</span>}
                  <span>▼</span>
                </div>
              </summary>
              <div className="border-t border-neutral-100 px-4 py-4 space-y-3 bg-neutral-50">
                {vDiagnoses.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Diagnoses</p>
                    {vDiagnoses.map((d, i) => (
                      <p key={i} className="text-sm">
                        {d.icd_code && <span className="mr-2 font-mono text-xs bg-neutral-100 px-1 rounded">{d.icd_code}</span>}
                        {d.description}
                        {d.is_primary && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded-full">Primary</span>}
                      </p>
                    ))}
                  </div>
                )}
                {(visit.clinical_note || visit.voice_notes) && (
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Clinical Note</p>
                    <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto bg-white border border-neutral-200 rounded px-3 py-2">
                      {visit.clinical_note || visit.voice_notes}
                    </p>
                  </div>
                )}
                {vMeds.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Medications</p>
                    {vMeds.map((rx, i) => (
                      <p key={i} className="text-sm">
                        <span className="font-medium">{rx.medication_name}</span>
                        <span className="text-neutral-500 text-xs ml-2">
                          {[rx.dose, rx.unit].filter(Boolean).join(" ")}
                          {rx.instructions && ` · ${rx.instructions}`}
                          {rx.duration && ` · ${rx.duration}`}
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
