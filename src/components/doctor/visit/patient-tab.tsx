"use client";
import { JordanDateInput } from "@/components/ui/jordan-date-input";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveVitalsToVisit } from "@/lib/actions/visits";
import { updatePatient } from "@/lib/actions/patients";
import { markArrived, markWithDoctor, cancelAppointment } from "@/lib/actions/appointments";
import { BilingualInput } from "@/components/ui/bilingual-input";

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
  appointmentId,
  visitStatus,
  patient,
  vitals,
}: {
  visitId: string;
  appointmentId: string;
  visitStatus: string;
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
  vitals: Vitals;
  preCheckedSymptomNames: string[];
}) {
  const router = useRouter();

  // Patient edit state
  const [editingPatient, setEditingPatient] = useState(false);
  const [fullName, setFullName] = useState(patient.full_name); // displays computed full_name
  const [fullNameAr, setFullNameAr] = useState(patient.full_name_ar ?? "");
  const [dob, setDob] = useState(patient.dob ?? "");
  const [gender, setGender] = useState(patient.gender ?? "");
  const [bloodType, setBloodType] = useState(patient.blood_type ?? "");
  const [allergies, setAllergies] = useState(patient.allergies ?? "");
  const [savingPatient, setSavingPatient] = useState(false);

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

  async function handleSavePatient(e: React.FormEvent) {
    e.preventDefault();
    setSavingPatient(true);
    await updatePatient(patient.id, {
      first_name: fullName.split(" ")[0] || fullName,
      last_name: fullName.split(" ").slice(1).join(" ") || undefined,
      first_name_ar: fullNameAr.split(" ")[0] || undefined,
      last_name_ar: fullNameAr.split(" ").slice(1).join(" ") || undefined,
      dob: dob || undefined,
      gender: (gender as "male" | "female") || undefined,
      blood_type: bloodType || undefined,
      allergies: allergies || undefined,
    });
    setSavingPatient(false);
    setEditingPatient(false);
    router.refresh();
  }

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
    <div className="p-6 space-y-4">

      {/* Secretary actions — doctor can act as secretary when needed */}
      {(visitStatus === "booked" || visitStatus === "confirmed") && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800 mr-2">Secretary actions:</p>
          <button onClick={() => markArrived(appointmentId).then(() => router.refresh())}
            className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800">
            Mark Arrived
          </button>
          <button onClick={() => { if(confirm("Cancel?")) cancelAppointment(appointmentId).then(() => router.refresh()); }}
            className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50">
            Cancel
          </button>
        </div>
      )}
      {visitStatus === "arrived" && (
        <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-800 mr-2">Secretary actions:</p>
          <button onClick={() => markWithDoctor(appointmentId).then(() => router.refresh())}
            className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800">
            Send to Doctor
          </button>
        </div>
      )}

      {/* Patient Info */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-900">Patient Information</h2>
          <button onClick={() => setEditingPatient(!editingPatient)}
            className="text-xs text-blue-600 underline hover:text-blue-800">
            {editingPatient ? "Cancel" : "Edit"}
          </button>
        </div>

        {editingPatient ? (
          <form onSubmit={handleSavePatient} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <BilingualInput label="Full name" required value={fullName} onChange={e=>setFullName(e.target.value)} />
              <BilingualInput label="Arabic name" value={fullNameAr} onChange={e=>setFullNameAr(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="mb-1 block text-xs text-neutral-600">Date of birth</label>
                <JordanDateInput value={dob} onChange={setDob} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" /></div>
              <div><label className="mb-1 block text-xs text-neutral-600">Gender</label>
                <select value={gender} onChange={e=>setGender(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                  <option value="">—</option><option value="male">Male</option><option value="female">Female</option>
                </select></div>
              <div><label className="mb-1 block text-xs text-neutral-600">Blood type</label>
                <select value={bloodType} onChange={e=>setBloodType(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                  <option value="">—</option>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(t=><option key={t} value={t}>{t}</option>)}
                </select></div>
            </div>
            <div><label className="mb-1 block text-xs text-neutral-600">Allergies</label>
              <input value={allergies} onChange={e=>setAllergies(e.target.value)} placeholder="e.g. Penicillin, Aspirin" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
            <button type="submit" disabled={savingPatient}
              className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
              {savingPatient ? "Saving..." : "Save patient info"}
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-neutral-500">Date of birth</p><p className="font-medium">{patient.dob ?? "—"}</p></div>
            <div><p className="text-xs text-neutral-500">Age</p><p className="font-medium">{age != null ? `${age} yrs` : "—"}</p></div>
            <div><p className="text-xs text-neutral-500">Gender</p><p className="font-medium capitalize">{patient.gender ?? "—"}</p></div>
            <div><p className="text-xs text-neutral-500">Blood type</p><p className="font-medium text-red-600">{patient.blood_type ?? "—"}</p></div>
            <div><p className="text-xs text-neutral-500">Phone</p><p className="font-mono font-medium">{patient.phone}</p></div>
            <div className="col-span-3">
              <p className="text-xs text-neutral-500">Allergies</p>
              {patient.allergies ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {patient.allergies.split(",").map(a=>(
                    <span key={a} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{a.trim()}</span>
                  ))}
                </div>
              ) : <p className="text-neutral-400 text-sm">None on file</p>}
            </div>
            {patient.insurance_company_name && (
              <div className="col-span-4 border-t border-neutral-100 pt-2 mt-1">
                <p className="text-xs text-neutral-500">Insurance</p>
                <p className="text-sm font-medium">{patient.insurance_company_name}
                  {patient.insurance_policy_number && <span className="ml-2 text-neutral-400">· {patient.insurance_policy_number}</span>}
                </p>
              </div>
            )}
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
