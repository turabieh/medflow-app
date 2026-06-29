"use client";
import { JordanDateInput } from "@/components/ui/jordan-date-input";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { admitInpatient } from "@/lib/actions/inpatients";

interface Hospital { id: string; name: string; primary_phone: string; }
interface ExistingPatient { id: string; full_name: string; phone: string; dob: string | null; }

export function AdmitPatientForm({ hospitals }: { hospitals: Hospital[] }) {
  const router = useRouter();

  // Patient search
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ExistingPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<ExistingPatient | null>(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [searching, setSearching] = useState(false);

  // New patient fields
  const [newName, setNewName] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newGender, setNewGender] = useState("");
  const [newBloodType, setNewBloodType] = useState("");
  const [newAllergies, setNewAllergies] = useState("");

  // Admission fields
  const [hospitalId, setHospitalId] = useState(hospitals[0]?.id ?? "");
  const [hospitalPatientId, setHospitalPatientId] = useState("");
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState("");
  const [diagnosisSummary, setDiagnosisSummary] = useState("");
  const [feePerVisit, setFeePerVisit] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePatientSearch(q: string) {
    setPatientSearch(q);
    setSelectedPatient(null);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const res = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(data.patients ?? []);
    setSearching(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!hospitalId) { setError("Select a hospital."); return; }
    if (!location.trim()) { setError("Location is required (room, floor, unit)."); return; }
    if (!isNewPatient && !selectedPatient) { setError("Select an existing patient or switch to new patient."); return; }

    setSaving(true);
    const result = await admitInpatient({
      patientId:          selectedPatient?.id,
      patientName:        isNewPatient ? newName : undefined,
      patientNameAr:      isNewPatient ? newNameAr : undefined,
      patientPhone:       isNewPatient ? newPhone : undefined,
      patientDob:         isNewPatient ? newDob : undefined,
      patientGender:      isNewPatient ? newGender : undefined,
      patientBloodType:   isNewPatient ? newBloodType : undefined,
      patientAllergies:   isNewPatient ? newAllergies : undefined,
      hospitalId,
      hospitalPatientId,
      admissionDate,
      location,
      diagnosisSummary,
      feePerVisit:        feePerVisit ? parseFloat(feePerVisit) : undefined,
    });
    setSaving(false);

    if (!result.success) { setError(result.error ?? "Could not admit patient."); return; }
    router.push(`/doctor/inpatients/${result.inpatientId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Patient selection */}
      <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-900">Patient</h2>
          <button type="button" onClick={() => { setIsNewPatient(!isNewPatient); setSelectedPatient(null); setSearchResults([]); setPatientSearch(""); }}
            className="text-xs text-blue-600 hover:underline">
            {isNewPatient ? "Search existing patient instead" : "New patient (not in system)"}
          </button>
        </div>

        {!isNewPatient ? (
          <div className="relative">
            <input type="text" value={patientSearch} onChange={e => handlePatientSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            {searching && <p className="mt-1 text-xs text-neutral-400">Searching...</p>}
            {searchResults.length > 0 && !selectedPatient && (
              <ul className="absolute z-10 mt-1 w-full rounded-md border border-neutral-200 bg-white shadow-lg">
                {searchResults.map(p => (
                  <li key={p.id}>
                    <button type="button" onClick={() => { setSelectedPatient(p); setPatientSearch(p.full_name); setSearchResults([]); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50">
                      {p.full_name} <span className="text-xs text-neutral-400 font-mono">{p.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedPatient && (
              <div className="mt-2 flex items-center justify-between rounded-md bg-green-50 border border-green-200 px-3 py-2">
                <p className="text-sm font-medium text-green-800">{selectedPatient.full_name}</p>
                <button type="button" onClick={() => { setSelectedPatient(null); setPatientSearch(""); }}
                  className="text-xs text-green-600 hover:text-green-800">Change</button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Full Name (English) *</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-600">الاسم بالعربية</label>
                <input value={newNameAr} onChange={e => setNewNameAr(e.target.value)} dir="rtl"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Phone *</label>
                <input required value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Date of Birth</label>
                <JordanDateInput value={newDob} onChange={setNewDob} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Gender</label>
                <select value={newGender} onChange={e => setNewGender(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Blood Type</label>
                <select value={newBloodType} onChange={e => setNewBloodType(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                  <option value="">—</option>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Allergies</label>
              <input value={newAllergies} onChange={e => setNewAllergies(e.target.value)}
                placeholder="e.g. Penicillin, Aspirin"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </div>
          </div>
        )}
      </div>

      {/* Admission details */}
      <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-medium text-neutral-900">Admission Details</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Hospital *</label>
            <select value={hospitalId} onChange={e => setHospitalId(e.target.value)} required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
              {hospitals.length === 0 && <option value="">No hospitals — add in Admin</option>}
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Hospital Patient ID / MRN</label>
            <input value={hospitalPatientId} onChange={e => setHospitalPatientId(e.target.value)}
              placeholder="e.g. KH-2026-0042"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Admission Date *</label>
            <JordanDateInput value={admissionDate} onChange={setAdmissionDate} required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Location / Room *</label>
            <input value={location} onChange={e => setLocation(e.target.value)} required
              placeholder="e.g. Room 304, 3rd Floor · ICU · Emergency"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-neutral-600">Admitting Diagnosis</label>
            <input value={diagnosisSummary} onChange={e => setDiagnosisSummary(e.target.value)}
              placeholder="e.g. Acute ischemic stroke, right MCA territory"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Fee per Visit (for claim)</label>
            <input type="number" min="0" step="0.01" value={feePerVisit} onChange={e => setFeePerVisit(e.target.value)}
              placeholder="e.g. 25.00"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      <button type="submit" disabled={saving || hospitals.length === 0}
        className="w-full rounded-md bg-red-500 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
        {saving ? "Admitting..." : "Admit Patient"}
      </button>
    </form>
  );
}
