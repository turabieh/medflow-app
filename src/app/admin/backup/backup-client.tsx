"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;
type QueryFn  = (clinicId: string, sb: Supabase) => PromiseLike<Record<string, unknown>[]>;

interface TableDef { key: string; label: string; desc: string; query: QueryFn; }
interface Group    { title: string; icon: string; tables: TableDef[]; }

// ── helpers ──────────────────────────────────────────────────────────────────
const q = (fn: QueryFn): QueryFn => fn; // identity helper for type inference

const GROUPS: Group[] = [
  {
    title: "Patients", icon: "👥",
    tables: [
      { key:"patients", label:"Patients", desc:"All patient records including contact, medical history, insurance",
        query: q((id,sb) => sb.from("patients")
          .select("id, full_name, full_name_ar, phone, dob, gender, blood_type, allergies, insurance_company_id, insurance_policy_number, created_at")
          .eq("clinic_id", id).order("full_name")
          .then(r => (r.data ?? []) as unknown as Record<string,unknown>[])) },
      { key:"appointments", label:"Appointments", desc:"All scheduled appointments with patient name and visit type",
        query: q((id,sb) => sb.from("appointments")
          .select("id, appt_date, start_time, visit_type, status, patients(full_name, phone), users!appointments_doctor_id_fkey(full_name)")
          .eq("clinic_id", id).order("appt_date", { ascending:false })
          .then(r => (r.data ?? []) as unknown as Record<string,unknown>[])) },
    ],
  },
  {
    title: "Clinical Records", icon: "🏥",
    tables: [
      { key:"visits", label:"Visit Notes (Full)", desc:"All visit data: vitals, SOAP notes, key points, voice notes, final note",
        query: q((id,sb) => sb.from("visits")
          .select("id, visit_date, visit_type, visit_context, status, blood_pressure, heart_rate, temperature, oxygen_saturation, resp_rate, weight_kg, height_cm, subjective, objective, assessment, plan, key_clinical_points, voice_notes, clinical_note, final_note, diagnosis_codes, patients(full_name, full_name_ar, dob, blood_type), users!visits_doctor_id_fkey(full_name)")
          .eq("clinic_id", id).order("visit_date", { ascending:false })
          .then(r => (r.data ?? []) as unknown as Record<string,unknown>[])) },
      { key:"prescriptions", label:"Prescriptions", desc:"All medications prescribed to patients",
        query: q((id,sb) => sb.from("prescriptions")
          .select("id, medication_name, dose, unit, instructions, duration, created_at, patients(full_name), visits(visit_date)")
          .eq("clinic_id", id).order("created_at", { ascending:false })
          .then(r => (r.data ?? []) as unknown as Record<string,unknown>[])) },
      { key:"visit_diagnoses", label:"Diagnoses", desc:"All diagnosis records with ICD codes",
        query: q((id,sb) => sb.from("visit_diagnoses")
          .select("id, icd_code, description, is_primary, created_at, visits(visit_date, patients(full_name))")
          .eq("clinic_id", id).order("created_at", { ascending:false })
          .then(r => (r.data ?? []) as unknown as Record<string,unknown>[])) },
      { key:"visit_labs", label:"Labs & Imaging", desc:"All lab results and imaging reports",
        query: q((id,sb) => sb.from("visit_labs")
          .select("id, type, name, lab_date, findings, link_url, created_at, visits(visit_date, patients(full_name))")
          .eq("clinic_id", id).order("lab_date", { ascending:false })
          .then(r => (r.data ?? []) as unknown as Record<string,unknown>[])) },
      { key:"visit_symptoms", label:"Visit Symptoms", desc:"Symptoms recorded per visit (from catalog selection)",
        query: q(async (id,sb) => {
          // visit_symptoms has no clinic_id — join via visits
          const { data } = await sb.from("visit_symptoms")
            .select("visit_id, notes, symptoms_catalog(name, name_ar, category), visits!inner(visit_date, clinic_id, patients(full_name))")
            .eq("visits.clinic_id", id);
          return (data ?? []) as unknown as Record<string,unknown>[];
        }) },
      { key:"appointment_symptoms", label:"Appointment Symptoms", desc:"Symptoms recorded at booking time by secretary",
        query: q(async (id,sb) => {
          const { data } = await sb.from("appointment_symptoms")
            .select("appointment_id, notes, symptoms_catalog(name, name_ar, category), appointments!inner(appt_date, clinic_id, patients(full_name))")
            .eq("appointments.clinic_id", id);
          return (data ?? []) as unknown as Record<string,unknown>[];
        }) },
    ],
  },
  {
    title: "Inpatients", icon: "🏨",
    tables: [
      { key:"inpatients", label:"Admissions", desc:"All hospital admissions, rooms, discharge dates, fees",
        query: q((id,sb) => sb.from("inpatients")
          .select("id, admission_date, discharge_date, status, location, hospital_patient_id, fee_per_visit, diagnosis_summary, patients(full_name, full_name_ar, phone, dob, blood_type), hospitals(name), users!inpatients_doctor_id_fkey(full_name)")
          .eq("clinic_id", id).order("admission_date", { ascending:false })
          .then(r => (r.data ?? []) as unknown as Record<string,unknown>[])) },
      { key:"inpatient_visit_procedures", label:"Inpatient Procedures", desc:"All procedures performed during inpatient visits",
        query: q((id,sb) => sb.from("inpatient_visit_procedures")
          .select("id, procedure_name, price, notes, created_at, visits(visit_date, inpatient_id, patients(full_name))")
          .eq("clinic_id", id).order("created_at", { ascending:false })
          .then(r => (r.data ?? []) as unknown as Record<string,unknown>[])) },
    ],
  },
  {
    title: "Finance & Claims", icon: "💰",
    tables: [
      { key:"insurance_claims", label:"Insurance Claims", desc:"All submitted insurance claims with payment status",
        query: q((id,sb) => sb.from("insurance_claims")
          .select("id, claim_date, total_claimed, total_paid, status, is_followup, notes, created_at, insurance_companies(name), patients(full_name)")
          .eq("clinic_id", id).order("claim_date", { ascending:false })
          .then(r => (r.data ?? []) as unknown as Record<string,unknown>[])) },
      { key:"hospital_claims", label:"Hospital Claims", desc:"All hospital visit claims",
        query: q((id,sb) => sb.from("hospital_claims")
          .select("id, claim_number, from_date, to_date, total_claimed, total_paid, paid_date, status, notes, created_at, hospitals(name), users!hospital_claims_doctor_id_fkey(full_name)")
          .eq("clinic_id", id).order("from_date", { ascending:false })
          .then(r => (r.data ?? []) as unknown as Record<string,unknown>[])) },
      { key:"outpatient_procedure_claims", label:"Procedure Auth Records", desc:"Insurance pre-authorization records per procedure",
        query: q((id,sb) => sb.from("outpatient_procedure_claims")
          .select("id, procedure_name, price, auth_status, auth_number, auth_date, created_at, visits(visit_date, patients(full_name))")
          .eq("clinic_id", id).order("created_at", { ascending:false })
          .then(r => (r.data ?? []) as unknown as Record<string,unknown>[])) },
      { key:"expenses", label:"Expenses", desc:"All clinic expenses by category",
        query: q((id,sb) => sb.from("expenses")
          .select("id, expense_date, category, description, amount, notes, created_at")
          .eq("clinic_id", id).order("expense_date", { ascending:false })
          .then(r => (r.data ?? []) as unknown as Record<string,unknown>[])) },
      { key:"staff_salaries", label:"Staff Salaries", desc:"Monthly salary records for all staff",
        query: q((id,sb) => sb.from("staff_salaries")
          .select("id, monthly_salary, effective_from, notes, created_at, users(full_name, role)")
          .eq("clinic_id", id).order("effective_from", { ascending:false })
          .then(r => (r.data ?? []) as unknown as Record<string,unknown>[])) },
    ],
  },
];

// ── CSV helpers ───────────────────────────────────────────────────────────────
function flatten(obj: unknown, prefix = ""): Record<string, string> {
  if (obj === null || obj === undefined) return prefix ? { [prefix]: "" } : {};
  if (typeof obj !== "object") return { [prefix]: String(obj) };
  if (Array.isArray(obj)) {
    if (obj.length === 0) return { [prefix]: "" };
    // If array of objects, pick first (joined table row)
    if (typeof obj[0] === "object" && obj[0] !== null)
      return flatten(obj[0], prefix);
    return { [prefix]: obj.join("; ") };
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    Object.assign(out, flatten(v, key));
  }
  return out;
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "No records found";
  const flat    = rows.map(r => flatten(r));
  const headers = [...new Set(flat.flatMap(r => Object.keys(r)))];
  const esc     = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  return [
    headers.map(esc).join(","),
    ...flat.map(r => headers.map(h => esc(r[h] ?? "")).join(",")),
  ].join("\r\n");
}

function download(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────
export function BackupClient({ clinicId, counts }: { clinicId: string; counts: Record<string, number> }) {
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const today = new Date().toISOString().split("T")[0];

  async function downloadOne(t: TableDef) {
    setBusy(p => ({ ...p, [t.key]: true }));
    setDone(p => ({ ...p, [t.key]: false }));
    try {
      const data = await t.query(clinicId, createClient());
      download(toCSV(data), `medflow_${t.key}_${today}.csv`);
      setDone(p => ({ ...p, [t.key]: true }));
      setTimeout(() => setDone(p => ({ ...p, [t.key]: false })), 3000);
    } catch (e) { console.error(t.key, e); }
    setBusy(p => ({ ...p, [t.key]: false }));
  }

  async function downloadAll() {
    setBusy(p => ({ ...p, _all: true }));
    const sb  = createClient();
    const all = GROUPS.flatMap(g => g.tables);
    const sections: string[] = [];

    for (const t of all) {
      try {
        const data = await t.query(clinicId, sb);
        sections.push(`\r\n\r\n=== ${t.label.toUpperCase()} ===\r\n${toCSV(data)}`);
      } catch { sections.push(`\r\n\r\n=== ${t.label.toUpperCase()} ===\r\nError`); }
    }

    download(sections.join(""), `medflow_full_backup_${today}.csv`);
    setBusy(p => ({ ...p, _all: false }));
    setDone(p => ({ ...p, _all: true }));
    setTimeout(() => setDone(p => ({ ...p, _all: false })), 3000);
  }

  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Full backup */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Full Backup — All Tables</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {totalRows.toLocaleString()} total records across {GROUPS.flatMap(g=>g.tables).length} tables
            </p>
          </div>
          <button onClick={downloadAll} disabled={busy._all}
            className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60 transition-colors">
            {busy._all ? "⏳ Preparing..." : done._all ? "✓ Downloaded!" : "⬇ Download All (CSV)"}
          </button>
        </div>
        {/* Row count summary */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {Object.entries(counts).filter(([,n]) => n > 0).map(([t, n]) => (
            <div key={t} className="rounded-lg bg-neutral-50 px-3 py-2">
              <div className="text-sm font-semibold text-neutral-800">{n.toLocaleString()}</div>
              <div className="text-[10px] text-neutral-400 truncate">{t.replace(/_/g," ")}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-group */}
      {GROUPS.map(g => (
        <div key={g.title} className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-neutral-100 bg-neutral-50 px-5 py-3 flex items-center gap-2">
            <span>{g.icon}</span>
            <h2 className="text-sm font-semibold text-neutral-800">{g.title}</h2>
          </div>
          <ul className="divide-y divide-neutral-50">
            {g.tables.map(t => {
              const n  = counts[t.key] ?? 0;
              const isB = busy[t.key];
              const isD = done[t.key];
              return (
                <li key={t.key} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900">{t.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${n > 0 ? "bg-neutral-100 text-neutral-600" : "bg-red-50 text-red-400"}`}>
                        {n.toLocaleString()} rows
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-400 truncate">{t.desc}</p>
                  </div>
                  <button onClick={() => downloadOne(t)} disabled={isB}
                    className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isD ? "border-green-200 bg-green-50 text-green-700" :
                      isB ? "border-neutral-200 text-neutral-400" :
                      n === 0 ? "border-neutral-100 text-neutral-300 cursor-default" :
                      "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}>
                    {isB ? "⏳" : isD ? "✓" : "⬇"} {isB ? "Loading…" : isD ? "Done!" : "CSV"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <p className="pb-6 text-xs text-neutral-400">
        All files are UTF-8 CSV with BOM — opens correctly in Excel and Google Sheets including Arabic text.
        Files are named <span className="font-mono bg-neutral-100 px-1 rounded">medflow_[table]_{today}.csv</span>
      </p>
    </div>
  );
}
