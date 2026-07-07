"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { admitInpatient } from "@/lib/actions/inpatients";

interface Hospital { id: string; name: string; }
interface ExistingPatient { id: string; full_name: string; phone: string; }

export function AdmitPatientForm({ hospitals }: { hospitals: Hospital[] }) {
  const router = useRouter();

  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ExistingPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<ExistingPatient | null>(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [searching, setSearching] = useState(false);

  // English name parts
  const [newFirstName,  setNewFirstName]  = useState("");
  const [newMiddleName, setNewMiddleName] = useState("");
  const [newLastName,   setNewLastName]   = useState("");
  // Arabic name parts
  const [newFirstNameAr,  setNewFirstNameAr]  = useState("");
  const [newMiddleNameAr, setNewMiddleNameAr] = useState("");
  const [newLastNameAr,   setNewLastNameAr]   = useState("");

  const [newPhone,      setNewPhone]      = useState("");
  const [newDob,        setNewDob]        = useState("");
  const [newGender,     setNewGender]     = useState("");
  const [newBloodType,  setNewBloodType]  = useState("");
  const [newAllergies,  setNewAllergies]  = useState("");

  const [hospitalId,        setHospitalId]        = useState(hospitals[0]?.id ?? "");
  const [hospitalPatientId, setHospitalPatientId] = useState("");
  const [admissionDate,     setAdmissionDate]     = useState(new Date().toISOString().split("T")[0]);
  const [location,          setLocation]          = useState("");
  const [diagnosisSummary,  setDiagnosisSummary]  = useState("");
  const [feePerVisit,       setFeePerVisit]       = useState("");

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handlePatientSearch(q: string) {
    setPatientSearch(q);
    setSelectedPatient(null);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const res  = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(data.patients ?? []);
    setSearching(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isNewPatient && !selectedPatient) {
      setError("Please select an existing patient or click 'New patient'.");
      return;
    }
    if (isNewPatient && !newFirstName.trim()) {
      setError("First name is required.");
      return;
    }
    setSaving(true);
    const result = await admitInpatient({
      patientId:           selectedPatient?.id,
      patientFirstName:    isNewPatient ? newFirstName.trim()         : undefined,
      patientMiddleName:   isNewPatient ? newMiddleName.trim()  || undefined : undefined,
      patientLastName:     isNewPatient ? newLastName.trim()    || undefined : undefined,
      patientFirstNameAr:  isNewPatient ? newFirstNameAr.trim() || undefined : undefined,
      patientMiddleNameAr: isNewPatient ? newMiddleNameAr.trim()|| undefined : undefined,
      patientLastNameAr:   isNewPatient ? newLastNameAr.trim()  || undefined : undefined,
      patientPhone:        isNewPatient ? newPhone.trim()        || undefined : undefined,
      patientDob:          isNewPatient ? newDob                || undefined : undefined,
      patientGender:       isNewPatient ? newGender              || undefined : undefined,
      patientBloodType:    isNewPatient ? newBloodType           || undefined : undefined,
      patientAllergies:    isNewPatient ? newAllergies.trim()    || undefined : undefined,
      hospitalId:          hospitalId || "",
      hospitalPatientId:   hospitalPatientId.trim() || undefined,
      admissionDate,
      location:            location.trim() || undefined,
      diagnosisSummary:    diagnosisSummary.trim() || undefined,
      feePerVisit:         feePerVisit ? parseFloat(feePerVisit) : undefined,
    });
    setSaving(false);
    if (!result.success) { setError(result.error ?? "Could not admit patient."); return; }
    router.push(`/doctor/inpatients/${result.inpatientId}`);
  }

  const inp = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 transition";
  const lbl = "mb-1 block text-xs font-medium text-neutral-600";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── PATIENT ─────────────────────────────────────── */}
      <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Patient</h2>
          <button type="button"
            onClick={() => { setIsNewPatient(p => !p); setSelectedPatient(null); setSearchResults([]); setPatientSearch(""); }}
            className="text-xs text-blue-600 hover:underline">
            {isNewPatient ? "Search existing patient instead" : "New patient (not in system)"}
          </button>
        </div>

        {!isNewPatient ? (
          <div>
            <label className={lbl}>Search by name or phone</label>
            <input value={patientSearch} onChange={e => handlePatientSearch(e.target.value)}
              placeholder="Type to search..." className={inp} />
            {searching && <p className="mt-1 text-xs text-neutral-400">Searching...</p>}
            {searchResults.length > 0 && (
              <ul className="mt-1 rounded-md border border-neutral-200 bg-white shadow-sm divide-y divide-neutral-100 max-h-48 overflow-y-auto">
                {searchResults.map(p => (
                  <li key={p.id}>
                    <button type="button"
                      onClick={() => { setSelectedPatient(p); setSearchResults([]); setPatientSearch(p.full_name); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50">
                      <span className="font-medium">{p.full_name}</span>
                      <span className="ml-2 text-xs text-neutral-400">{p.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedPatient && (
              <div className="mt-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
                Selected: <strong>{selectedPatient.full_name}</strong>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* English name */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Name (English)</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={lbl}>First Name <span className="text-red-500">*</span></label>
                  <input value={newFirstName} onChange={e => setNewFirstName(e.target.value)}
                    placeholder="Ahmad" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Middle Name</label>
                  <input value={newMiddleName} onChange={e => setNewMiddleName(e.target.value)}
                    placeholder="Mohammad" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Last Name</label>
                  <input value={newLastName} onChange={e => setNewLastName(e.target.value)}
                    placeholder="Al-Rashid" className={inp} />
                </div>
              </div>
            </div>

            {/* Arabic name */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Name (Arabic)</p>
              <div className="grid grid-cols-3 gap-3" dir="rtl">
                <div>
                  <label className={lbl}>الاسم الأول</label>
                  <input value={newFirstNameAr} onChange={e => setNewFirstNameAr(e.target.value)}
                    placeholder="أحمد" dir="rtl" className={inp} />
                </div>
                <div>
                  <label className={lbl}>الاسم الأوسط</label>
                  <input value={newMiddleNameAr} onChange={e => setNewMiddleNameAr(e.target.value)}
                    placeholder="محمد" dir="rtl" className={inp} />
                </div>
                <div>
                  <label className={lbl}>اسم العائلة</label>
                  <input value={newLastNameAr} onChange={e => setNewLastNameAr(e.target.value)}
                    placeholder="الرشيد" dir="rtl" className={inp} />
                </div>
              </div>
            </div>

            {/* Other fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Phone</label>
                <input value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  placeholder="+962 7x xxx xxxx" className={inp} />
              </div>
              <div>
                <label className={lbl}>Date of Birth</label>
                <input type="date" value={newDob} onChange={e => setNewDob(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Gender</label>
                <select value={newGender} onChange={e => setNewGender(e.target.value)} className={inp}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Blood Type</label>
                <select value={newBloodType} onChange={e => setNewBloodType(e.target.value)} className={inp}>
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={lbl}>Allergies</label>
                <input value={newAllergies} onChange={e => setNewAllergies(e.target.value)}
                  placeholder="Penicillin, aspirin..." className={inp} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ADMISSION DETAILS ───────────────────────────── */}
      <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900">Admission Details</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Hospital</label>
            <select value={hospitalId} onChange={e => setHospitalId(e.target.value)} className={inp}>
              <option value="">No hospital</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Hospital Patient ID / MRN</label>
            <input value={hospitalPatientId} onChange={e => setHospitalPatientId(e.target.value)}
              placeholder="Optional" className={inp} />
          </div>
          <div>
            <label className={lbl}>Admission Date <span className="text-red-500">*</span></label>
            <input required type="date" value={admissionDate}
              onChange={e => setAdmissionDate(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Location / Room <span className="text-neutral-400 font-normal">(optional — can add later)</span></label>
            <input value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Room 204, ICU, Ward B..." className={inp} />
          </div>
          <div className="col-span-2">
            <label className={lbl}>Admitting Diagnosis</label>
            <textarea value={diagnosisSummary} onChange={e => setDiagnosisSummary(e.target.value)}
              rows={2} placeholder="Initial diagnosis or reason for admission..."
              className={`${inp} resize-none`} />
          </div>
          <div>
            <label className={lbl}>Fee per Visit <span className="text-neutral-400 font-normal">(for claim)</span></label>
            <input type="number" value={feePerVisit} onChange={e => setFeePerVisit(e.target.value)}
              placeholder="0.00" min="0" step="0.01" className={inp} />
          </div>
        </div>
      </div>

      <button type="submit" disabled={saving}
        className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition">
        {saving ? "Admitting..." : "Admit Patient"}
      </button>
    </form>
  );
}
