import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SecretaryReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let patients: { id: string; full_name: string; full_name_ar: string | null; phone: string; dob: string | null }[] = [];
  if (q?.trim()) {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, full_name_ar, phone, dob")
      .or(`full_name.ilike.%${q}%,full_name_ar.ilike.%${q}%,phone.ilike.%${q}%`)
      .order("full_name")
      .limit(20);
    patients = data ?? [];
  }

  // If one patient matched, load their visits
  let selectedPatient: typeof patients[0] | null = null;
  let visits: { id: string; visit_date: string | null; visit_type: string | null; status: string | null; icd?: string; dx?: string }[] = [];

  if (patients.length === 1) {
    selectedPatient = patients[0];
    const { data: visitRows } = await supabase
      .from("visits")
      .select("id, visit_date, visit_type, status, appointment_id")
      .eq("patient_id", selectedPatient.id)
      .order("visit_date", { ascending: false });

    // Fetch payment data for each visit's appointment (server-side, authenticated)
    const apptIds = (visitRows ?? []).map(v => v.appointment_id).filter(Boolean);
    const { data: apptRows } = apptIds.length
      ? await supabase.from("appointments")
          .select("id, visit_fee, payment_amount, payment_method, patient_cash_amount, insurance_claim_amount, patient_payment_method, payment_confirmed")
          .in("id", apptIds)
      : { data: [] };
    const apptMap = Object.fromEntries((apptRows ?? []).map(a => [a.id, a]));

    const visitIds = (visitRows ?? []).map(v => v.id);
    const { data: diagnoses } = visitIds.length
      ? await supabase.from("visit_diagnoses").select("visit_id, icd_code, description").eq("is_primary", true).in("visit_id", visitIds)
      : { data: [] };

    const dxMap = new Map((diagnoses ?? []).map(d => [d.visit_id, d]));
    visits = (visitRows ?? []).map(v => ({
      ...v,
      icd: dxMap.get(v.id)?.icd_code ?? "",
      dx: dxMap.get(v.id)?.description ?? "",
    }));
  }

  const PRINT_TYPES = [
    { type: "note",         label: "Clinical Note",            icon: "📋" },
    { type: "prescription", label: "Prescription",             icon: "💊" },
    { type: "summary",      label: "Patient Summary (EN+AR)",  icon: "📄" },
    { type: "invoice",      label: "Invoice / Bill",           icon: "🧾" },
    { type: "appointment",  label: "Appointment Confirmation", icon: "📅" },
  ];

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Reports &amp; Print</h1>
      <p className="mb-5 text-sm text-neutral-500">Search for a patient, select a visit, then choose what to print.</p>

      <form method="GET" className="mb-6 flex gap-2">
        <input type="text" name="q" defaultValue={q} autoFocus
          placeholder="Patient name or phone..."
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500" />
        <button type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Search
        </button>
      </form>

      {q && patients.length === 0 && (
        <p className="text-sm text-neutral-500">No patients found for &quot;{q}&quot;.</p>
      )}

      {/* Multiple results — pick one */}
      {patients.length > 1 && (
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-4 py-2 text-xs text-neutral-500">{patients.length} patients found — select one</div>
          <ul className="divide-y divide-neutral-100">
            {patients.map(p => {
              const age = p.dob ? Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25*24*3600*1000)) : null;
              return (
                <li key={p.id}>
                  <Link href={`/secretary/reports?q=${encodeURIComponent(p.phone)}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{p.full_name}</p>
                      <p className="text-xs text-neutral-500 font-mono">{p.phone}{age !== null ? ` · ${age} yrs` : ""}</p>
                    </div>
                    <span className="text-xs text-neutral-400">Select →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Single patient — show visits */}
      {selectedPatient && (
        <div>
          <div className="mb-4 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-900">{selectedPatient.full_name}</p>
              <p className="text-xs text-neutral-500 font-mono">{selectedPatient.phone}</p>
            </div>
            <Link href="/secretary/reports" className="text-xs text-neutral-400 hover:text-neutral-600">Clear ×</Link>
          </div>

          {visits.length === 0 ? (
            <p className="text-sm text-neutral-500">No visits on record for this patient.</p>
          ) : (
            <div className="space-y-3">
              {visits.map(visit => (
                <div key={visit.id} className="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-4 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-neutral-900">{visit.visit_date ?? "—"}</span>
                      <span className="text-xs text-neutral-400 capitalize">{visit.visit_type}</span>
                      {visit.dx && (
                        <span className="text-xs text-neutral-500">
                          {visit.icd && <span className="font-mono mr-1 text-neutral-400">{visit.icd}</span>}
                          {visit.dx}
                        </span>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      visit.status === "finalized" ? "bg-neutral-100 text-neutral-600" :
                      visit.status === "done" ? "bg-orange-100 text-orange-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>{visit.status?.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 px-4 py-3">
                    {PRINT_TYPES.map(pt => (
                      <a key={pt.type}
                        href={(() => {
                          const appt = visit.appointment_id ? apptMap[visit.appointment_id] : null;
                          const base = `/secretary/reports/print?type=${pt.type}&visitId=${visit.id}&patientId=${selectedPatient!.id}`;
                          if (!appt) return base;
                          return base +
                            `&apptId=${visit.appointment_id}` +
                            `&pm=${appt.payment_method ?? ""}` +
                            `&pamt=${appt.payment_amount ?? 0}` +
                            `&vfee=${appt.visit_fee ?? appt.payment_amount ?? 0}` +
                            `&cash=${appt.patient_cash_amount ?? 0}` +
                            `&ins=${appt.insurance_claim_amount ?? 0}` +
                            `&ppm=${appt.patient_payment_method ?? ""}` +
                            `&paid=${appt.payment_confirmed ? 1 : 0}`;
                        })()}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400"
                      >
                        <span>{pt.icon}</span>{pt.label}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
