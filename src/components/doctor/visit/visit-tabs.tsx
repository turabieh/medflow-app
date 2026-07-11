"use client";
import { DentalChartTab } from "./dental-chart";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PatientTab } from "./patient-tab";
import { ClinicalTab } from "./clinical-tab";
import { NotesTab } from "./notes-tab";
import { AINotesTab } from "./ai-notes-tab";
import { HistoryTab } from "./history-tab";
import { markVisitDone } from "@/lib/actions/visits";

interface Symptom { id: string; name: string; name_ar: string | null; category: string; }
interface Lab { id: string; type: string; name: string; lab_date: string | null; findings: string | null; link_url: string | null; }
interface Prescription { id: string; medication_id: string | null; medication_name: string; dose: string | null; unit: string | null; instructions: string | null; duration: string | null; }
interface MedCatalog { id: string; name: string; default_dose: string | null; default_unit: string | null; }
interface Diagnosis { id: string; icd_code: string | null; description: string; is_primary: boolean; }

interface VisitTabsProps {
  visitId: string;
  clinicType?: string;
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

export function VisitTabs(props: VisitTabsProps) {
  const router = useRouter();
  const clinicType = props.clinicType ?? "general";
  const isDental = clinicType === "dental";

  const TABS = isDental ? [
    { id: "patient",    label: "Patient" },
    { id: "toothmap",   label: "🦷 Tooth Map" },
    { id: "clinical",   label: "Clinical" },
    { id: "notes",      label: "Notes" },
    { id: "ai",         label: "AI Notes" },
    { id: "history",    label: "History" },
  ] : [
    { id: "patient",    label: "Patient" },
    { id: "clinical",   label: "Clinical" },
    { id: "notes",      label: "Notes" },
    { id: "ai",         label: "AI Notes" },
    { id: "history",    label: "History" },
  ];

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
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">Visit done — pending finalization</span>
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
        {activeTab === "toothmap" && isDental && (
          <div className="h-full overflow-auto">
            <DentalChartTab />
          </div>
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
            voiceNotes={props.voiceNotes}
            keyPoints={props.keyPoints}
            prescriptions={props.prescriptions}
            medsCatalog={props.medsCatalog}
            diagnoses={props.diagnoses}
          />
        )}
        {activeTab === "ai" && (
          <AINotesTab
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
