import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InpatientActions } from "./inpatient-actions";

export const dynamic = "force-dynamic";

export default async function InpatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: admission } = await supabase
    .from("inpatients")
    .select(`
      id, admission_date, location, status, discharge_date, discharge_notes,
      hospital_patient_id, diagnosis_summary, fee_per_visit,
      patients(id, full_name, full_name_ar, dob, gender, blood_type, allergies, phone),
      hospitals(id, name, primary_phone, portal_link)
    `)
    .eq("id", id)
    .single();

  if (!admission) notFound();

  // Fetch nurse records: either linked to this inpatient OR matching by MRN in notes
  const { data: linkedRecords } = await supabase
    .from("nurse_procedure_records")
    .select("id, procedure_name, category, started_at, notes, recorded_by_name, inpatient_id")
    .eq("inpatient_id", id)
    .order("started_at", { ascending: false });

  // Also fetch unlinked records that mention this patient's hospital MRN
  const hospMrn = admission.hospital_patient_id;
  const { data: mrnRecords } = hospMrn ? await supabase
    .from("nurse_procedure_records")
    .select("id, procedure_name, category, started_at, notes, recorded_by_name, inpatient_id")
    .is("inpatient_id", null)
    .ilike("notes", `%MRN: ${hospMrn}%`)
    .order("started_at", { ascending: false }) : { data: [] };

  const nurseRecords = [...(linkedRecords ?? []), ...(mrnRecords ?? [])];

  const { data: visits } = await supabase
    .from("visits")
    .select("id, visit_date, visit_time, visit_fee, visit_fee_type, status, clinical_note")
    .eq("inpatient_id", id)
    .order("visit_date", { ascending: false });

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user?.id ?? "").single();

  const { data: clinicSetting } = await supabase
    .from("clinic_settings").select("value").eq("clinic_id", profile?.clinic_id ?? "").eq("key", "currency").single();
  const currency = clinicSetting?.value ?? "JOD";

  const visitTypes = [
    { key: "round",        label: "Morning Round" },
    { key: "consultation", label: "Consultation" },
    { key: "urgent",       label: "Urgent Consultation" },
    { key: "follow_up",    label: "Follow-up" },
    { key: "procedure",    label: "Procedure Visit" },
  ];

  const patient = Array.isArray(admission.patients) ? admission.patients[0] : admission.patients as { id: string; full_name: string; full_name_ar: string | null; dob: string | null; gender: string | null; blood_type: string | null; allergies: string | null; phone: string } | null;
  const hospital = Array.isArray(admission.hospitals) ? admission.hospitals[0] : admission.hospitals as { id: string; name: string; primary_phone: string; portal_link: string | null } | null;

  const age = patient?.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const totalFee = (visits ?? []).length * (admission.fee_per_visit ?? 0);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/doctor/inpatients" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← Inpatients
        </Link>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
          admission.status === "active" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"
        }`}>
          {admission.status === "active" ? "Active Admission" : `Discharged ${admission.discharge_date}`}
        </span>
      </div>

      {/* Patient + Admission header */}
      <div className="mb-5 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">{patient?.full_name}</h1>
            {patient?.full_name_ar && <p className="text-sm text-neutral-400" dir="rtl">{patient.full_name_ar}</p>}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500">
              {age !== null && <span>{age} yrs</span>}
              {patient?.gender && <span className="capitalize">{patient.gender}</span>}
              {patient?.blood_type && <span className="font-medium text-red-600">{patient.blood_type}</span>}
              <span className="font-mono">{patient?.phone}</span>
            </div>
            {patient?.allergies && (
              <div className="mt-2 flex flex-wrap gap-1">
                {patient.allergies.split(",").map((a: string) => (
                  <span key={a} className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">{a.trim()}</span>
                ))}
              </div>
            )}
          </div>
          <Link href={`/doctor/patients/${patient?.id}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50">
            Full patient file →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-neutral-100 pt-4 text-sm">
          <div>
            <p className="text-xs text-neutral-500">Hospital</p>
            <p className="font-medium text-neutral-900">{hospital?.name ?? "—"}</p>
            {hospital?.portal_link && (
              <a href={hospital.portal_link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Portal →</a>
            )}
          </div>
          <div>
            <p className="text-xs text-neutral-500">MRN / Hospital ID</p>
            <p className="font-mono font-medium text-neutral-900">{admission.hospital_patient_id || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Location</p>
            <p className="font-medium text-neutral-900">{admission.location}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Admitted</p>
            <p className="font-medium text-neutral-900">{admission.admission_date}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Admitting Diagnosis</p>
            <p className="font-medium text-neutral-900">{admission.diagnosis_summary || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Fee per Visit</p>
            <p className="font-medium text-neutral-900">
              {admission.fee_per_visit ? `${admission.fee_per_visit} ${currency}` : "—"}
            </p>
          </div>
        </div>

        {admission.status === "discharged" && admission.discharge_notes && (
          <div className="mt-3 rounded-md bg-neutral-50 border border-neutral-200 px-3 py-2 text-sm text-neutral-600">
            <span className="font-medium text-neutral-800">Discharge notes:</span> {admission.discharge_notes}
          </div>
        )}
      </div>

      {/* Actions */}
      <InpatientActions
        inpatientId={id}
        status={admission.status}
        today={today}
        existingVisitDates={(visits ?? []).map(v => v.visit_date ?? "")}
        location={admission.location}
        patientName={patient?.full_name ?? ""}
        visitTypes={visitTypes}
        visits={(visits ?? []).length}
        totalFee={totalFee}
        currency={currency}
        defaultFeePerVisit={admission.fee_per_visit ?? null}
        admissionDate={admission.admission_date}
      />

      {/* Nurse Procedures tab */}
      <div className="mt-5 rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-900">🩺 Nurse Procedures</h2>
          <span className="text-xs text-neutral-400">{(nurseRecords ?? []).length} records</span>
        </div>
        {(!nurseRecords || nurseRecords.length === 0) ? (
          <div className="px-4 py-6 text-center text-sm text-neutral-400">No nurse procedures recorded yet.</div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {nurseRecords.map(r => {
              const catColors: Record<string, string> = {
                general:"bg-neutral-100 text-neutral-600", monitoring:"bg-blue-100 text-blue-700",
                lab:"bg-purple-100 text-purple-700", setup:"bg-amber-100 text-amber-700",
                medication:"bg-red-100 text-red-700", other:"bg-neutral-100 text-neutral-500"
              };
              return (
                <div key={r.id} className="flex items-start justify-between px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900">{r.procedure_name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${catColors[r.category] ?? "bg-neutral-100 text-neutral-600"}`}>
                        {r.category}
                      </span>
                    </div>
                    {r.notes && <p className="text-xs text-neutral-400 mt-0.5">{r.notes}</p>}
                    {r.recorded_by_name && <p className="text-xs text-neutral-400 mt-0.5">By: {r.recorded_by_name}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs font-medium text-neutral-700">
                      {new Date(r.started_at).toLocaleDateString("en-GB")}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {new Date(r.started_at).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Visits list */}
      <div className="mt-5">
        <h2 className="mb-3 text-sm font-medium text-neutral-700">
          Visit Log — {(visits ?? []).length} visit{(visits ?? []).length !== 1 ? "s" : ""}
        </h2>
        {(!visits || visits.length === 0) ? (
          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400">
            No visits recorded yet. Add today&apos;s visit to start documenting.
          </div>
        ) : (
          <div className="space-y-2">
            {visits.map(v => (
              <Link key={v.id} href={`/doctor/inpatients/${id}/visit/${v.id}`}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm hover:bg-neutral-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{v.visit_date}{v.visit_time ? ` · ${(v.visit_time as string).slice(0,5)}` : ""}</p>
                  {v.clinical_note && (
                    <p className="text-xs text-neutral-400 mt-0.5">Note available</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    v.status === "done" || v.status === "finalized"
                      ? "bg-neutral-100 text-neutral-500"
                      : "bg-blue-100 text-blue-700"
                  }`}>{v.status?.replace(/_/g, " ")}</span>
                  <span className="text-neutral-400 text-sm">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
