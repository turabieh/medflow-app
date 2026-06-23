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

  // All visits for this patient, newest first
  const { data: visits } = await supabase
    .from("visits")
    .select("id, visit_date, visit_type, status, clinical_note")
    .eq("patient_id", id)
    .order("visit_date", { ascending: false });

  // Primary diagnosis per visit for the summary row
  const visitIds = (visits ?? []).map(v => v.id);
  const { data: diagnoses } = visitIds.length
    ? await supabase
        .from("visit_diagnoses")
        .select("visit_id, icd_code, description, is_primary")
        .in("visit_id", visitIds)
        .eq("is_primary", true)
    : { data: [] };
  const diagByVisit = new Map(
    (diagnoses ?? []).map(d => [d.visit_id, d])
  );

  const age = patient.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const insurance = Array.isArray(patient.insurance_companies)
    ? patient.insurance_companies[0]
    : patient.insurance_companies;

  const STATUS_STYLE: Record<string, string> = {
    finalized:   "bg-neutral-100 text-neutral-600",
    done:        "bg-orange-100 text-orange-700",
    in_progress: "bg-indigo-100 text-indigo-700",
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/doctor/patients" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← Patient Search
        </Link>
      </div>

      {/* Patient header */}
      <div className="mb-5 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">{patient.full_name}</h1>
            {patient.full_name_ar && (
              <p className="text-sm text-neutral-400" dir="rtl">{patient.full_name_ar}</p>
            )}
          </div>
          <Link
            href={`/secretary/patients/${id}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
          >
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
                <span key={a} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  {a.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
        {insurance && (
          <div className="mt-3 border-t border-neutral-100 pt-3">
            <p className="text-xs text-neutral-500">
              Insurance: <span className="font-medium text-neutral-900">{(insurance as { name?: string }).name}</span>
              {patient.insurance_policy_number && (
                <span className="ml-2 text-neutral-400">{patient.insurance_policy_number}</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Visit list */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-700">
          Visit History — {visits?.length ?? 0} visit{visits?.length !== 1 ? "s" : ""}
        </h2>
        <p className="text-xs text-neutral-400">Click a visit to open and edit it</p>
      </div>

      {(!visits || visits.length === 0) ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          No visits on record for this patient.
        </div>
      ) : (
        <div className="space-y-2">
          {visits.map((visit) => {
            const primaryDx = diagByVisit.get(visit.id);
            const statusStyle = STATUS_STYLE[visit.status ?? ""] ?? "bg-neutral-100 text-neutral-600";
            return (
              <Link
                key={visit.id}
                href={`/doctor/visit/${visit.id}`}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-center w-16 flex-shrink-0">
                    <p className="text-xs font-medium text-neutral-900">{visit.visit_date?.slice(0, 7)}</p>
                    <p className="text-[11px] text-neutral-400">{visit.visit_date?.slice(8, 10) ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {primaryDx ? (
                        <>
                          {primaryDx.icd_code && (
                            <span className="mr-2 font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600">
                              {primaryDx.icd_code}
                            </span>
                          )}
                          {primaryDx.description}
                        </>
                      ) : (
                        <span className="text-neutral-400 italic">No diagnosis recorded</span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5 capitalize">
                      {visit.visit_type} visit
                      {visit.clinical_note && " · Note available"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}>
                    {visit.status?.replace(/_/g, " ") ?? "—"}
                  </span>
                  <span className="text-neutral-400 text-sm">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
