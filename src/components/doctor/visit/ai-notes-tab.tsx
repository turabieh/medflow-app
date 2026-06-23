"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAINote } from "@/lib/actions/visits";

interface Symptom { name: string; category: string; }
interface Prescription { medication_name: string; dose: string | null; unit: string | null; instructions: string | null; duration: string | null; }
interface Diagnosis { icd_code: string | null; description: string; is_primary: boolean; }
interface Lab { type: string; name: string; lab_date: string | null; findings: string | null; }

export function AINotesTab({
  visitId,
  existingNote,
  patient,
  vitals,
  symptoms,
  prescriptions,
  diagnoses,
  labs,
  voiceNotes,
  keyPoints,
}: {
  visitId: string;
  existingNote: string | null;
  patient: {
    full_name: string;
    dob: string | null;
    gender: string | null;
    blood_type: string | null;
    allergies: string | null;
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
  symptoms: Symptom[];
  prescriptions: Prescription[];
  diagnoses: Diagnosis[];
  labs: Lab[];
  voiceNotes: string | null;
  keyPoints: string | null;
}) {
  const router = useRouter();
  const [clinicalNote, setClinicalNote] = useState(existingNote ?? "");
  const [generating, setGenerating] = useState(false);
  const [generatingAbstract, setGeneratingAbstract] = useState(false);
  const [abstract, setAbstract] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build context string for AI
  function buildContext() {
    const age = patient.dob
      ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
      : null;

    const lines: string[] = [
      `Patient: ${patient.full_name}`,
      age ? `Age: ${age} years old` : "",
      patient.gender ? `Gender: ${patient.gender}` : "",
      patient.blood_type ? `Blood type: ${patient.blood_type}` : "",
      patient.allergies ? `Allergies: ${patient.allergies}` : "",
      "",
    ];

    const v = vitals;
    const vitalParts = [
      v.heart_rate ? `HR ${v.heart_rate} bpm` : "",
      v.blood_pressure ? `BP ${v.blood_pressure}` : "",
      v.temperature ? `Temp ${v.temperature}°C` : "",
      v.oxygen_saturation ? `O2 ${v.oxygen_saturation}%` : "",
      v.resp_rate ? `RR ${v.resp_rate}/min` : "",
      v.weight_kg ? `Weight ${v.weight_kg}kg` : "",
      v.height_cm ? `Height ${v.height_cm}cm` : "",
    ].filter(Boolean);
    if (vitalParts.length) lines.push(`Vitals: ${vitalParts.join(", ")}`);

    const basicSymptoms = symptoms.filter(s => s.category !== "advanced").map(s => s.name);
    const advSymptoms = symptoms.filter(s => s.category === "advanced").map(s => s.name);
    if (basicSymptoms.length) lines.push(`Symptoms: ${basicSymptoms.join(", ")}`);
    if (advSymptoms.length) lines.push(`Advanced symptoms: ${advSymptoms.join(", ")}`);

    if (labs.length) {
      lines.push("Labs & Imaging:");
      labs.forEach(l => {
        lines.push(`  - ${l.type.toUpperCase()}: ${l.name}${l.lab_date ? ` (${l.lab_date})` : ""}${l.findings ? ` — ${l.findings}` : ""}`);
      });
    }

    if (diagnoses.length) {
      lines.push("Diagnosis:");
      diagnoses.forEach(d => {
        lines.push(`  - ${d.icd_code ? `[${d.icd_code}] ` : ""}${d.description}${d.is_primary ? " (PRIMARY)" : ""}`);
      });
    }

    if (prescriptions.length) {
      lines.push("Medications prescribed:");
      prescriptions.forEach(rx => {
        const detail = [rx.dose, rx.unit, rx.instructions, rx.duration].filter(Boolean).join(" ");
        lines.push(`  - ${rx.medication_name}${detail ? `: ${detail}` : ""}`);
      });
    }

    if (voiceNotes) lines.push(`\nDoctor's voice notes:\n${voiceNotes}`);
    if (keyPoints) lines.push(`\nKey clinical points:\n${keyPoints}`);

    return lines.filter(Boolean).join("\n");
  }

  async function generateClinicalNote() {
    setGenerating(true);
    setError(null);
    try {
      const context = buildContext();
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a medical assistant helping a neurologist write a clinical note. 
Based on the following visit information, write a professional clinical note in SOAP format (Subjective, Objective, Assessment, Plan). 
Be concise and clinical. Use medical terminology appropriately.

Visit Information:
${context}

Write the clinical note now:`
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.[0]?.text ?? "";
      setClinicalNote(text);
    } catch (err) {
      setError("Failed to generate note. Check your connection.");
    }
    setGenerating(false);
  }

  async function generateAbstract() {
    setGeneratingAbstract(true);
    setError(null);
    try {
      const context = buildContext();
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a medical assistant. Based on this visit, write a patient-friendly summary in both English and Arabic that the patient can understand. 
Avoid medical jargon. Be reassuring and clear. Format as:

**English Summary:**
[English text]

**ملخص بالعربية:**
[Arabic text]

Visit information:
${context}`
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.[0]?.text ?? "";
      setAbstract(text);
    } catch (err) {
      setError("Failed to generate abstract.");
    }
    setGeneratingAbstract(false);
  }

  async function handleSaveNote() {
    setSaving(true);
    await saveAINote(visitId, clinicalNote);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  function openPrint(type: string) {
    window.open(`/doctor/visit/${visitId}/print?type=${type}`, "_blank");
  }

  return (
    <div className="p-6 space-y-5">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Clinical Note Generation */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-medium text-neutral-900">Generate Clinical Note</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            AI reads all symptoms, vitals, labs, medications, diagnoses, and your notes to generate a SOAP note.
          </p>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <button onClick={generateClinicalNote} disabled={generating}
              className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-2">
              {generating ? (
                <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating...</>
              ) : "Generate Clinical Note with AI"}
            </button>
            {clinicalNote && (
              <button onClick={() => setClinicalNote("")}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
                Clear
              </button>
            )}
          </div>

          <textarea
            value={clinicalNote}
            onChange={e => setClinicalNote(e.target.value)}
            rows={12}
            placeholder="AI will generate a clinical note here. You can edit it after generation."
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono leading-relaxed"
          />

          <div className="flex gap-2">
            <button onClick={handleSaveNote} disabled={saving || !clinicalNote}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
              {saving ? "Saving..." : saved ? "Saved ✓" : "Save Note"}
            </button>
            <button onClick={() => openPrint("note")} disabled={!clinicalNote}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
              Print Clinical Note
            </button>
            <button onClick={() => openPrint("prescription")}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
              Print Prescription
            </button>
          </div>
        </div>
      </section>

      {/* Patient-Friendly Abstract */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-medium text-neutral-900">Patient-Friendly Summary</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Simple summary in English + Arabic the patient can take home.</p>
        </div>
        <div className="p-4 space-y-3">
          <button onClick={generateAbstract} disabled={generatingAbstract}
            className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-2">
            {generatingAbstract ? (
              <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating...</>
            ) : "Generate Summary (English + Arabic)"}
          </button>

          {abstract && (
            <>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed">
                {abstract}
              </div>
              <button onClick={() => openPrint("summary")}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                Print Patient Summary
              </button>
            </>
          )}
        </div>
      </section>

      {/* Book follow-up */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-medium text-neutral-900">Book Follow-up</h2>
        </div>
        <div className="p-4">
          <p className="mb-3 text-xs text-neutral-500">
            Book a follow-up appointment for this patient directly from the visit.
          </p>
          <a
            href={`/secretary/appointments/new?patientId=PATIENT_ID`}
            onClick={(e) => {
              e.preventDefault();
              // We need to navigate with the patient ID — fetch it from the visit
              fetch(`/api/visit-patient?visitId=${visitId}`)
                .then(r => r.json())
                .then(d => { if (d.patientId) window.location.href = `/secretary/appointments/new?patientId=${d.patientId}`; });
            }}
            className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Book Follow-up Appointment
          </a>
        </div>
      </section>
    </div>
  );
}
