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
  existingAbstract,
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
  existingAbstract: string | null;
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
  const [abstract, setAbstract] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingAbstract, setGeneratingAbstract] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildContext(): string {
    const age = patient.dob
      ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
      : null;

    const lines: string[] = [
      "=== PATIENT ===",
      `Name: ${patient.full_name}`,
      age ? `Age: ${age} years old` : "",
      patient.gender ? `Gender: ${patient.gender}` : "",
      patient.blood_type ? `Blood type: ${patient.blood_type}` : "",
      patient.allergies ? `Allergies: ${patient.allergies}` : "Allergies: None known",
      "",
    ];

    const v = vitals;
    const vitalParts = [
      v.heart_rate ? `Heart Rate: ${v.heart_rate} bpm` : "",
      v.blood_pressure ? `Blood Pressure: ${v.blood_pressure}` : "",
      v.temperature ? `Temperature: ${v.temperature}°C` : "",
      v.oxygen_saturation ? `O2 Saturation: ${v.oxygen_saturation}%` : "",
      v.resp_rate ? `Respiratory Rate: ${v.resp_rate}/min` : "",
      v.weight_kg ? `Weight: ${v.weight_kg} kg` : "",
      v.height_cm ? `Height: ${v.height_cm} cm` : "",
    ].filter(Boolean);

    if (vitalParts.length) {
      lines.push("=== VITALS ===");
      vitalParts.forEach(v => lines.push(v));
      lines.push("");
    }

    const basicSymptoms = symptoms.filter(s => s.category !== "advanced").map(s => s.name);
    const advSymptoms = symptoms.filter(s => s.category === "advanced").map(s => s.name);

    if (basicSymptoms.length || advSymptoms.length) {
      lines.push("=== PRESENTING SYMPTOMS ===");
      if (basicSymptoms.length) lines.push(`Basic: ${basicSymptoms.join(", ")}`);
      if (advSymptoms.length) lines.push(`Advanced/Clinical: ${advSymptoms.join(", ")}`);
      lines.push("");
    }

    if (labs.length) {
      lines.push("=== LABS & IMAGING ===");
      labs.forEach(l => {
        lines.push(`${l.type.toUpperCase()}: ${l.name}${l.lab_date ? ` (${l.lab_date})` : ""}${l.findings ? ` — Findings: ${l.findings}` : ""}`);
      });
      lines.push("");
    }

    if (diagnoses.length) {
      lines.push("=== DIAGNOSIS ===");
      diagnoses.forEach(d => {
        lines.push(`${d.is_primary ? "[PRIMARY] " : ""}${d.icd_code ? `${d.icd_code} — ` : ""}${d.description}`);
      });
      lines.push("");
    }

    if (prescriptions.length) {
      lines.push("=== MEDICATIONS PRESCRIBED ===");
      prescriptions.forEach(rx => {
        const detail = [rx.dose, rx.unit].filter(Boolean).join(" ");
        const instr = [rx.instructions, rx.duration].filter(Boolean).join(", ");
        lines.push(`- ${rx.medication_name}${detail ? ` ${detail}` : ""}${instr ? ` (${instr})` : ""}`);
      });
      lines.push("");
    }

    if (voiceNotes?.trim()) {
      lines.push("=== DOCTOR'S VOICE NOTES ===");
      lines.push(voiceNotes.trim());
      lines.push("");
    }

    if (keyPoints?.trim()) {
      lines.push("=== KEY CLINICAL POINTS ===");
      lines.push(keyPoints.trim());
      lines.push("");
    }

    return lines.filter(l => l !== undefined).join("\n").trim();
  }

  async function callAI(type: "clinical_note" | "abstract"): Promise<string> {
    const context = buildContext();
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, context, specialty: "Neurology" }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error ?? "API error");
    }

    const data = await response.json();
    return data.text ?? "";
  }

  function stripMarkdown(text: string): string {
    return text
      .replace(/#{1,6}\s+/g, "")           // ## headers
      .replace(/\*\*(.+?)\*\*/g, "$1")     // **bold**
      .replace(/\*(.+?)\*/g, "$1")         // *italic*
      .replace(/^[-*]\s+/gm, "• ")         // bullet points
      .replace(/`(.+?)`/g, "$1")           // `code`
      .replace(/\n{3,}/g, "\n\n")          // excess blank lines
      .trim();
  }

  async function handleGenerateNote() {
    setGenerating(true);
    setError(null);
    try {
      const text = await callAI("clinical_note");
      setClinicalNote(stripMarkdown(text));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate note.");
    }
    setGenerating(false);
  }

  async function handleGenerateAbstract() {
    setGeneratingAbstract(true);
    setError(null);
    try {
      const text = await callAI("abstract");
      setAbstract(stripMarkdown(text));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary.");
    }
    setGeneratingAbstract(false);
  }

  async function handleSaveNote() {
    setSaving(true);
    await saveAINote(visitId, clinicalNote, abstract || undefined);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function handleSaveAbstract() {
    setSaving(true);
    await saveAINote(visitId, clinicalNote || "", abstract);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  function openPrint(type: string) {
    window.open(`/doctor/visit/${visitId}/print?type=${type}`, "_blank");
  }

  async function handleBookFollowUp() {
    const res = await fetch(`/api/visit-patient?visitId=${visitId}`);
    const { patientId } = await res.json();
    if (patientId) window.location.href = `/secretary/appointments/new?patientId=${patientId}`;
  }

  const contextSummary = [
    symptoms.length ? `${symptoms.length} symptoms` : "",
    vitals.heart_rate || vitals.blood_pressure ? "Vitals recorded" : "",
    labs.length ? `${labs.length} labs` : "",
    diagnoses.length ? `${diagnoses.length} diagnoses` : "",
    prescriptions.length ? `${prescriptions.length} medications` : "",
    voiceNotes ? "Voice notes" : "",
    keyPoints ? "Key points" : "",
  ].filter(Boolean);

  return (
    <div className="p-6 space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Context summary */}
      <div className="rounded-md bg-neutral-50 border border-neutral-200 px-4 py-3">
        <p className="text-xs font-medium text-neutral-500 mb-1">AI will use:</p>
        <div className="flex flex-wrap gap-1.5">
          {contextSummary.length === 0 ? (
            <span className="text-xs text-neutral-400">
              No clinical data yet — fill in Patient, Clinical, and Notes tabs first.
            </span>
          ) : (
            contextSummary.map((item) => (
              <span key={item} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {item}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Clinical Note */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-medium text-neutral-900">Clinical Note (SOAP)</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            AI generates a Subjective / Objective / Assessment / Plan note from all visit data. 
            You can edit it before saving or printing.
          </p>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleGenerateNote}
              disabled={generating}
              className="flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                "Generate Clinical Note with AI"
              )}
            </button>
            {clinicalNote && (
              <button
                onClick={() => setClinicalNote("")}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
              >
                Clear
              </button>
            )}
          </div>

          <textarea
            value={clinicalNote}
            onChange={(e) => setClinicalNote(e.target.value)}
            rows={14}
            placeholder={
              generating
                ? "Generating..."
                : "Click 'Generate Clinical Note with AI' to create a SOAP note, or type your note directly here."
            }
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono leading-relaxed"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSaveNote}
              disabled={saving || !clinicalNote}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : saved ? "Saved ✓" : "Save Note"}
            </button>
            <button
              onClick={() => openPrint("note")}
              disabled={!clinicalNote}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Print Clinical Note
            </button>
            <button
              onClick={() => openPrint("prescription")}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              Print Prescription
            </button>
          </div>
        </div>
      </section>

      {/* Patient-Friendly Summary */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-medium text-neutral-900">Patient-Friendly Summary</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Simple bilingual summary (English + Arabic) the patient can take home.
          </p>
        </div>
        <div className="p-4 space-y-3">
          <button
            onClick={handleGenerateAbstract}
            disabled={generatingAbstract}
            className="flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {generatingAbstract ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating...
              </>
            ) : (
              "Generate Summary (English + Arabic)"
            )}
          </button>

          {(abstract || existingAbstract) && (
            <>
              <textarea
                value={abstract || existingAbstract || ""}
                onChange={(e) => setAbstract(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm leading-relaxed"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveAbstract}
                  disabled={saving}
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : saved ? "Saved ✓" : "Save Summary"}
                </button>
                <button
                  onClick={() => openPrint("summary")}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Print Patient Summary
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Book follow-up */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-medium text-neutral-900">Actions</h2>
        </div>
        <div className="p-4 flex gap-2">
          <button
            onClick={handleBookFollowUp}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Book Follow-up Appointment
          </button>
          <button
            onClick={() => openPrint("note")}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Print All Reports
          </button>
        </div>
      </section>
    </div>
  );
}
