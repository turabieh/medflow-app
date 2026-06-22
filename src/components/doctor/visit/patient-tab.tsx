"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveVitalsToVisit } from "@/lib/actions/visits";

interface Vitals {
  heart_rate?: number | null;
  blood_pressure?: string | null;
  temperature?: number | null;
  oxygen_saturation?: number | null;
  resp_rate?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
}

export function PatientTab({
  visitId,
  patient,
  vitals,
}: {
  visitId: string;
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
  preCheckedSymptomNames: string[];
}) {
  const router = useRouter();

  const [hr, setHr] = useState(vitals.heart_rate?.toString() ?? "");
  const [bp, setBp] = useState(vitals.blood_pressure ?? "");
  const [temp, setTemp] = useState(vitals.temperature?.toString() ?? "");
  const [o2, setO2] = useState(vitals.oxygen_saturation?.toString() ?? "");
  const [rr, setRr] = useState(vitals.resp_rate?.toString() ?? "");
  const [wt, setWt] = useState(vitals.weight_kg?.toString() ?? "");
  const [ht, setHt] = useState(vitals.height_cm?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const age = patient.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  async function handleSaveVitals(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveVitalsToVisit(visitId, {
      heartRate:        hr     ? parseInt(hr)     : null,
      bloodPressure:    bp     || null,
      temperature:      temp   ? parseFloat(temp) : null,
      oxygenSaturation: o2     ? parseInt(o2)     : null,
      respRate:         rr     ? parseInt(rr)     : null,
      weightKg:         wt     ? parseFloat(wt)   : null,
      heightCm:         ht     ? parseFloat(ht)   : null,
    });
    setSaving(false);
    if (!result.success) { setError(result.error ?? "Error"); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="p-6 space-y-5">
      {/* Patient Info */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-neutral-900">Patient Information</h2>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div><p className="text-xs text-neutral-500">Date of birth</p><p className="font-medium">{patient.dob ?? "—"}</p></div>
          <div><p className="text-xs text-neutral-500">Age</p><p className="font-medium">{age != null ? `${age} years` : "—"}</p></div>
          <div><p className="text-xs text-neutral-500">Gender</p><p className="font-medium capitalize">{patient.gender ?? "—"}</p></div>
          <div><p className="text-xs text-neutral-500">Blood type</p><p className="font-medium text-red-600">{patient.blood_type ?? "—"}</p></div>
          <div><p className="text-xs text-neutral-500">Phone</p><p className="font-mono font-medium">{patient.phone}</p></div>
          <div className="col-span-3">
            <p className="text-xs text-neutral-500">Allergies</p>
            {patient.allergies ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {patient.allergies.split(",").map((a) => (
                  <span key={a} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {a.trim()}
                  </span>
                ))}
              </div>
            ) : <p className="text-neutral-400 text-sm">None on file</p>}
          </div>
        </div>
        {patient.insurance_company_name && (
          <div className="mt-3 border-t border-neutral-100 pt-3">
            <p className="text-xs text-neutral-500">Insurance</p>
            <p className="text-sm font-medium">{patient.insurance_company_name}
              {patient.insurance_policy_number && <span className="ml-2 text-neutral-400">· {patient.insurance_policy_number}</span>}
            </p>
          </div>
        )}
      </section>

      {/* Vitals */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-neutral-900">Vitals</h2>
        {error && <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {saved && <div className="mb-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Vitals saved.</div>}

        <form onSubmit={handleSaveVitals}>
          <div className="mb-3 grid grid-cols-5 gap-3">
            {[
              { label: "Heart Rate", placeholder: "bpm", value: hr, set: setHr, type: "number" },
              { label: "Blood Pressure", placeholder: "mmHg", value: bp, set: setBp, type: "text" },
              { label: "Temperature", placeholder: "°C", value: temp, set: setTemp, type: "number" },
              { label: "O₂ Saturation", placeholder: "%", value: o2, set: setO2, type: "number" },
              { label: "Resp. Rate", placeholder: "/min", value: rr, set: setRr, type: "number" },
            ].map(({ label, placeholder, value, set, type }) => (
              <div key={label}>
                <label className="mb-1 block text-xs text-neutral-500">{label}</label>
                <input
                  type={type}
                  step={type === "number" && label === "Temperature" ? "0.1" : undefined}
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            {[
              { label: "Weight (kg)", placeholder: "kg", value: wt, set: setWt },
              { label: "Height (cm)", placeholder: "cm", value: ht, set: setHt },
            ].map(({ label, placeholder, value, set }) => (
              <div key={label}>
                <label className="mb-1 block text-xs text-neutral-500">{label}</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Vitals"}
          </button>
        </form>
      </section>
    </div>
  );
}
