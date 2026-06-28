"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PatientTab } from "./patient-tab";
import { ClinicalTab } from "./clinical-tab";
import { NotesTab } from "./notes-tab";
import { AINotesTab } from "./ai-notes-tab";
import { HistoryTab } from "./history-tab";
import { markVisitDone, reopenVisit } from "@/lib/actions/visits";

interface Symptom { id: string; name: string; name_ar: string | null; category: string; }
interface Lab { id: string; type: string; name: string; lab_date: string | null; findings: string | null; link_url: string | null; }
interface Prescription { id: string; medication_id: string | null; medication_name: string; dose: string | null; unit: string | null; instructions: string | null; duration: string | null; }
interface MedCatalog { id: string; name: string; default_dose: string | null; default_unit: string | null; }
interface Diagnosis { id: string; icd_code: string | null; description: string; is_primary: boolean; }

interface VisitTabsProps {
  visitId: string;
  appointmentId: string;
  clinicId: string;
  doctorId?: string;
  patient: {
    id: string;
    full_name: string;
    full_name_ar?: string | null;
    dob: string | null;
    gender: string | null;
    blood_type: string | null;
    allergies: string | null;
    phone: string;
    insurance_company_name: string | null;
    insurance_policy_number: string | null;
  };
  vitals: {
    heart_rate?: number | null;
    blood_pressure?: string | null;
    temperature?: number | null;
    oxygen_saturation?: number | null;
    resp_rate?: number | null;
    weight_kg?: number | null;
    height_cm?: number | null;
  };
  symptomsCatalog: Symptom[];
  preCheckedSymptomIds: string[];
  checkedSymptomIds: string[];
  manualSymptoms: string[];
  labs: Lab[];
  prescriptions: Prescription[];
  medsCatalog: MedCatalog[];
  diagnoses: Diagnosis[];
  visitStatus: string;
  visitContext?: string | null;
  hasAI?: boolean;
  voiceNotes: string | null;
  keyPoints: string | null;
  clinicalNote: string | null;
  patientSummary: string | null;
  pastVisits: {
    id: string;
    visit_date: string | null;
    visit_type: string | null;
    status: string | null;
    clinical_note: string | null;
    voice_notes: string | null;
    key_clinical_points: string | null;
    prescriptions: { medication_name: string; dose: string | null; unit: string | null; instructions: string | null; duration: string | null }[];
    diagnoses: { icd_code: string | null; description: string; is_primary: boolean }[];
  }[];
}

const TABS = [
  { id: "patient",   label: "Patient" },
  { id: "clinical",  label: "Clinical" },
  { id: "notes",     label: "Notes" },
  { id: "ai",        label: "AI Notes" },
  { id: "history",   label: "History" },
  { id: "procedures", label: "🔬 Procedures" },
];

export function VisitTabs(props: VisitTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("patient");
  const [markingDone, setMarkingDone] = useState(false);

  async function handleMarkDone() {
    setMarkingDone(true);
    await markVisitDone(props.visitId, props.appointmentId);
    setMarkingDone(false);
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar + Mark Done */}
      <div className="flex-shrink-0 border-b border-neutral-200 bg-white px-6 flex items-center justify-between">
        <div className="flex">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        {props.visitStatus === "in_progress" && (
          <button onClick={handleMarkDone} disabled={markingDone}
            className="rounded-md bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
            {markingDone ? "Saving..." : "Mark Done"}
          </button>
        )}
        {props.visitStatus === "done" && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
              Done — pending finalization
            </span>
            <button
              onClick={async () => {
                setMarkingDone(true);
                await reopenVisit(props.visitId, props.appointmentId);
                setMarkingDone(false);
                router.refresh();
              }}
              disabled={markingDone}
              className="rounded-md border border-orange-300 px-3 py-1 text-xs text-orange-700 hover:bg-orange-50 disabled:opacity-50"
            >
              Reopen Visit
            </button>
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "patient" && (
          <PatientTab
            visitId={props.visitId}
            appointmentId={props.appointmentId}
            visitStatus={props.visitStatus}
            patient={props.patient}
            vitals={props.vitals}
            preCheckedSymptomNames={[]}
          />
        )}
        {activeTab === "clinical" && (
          <ClinicalTab
            visitId={props.visitId}
            appointmentId={props.appointmentId}
            symptomsCatalog={props.symptomsCatalog}
            preCheckedSymptomIds={props.preCheckedSymptomIds}
            checkedSymptomIds={props.checkedSymptomIds}
            manualSymptoms={props.manualSymptoms}
            labs={props.labs}
            prescriptions={[]}
            medsCatalog={[]}
            diagnoses={[]}
          />
        )}
        {activeTab === "notes" && (
          <NotesTab
            visitId={props.visitId}
            appointmentId={props.appointmentId}
            visitContext={props.visitContext}
            clinicId={props.clinicId}
            voiceNotes={props.voiceNotes}
            keyPoints={props.keyPoints}
            prescriptions={props.prescriptions}
            medsCatalog={props.medsCatalog}
            diagnoses={props.diagnoses}
          />
        )}
        {activeTab === "ai" && (
          <AINotesTab
            hasAI={props.hasAI ?? false}
            visitId={props.visitId}
            existingNote={props.clinicalNote}
            existingAbstract={props.patientSummary}
            patient={props.patient}
            vitals={props.vitals}
            symptoms={props.checkedSymptomIds
              .map(id => props.symptomsCatalog.find(s => s.id === id))
              .filter((s): s is NonNullable<typeof s> => !!s)}
            prescriptions={props.prescriptions}
            diagnoses={props.diagnoses}
            labs={props.labs}
            voiceNotes={props.voiceNotes}
            keyPoints={props.keyPoints}
          />
        )}
        {activeTab === "procedures" && (
          <ProcedureReportsTab patientId={props.patient.id} clinicId={props.clinicId} visitId={props.visitId} doctorId={props.doctorId ?? ""} />
        )}
        {activeTab === "history" && (
          <HistoryTab
            pastVisits={props.pastVisits}
            patientName={props.patient.full_name}
          />
        )}
      </div>
    </div>
  );
}

// ── Procedure Reports Tab ─────────────────────────────────────────────────
function ProcedureReportsTab({ patientId, clinicId, visitId, doctorId }: {
  patientId: string; clinicId: string; visitId: string; doctorId: string;
}) {
  const [reports,    setReports]    = React.useState<Record<string,any>[]>([]);
  const [procedures, setProcedures] = React.useState<Record<string,any>[]>([]);
  const [loaded,     setLoaded]     = React.useState(false);
  const [ordering,   setOrdering]   = React.useState(false);
  const [selProcId,  setSelProcId]  = React.useState("");
  const [editPrice,  setEditPrice]  = React.useState("");
  const [orderNote,  setOrderNote]  = React.useState("");
  const [saving,     setSaving]     = React.useState(false);
  const [msg,        setMsg]        = React.useState("");

  React.useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const sb = createClient();
      Promise.all([
        sb.from("technician_reports")
          .select("id, created_at, status, notes, values, finalized_at, appointment_id, technician_procedures(name, price, variables), users!technician_reports_technician_id_fkey(full_name)")
          .eq("patient_id", patientId).eq("clinic_id", clinicId)
          .order("created_at", { ascending: false }).limit(20),
        sb.from("technician_procedures")
          .select("id, name, name_ar, category, price, duration_min, variables")
          .eq("clinic_id", clinicId).eq("is_active", true).order("category").order("name"),
      ]).then(([rRes, pRes]) => {
        setReports(rRes.data ?? []);
        setProcedures(pRes.data ?? []);
        if (pRes.data?.[0]) setSelProcId(pRes.data[0].id);
        setLoaded(true);
      });
    });
  }, [patientId, clinicId]);

  // Set default price when procedure changes
  React.useEffect(() => {
    const proc = procedures.find(p => p.id === selProcId);
    setEditPrice(proc?.price != null ? String(proc.price) : "");
  }, [selProcId, procedures]);

  async function orderProcedure() {
    if (!selProcId) return;
    setSaving(true); setMsg("");
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    const proc = procedures.find(p => p.id === selProcId);
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });
    const now   = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Amman", hour:"2-digit", minute:"2-digit" });

    // Create a technician appointment ordered by this doctor
    const { data: appt, error } = await sb.from("technician_appointments").insert({
      clinic_id:    clinicId,
      patient_id:   patientId,
      procedure_id: selProcId,
      appt_date:    today,
      start_time:   now,
      status:       "scheduled",
      doctor_id:    doctorId,
      notes:        orderNote || null,
      amount_due:   editPrice ? parseFloat(editPrice) : (proc?.price ?? null),
    }).select("id").single();

    if (error || !appt) { setMsg("✗ Failed: " + (error?.message ?? "")); setSaving(false); return; }

    // Auto-create an empty report
    await sb.from("technician_reports").insert({
      clinic_id:     clinicId,
      appointment_id: appt.id,
      technician_id: doctorId, // doctor is acting as technician for self-performed
      patient_id:    patientId,
      procedure_id:  selProcId,
      values:        {},
      status:        "draft",
    });

    setMsg("✓ Procedure ordered");
    setOrdering(false);
    setOrderNote("");
    // Reload reports
    const { data: newReports } = await sb.from("technician_reports")
      .select("id, created_at, status, notes, values, finalized_at, appointment_id, technician_procedures(name, price, variables), users!technician_reports_technician_id_fkey(full_name)")
      .eq("patient_id", patientId).eq("clinic_id", clinicId)
      .order("created_at", { ascending: false }).limit(20);
    setReports(newReports ?? []);
    setSaving(false);
  }

  if (!loaded) return <div className="p-6 text-sm text-neutral-400">Loading...</div>;

  const selectedProc = procedures.find(p => p.id === selProcId);

  return (
    <div className="space-y-4 p-4">
      {/* Order new procedure */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-800">Order Procedure</h3>
          <button onClick={() => setOrdering(!ordering)}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700">
            {ordering ? "Cancel" : "+ Order"}
          </button>
        </div>

        {ordering && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Procedure</label>
              <select value={selProcId} onChange={e => setSelProcId(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500">
                {procedures.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.category}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Fee (JOD)
                  {selectedProc?.price != null && (
                    <span className="ml-1 text-neutral-400">default: {selectedProc.price}</span>
                  )}
                </label>
                <input type="number" min="0" step="0.01" value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  placeholder="Override price..."
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Duration</label>
                <p className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-500">
                  {selectedProc?.duration_min ?? "—"} min
                </p>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Note / Instructions</label>
              <input value={orderNote} onChange={e => setOrderNote(e.target.value)}
                placeholder="Any instructions for the technician..."
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500" />
            </div>
            {msg && <p className={`text-xs ${msg.startsWith("✓")?"text-green-600":"text-red-500"}`}>{msg}</p>}
            <button onClick={orderProcedure} disabled={saving || !selProcId}
              className="w-full rounded-md bg-neutral-900 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60">
              {saving ? "Ordering..." : "✓ Confirm Order"}
            </button>
          </div>
        )}
        {!ordering && msg && <p className={`text-xs mt-1 ${msg.startsWith("✓")?"text-green-600":"text-red-500"}`}>{msg}</p>}
      </div>

      {/* Existing reports */}
      {reports.length === 0 ? (
        <div className="p-6 text-center">
          <div className="text-3xl mb-2">🔬</div>
          <p className="text-sm text-neutral-500">No procedure reports for this patient yet.</p>
        </div>
      ) : (
        reports.map(r => {
          const proc = r.technician_procedures as {name:string;price:number|null;variables:{key:string;label:string;unit?:string}[]}|null;
          const tech = r.users as {full_name:string}|null;
          const vals = (r.values ?? {}) as Record<string,string>;
          return (
            <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{proc?.name}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {new Date(r.created_at).toLocaleDateString("en-GB", { timeZone:"Asia/Amman" })}
                    {tech?.full_name ? ` · ${tech.full_name}` : ""}
                    {proc?.price != null ? ` · ${proc.price} JOD` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.status==="finalized"?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700"}`}>
                    {r.status==="finalized"?"Finalized":"Draft"}
                  </span>
                  <a href={`/technician/appointments/${r.appointment_id}`}
                    className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50">
                    Open →
                  </a>
                </div>
              </div>
              {proc?.variables && proc.variables.length > 0 && Object.keys(vals).length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {proc.variables.map((v: {key:string;label:string;unit?:string}) => (
                    <div key={v.key} className="rounded-lg bg-neutral-50 px-3 py-2">
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wide">{v.label}{v.unit?` (${v.unit})`:""}</p>
                      <p className="text-sm font-bold text-neutral-900 mt-0.5">{vals[v.key] || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
              {r.notes && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                  <p className="text-[10px] text-blue-500 uppercase font-semibold mb-0.5">Notes</p>
                  <p className="text-xs text-neutral-700 whitespace-pre-wrap">{r.notes}</p>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
