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
          <ProcedureReportsTab patientId={props.patient.id} clinicId={props.clinicId} />
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
function ProcedureReportsTab({ patientId, clinicId }: { patientId: string; clinicId: string }) {
  const [reports, setReports] = React.useState<Record<string,unknown>[]>([]);
  const [loaded, setLoaded]   = React.useState(false);

  React.useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const sb = createClient();
      sb.from("technician_reports")
        .select("id, created_at, status, notes, values, finalized_at, technician_procedures(name, variables), users!technician_reports_technician_id_fkey(full_name)")
        .eq("patient_id", patientId)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) => { setReports(data ?? []); setLoaded(true); });
    });
  }, [patientId, clinicId]);

  if (!loaded) return <div className="p-6 text-sm text-neutral-400">Loading...</div>;

  if (reports.length === 0) return (
    <div className="p-8 text-center">
      <div className="text-3xl mb-2">🔬</div>
      <p className="text-sm text-neutral-500">No procedure reports for this patient yet.</p>
    </div>
  );

  return (
    <div className="space-y-4 p-4">
      {reports.map(r => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const proc = (Array.isArray(r.technician_procedures) ? r.technician_procedures[0] : r.technician_procedures) as any;
        const tech = (Array.isArray(r.users) ? r.users[0] : r.users) as {full_name:string}|null;
        const vals = r.values as Record<string,string> ?? {};
        return (
          <div key={r.id as string} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{proc?.name}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {new Date(r.created_at as string).toLocaleDateString("en-GB", { timeZone:"Asia/Amman" })} · {tech?.full_name}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.status === "finalized" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {r.status === "finalized" ? "Finalized" : "Draft"}
              </span>
            </div>

            {/* Variable values */}
            {proc?.variables && proc.variables.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {proc.variables.map((v: {key:string;label:string;unit?:string}) => (
                  <div key={v.key} className="rounded-lg bg-neutral-50 px-3 py-2">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wide">{v.label}{v.unit ? String(` (${v.unit})`) : ""}</p>
                    <p className="text-sm font-bold text-neutral-900 mt-0.5">{String(vals[v.key] || "—")}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {r.notes && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                <p className="text-[10px] text-blue-500 uppercase font-semibold mb-0.5">Notes</p>
                <p className="text-xs text-neutral-700 whitespace-pre-wrap">{r.notes as string}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
