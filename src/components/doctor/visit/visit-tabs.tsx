"use client";

import { useState } from "react";
import { PatientTab } from "./patient-tab";
import { ClinicalTab } from "./clinical-tab";

interface Vitals {
  heart_rate?: number | null;
  blood_pressure?: string | null;
  temperature?: number | null;
  oxygen_saturation?: number | null;
  resp_rate?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
}

interface Symptom { id: string; name: string; name_ar: string | null; category: string; }
interface Lab { id: string; type: string; name: string; lab_date: string | null; findings: string | null; link_url: string | null; }
interface Prescription { id: string; medication_id: string | null; medication_name: string; dose: string | null; unit: string | null; instructions: string | null; duration: string | null; }
interface MedCatalog { id: string; name: string; default_dose: string | null; default_unit: string | null; }
interface Diagnosis { id: string; icd_code: string | null; description: string; is_primary: boolean; }
interface ProcedureCatalog { id: string; name: string; outpatient_price: number; inpatient_price: number | null; }

interface VisitTabsProps {
  visitId: string;
  appointmentId: string;
  clinicId: string;
  patient: {
    id: string;
    full_name: string;
    dob: string | null;
    gender: string | null;
    blood_type: string | null;
    allergies: string | null;
    phone: string;
    insurance_company_name: string | null;
    insurance_policy_number: string | null;
  };
  vitals: Vitals;
  symptomsCatalog: Symptom[];
  preCheckedSymptomIds: string[];
  checkedSymptomIds: string[];
  labs: Lab[];
  prescriptions: Prescription[];
  medsCatalog: MedCatalog[];
  diagnoses: Diagnosis[];
  proceduresCatalog: ProcedureCatalog[];
  visitStatus: string;
}

const TABS = [
  { id: "patient", label: "Patient" },
  { id: "clinical", label: "Clinical" },
  { id: "notes", label: "Notes" },
  { id: "billing", label: "Billing" },
];

export function VisitTabs(props: VisitTabsProps) {
  const [activeTab, setActiveTab] = useState("patient");

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex-shrink-0 border-b border-neutral-200 bg-white px-6">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "patient" && (
          <PatientTab
            visitId={props.visitId}
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
            labs={props.labs}
            prescriptions={props.prescriptions}
            medsCatalog={props.medsCatalog}
            diagnoses={props.diagnoses}
          />
        )}
        {activeTab === "notes" && (
          <div className="p-6 text-sm text-neutral-500">
            Notes tab — voice notes, clinical points, and AI generation coming next.
          </div>
        )}
        {activeTab === "billing" && (
          <div className="p-6 space-y-4">
            <div className="text-sm text-neutral-500">
              Billing tab — payment and finalization coming next.
            </div>
            {props.visitStatus === "in_progress" && (
              <button
                onClick={async () => {
                  const { markVisitDone } = await import("@/lib/actions/visits");
                  await markVisitDone(props.visitId, props.appointmentId);
                  window.location.reload();
                }}
                className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Mark Done
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
