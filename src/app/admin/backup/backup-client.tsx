"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface BackupGroup {
  title: string;
  icon: string;
  tables: {
    key: string;
    label: string;
    description: string;
    query: (clinicId: string, supabase: ReturnType<typeof createClient>) => PromiseLike<Record<string, unknown>[]>;
  }[];
}

const BACKUP_GROUPS: BackupGroup[] = [
  {
    title: "Patients & Appointments",
    icon: "👥",
    tables: [
      {
        key: "patients",
        label: "Patients",
        description: "All patient records, contact info, medical history",
        query: (id, sb) => sb.from("patients").select("id, full_name, full_name_ar, phone, dob, gender, blood_type, allergies, insurance_company_id, insurance_policy_number, created_at").eq("clinic_id", id).order("full_name").then(r => (r.data ?? []) as unknown as Record<string,unknown>[]),
      },
      {
        key: "appointments",
        label: "Appointments",
        description: "All scheduled appointments and status",
        query: (id, sb) => sb.from("appointments").select("id, appt_date, start_time, visit_type, status, patients(full_name), users!appointments_doctor_id_fkey(full_name)").eq("clinic_id", id).order("appt_date", { ascending: false }).then(r => (r.data ?? []) as unknown as Record<string,unknown>[]),
      },
    ],
  },
  {
    title: "Clinical Records",
    icon: "🏥",
    tables: [
      {
        key: "visits",
        label: "Visit Notes",
        description: "All visit SOAP notes, vitals, clinical data",
        query: (id, sb) => sb.from("visits").select("id, visit_date, visit_type, visit_context, status, blood_pressure, heart_rate, temperature, oxygen_saturation, weight_kg, subjective, objective, assessment, plan, key_clinical_points, final_note, patients(full_name), users!visits_doctor_id_fkey(full_name)").eq("clinic_id", id).order("visit_date", { ascending: false }).then(r => (r.data ?? []) as unknown as Record<string,unknown>[]),
      },
      {
        key: "prescriptions",
        label: "Prescriptions",
        description: "All medications prescribed",
        query: (id, sb) => sb.from("prescriptions").select("id, medication_name, dose, unit, instructions, duration, created_at, patients(full_name), visits(visit_date)").eq("clinic_id", id).order("created_at", { ascending: false }).then(r => (r.data ?? []) as unknown as Record<string,unknown>[]),
      },
      {
        key: "visit_diagnoses",
        label: "Diagnoses",
        description: "All diagnosis records with ICD codes",
        query: (id, sb) => sb.from("visit_diagnoses").select("id, icd_code, description, is_primary, created_at, visits(visit_date, patients(full_name))").eq("clinic_id", id).order("created_at", { ascending: false }).then(r => (r.data ?? []) as unknown as Record<string,unknown>[]),
      },
      {
        key: "visit_labs",
        label: "Labs & Imaging",
        description: "All lab and imaging results",
        query: (id, sb) => sb.from("visit_labs").select("id, type, name, lab_date, findings, link_url, visits(visit_date, patients(full_name))").eq("clinic_id", id).order("lab_date", { ascending: false }).then(r => (r.data ?? []) as unknown as Record<string,unknown>[]),
      },
    ],
  },
  {
    title: "Inpatients",
    icon: "🏨",
    tables: [
      {
        key: "inpatients",
        label: "Inpatient Admissions",
        description: "All hospital admissions, rooms, discharge dates",
        query: (id, sb) => sb.from("inpatients").select("id, admission_date, discharge_date, status, location, hospital_patient_id, fee_per_visit, diagnosis_summary, patients(full_name), hospitals(name), users!inpatients_doctor_id_fkey(full_name)").eq("clinic_id", id).order("admission_date", { ascending: false }).then(r => (r.data ?? []) as unknown as Record<string,unknown>[]),
      },
    ],
  },
  {
    title: "Finance & Insurance",
    icon: "💰",
    tables: [
      {
        key: "insurance_claims",
        label: "Insurance Claims",
        description: "All submitted insurance claims",
        query: (id, sb) => sb.from("insurance_claims").select("id, claim_date, total_claimed, total_paid, status, is_followup, insurance_companies(name), patients(full_name)").eq("clinic_id", id).order("claim_date", { ascending: false }).then(r => (r.data ?? []) as unknown as Record<string,unknown>[]),
      },
      {
        key: "outpatient_procedure_claims",
        label: "Procedure Claims",
        description: "All procedure pre-authorization records",
        query: (id, sb) => sb.from("outpatient_procedure_claims").select("id, procedure_name, price, auth_status, auth_number, auth_date, visits(visit_date, patients(full_name))").eq("clinic_id", id).order("created_at", { ascending: false }).then(r => (r.data ?? []) as unknown as Record<string,unknown>[]),
      },
      {
        key: "expenses",
        label: "Expenses",
        description: "All clinic expense records",
        query: (id, sb) => sb.from("expenses").select("id, description, amount, category, expense_date, notes").eq("clinic_id", id).order("expense_date", { ascending: false }).then(r => (r.data ?? []) as unknown as Record<string,unknown>[]),
      },
      {
        key: "staff_salaries",
        label: "Staff Salaries",
        description: "Monthly salary records",
        query: (id, sb) => sb.from("staff_salaries").select("id, month, salary_amount, notes, users(full_name, role)").eq("clinic_id", id).order("month", { ascending: false }).then(r => (r.data ?? []) as unknown as Record<string,unknown>[]),
      },
    ],
  },
];

function flattenObj(obj: unknown, prefix = ""): Record<string, string> {
  if (obj === null || obj === undefined) return { [prefix]: "" };
  if (typeof obj !== "object") return { [prefix]: String(obj) };
  if (Array.isArray(obj)) return { [prefix]: obj.map(v => typeof v === "object" ? JSON.stringify(v) : String(v)).join("; ") };
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    Object.assign(result, flattenObj(v, key));
  }
  return result;
}

function toCSV(data: Record<string, unknown>[]): string {
  if (!data.length) return "No data";
  const flat = data.map(r => flattenObj(r));
  const headers = [...new Set(flat.flatMap(r => Object.keys(r)))];
  const escape = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(","),
    ...flat.map(r => headers.map(h => escape(r[h] ?? "")).join(",")),
  ].join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BackupClient({ clinicId, counts }: { clinicId: string; counts: Record<string, number> }) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [done, setDone]       = useState<Record<string, boolean>>({});

  const today = new Date().toISOString().split("T")[0];

  async function downloadTable(key: string, label: string, query: (clinicId: string, supabase: ReturnType<typeof createClient>) => PromiseLike<Record<string, unknown>[]>) {
    setLoading(p => ({ ...p, [key]: true }));
    setDone(p => ({ ...p, [key]: false }));
    try {
      const supabase = createClient();
      const data = await query(clinicId, supabase);
      const csv  = toCSV(data as Record<string, unknown>[]);
      downloadCSV(csv, `medflow_${key}_${today}.csv`);
      setDone(p => ({ ...p, [key]: true }));
      setTimeout(() => setDone(p => ({ ...p, [key]: false })), 3000);
    } catch (e) {
      console.error(e);
    }
    setLoading(p => ({ ...p, [key]: false }));
  }

  async function downloadAll() {
    setLoading(p => ({ ...p, _all: true }));
    const supabase = createClient();
    const allTables = BACKUP_GROUPS.flatMap(g => g.tables);
    const results: string[] = [];

    for (const t of allTables) {
      try {
        const data = await t.query(clinicId, supabase);
        results.push(`\n\n=== ${t.label.toUpperCase()} ===\n` + toCSV(data as Record<string, unknown>[]));
      } catch { results.push(`\n\n=== ${t.label.toUpperCase()} ===\nError loading data`); }
    }

    const blob = new Blob(["\uFEFF" + results.join(""), ], { type: "text/plain;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `medflow_full_backup_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(p => ({ ...p, _all: false }));
    setDone(p => ({ ...p, _all: true }));
    setTimeout(() => setDone(p => ({ ...p, _all: false })), 3000);
  }

  return (
    <div className="max-w-3xl space-y-6">

      {/* Full backup button */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Full Backup</h2>
            <p className="mt-0.5 text-xs text-neutral-500">Download all tables in one file — recommended for complete backups</p>
          </div>
          <button onClick={downloadAll} disabled={loading._all}
            className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 transition-colors">
            {loading._all ? (
              <><span className="animate-spin text-base">⏳</span> Preparing...</>
            ) : done._all ? (
              <><span>✓</span> Downloaded!</>
            ) : (
              <><span>⬇</span> Download All Data</>
            )}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
          {Object.entries(counts).map(([t, n]) => (
            <span key={t} className="text-xs text-neutral-400">
              <span className="font-medium text-neutral-600">{n.toLocaleString()}</span> {t.replace(/_/g," ")}
            </span>
          ))}
        </div>
      </div>

      {/* Per-group tables */}
      {BACKUP_GROUPS.map(group => (
        <div key={group.title} className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-neutral-100 bg-neutral-50 px-5 py-3 flex items-center gap-2">
            <span>{group.icon}</span>
            <h2 className="text-sm font-semibold text-neutral-800">{group.title}</h2>
          </div>
          <ul className="divide-y divide-neutral-50">
            {group.tables.map(t => {
              const count = counts[t.key] ?? 0;
              const isLoading = loading[t.key];
              const isDone    = done[t.key];
              return (
                <li key={t.key} className="flex items-center justify-between px-5 py-3.5 gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900">{t.label}</span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                        {count.toLocaleString()} rows
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-400 truncate">{t.description}</p>
                  </div>
                  <button
                    onClick={() => downloadTable(t.key, t.label, t.query)}
                    disabled={isLoading || count === 0}
                    className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isDone
                        ? "border-green-200 bg-green-50 text-green-700"
                        : count === 0
                        ? "border-neutral-200 text-neutral-300 cursor-not-allowed"
                        : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400"
                    }`}>
                    {isLoading ? <span className="animate-spin">⏳</span> :
                     isDone    ? <span>✓</span> :
                                 <span>⬇</span>}
                    {isLoading ? "Loading..." : isDone ? "Done!" : "CSV"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {/* Note */}
      <p className="text-xs text-neutral-400 pb-4">
        Files are named <code className="bg-neutral-100 px-1 rounded">medflow_[table]_{today}.csv</code> and open in Excel or Google Sheets. UTF-8 with BOM encoding for Arabic support.
      </p>
    </div>
  );
}
