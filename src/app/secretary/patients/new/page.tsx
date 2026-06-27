"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Doctor { id: string; full_name: string; specialty: string | null; }

export default function SecretaryNewPatientPage() {
  const router = useRouter();
  const [fullName, setFullName]   = useState("");
  const [fullNameAr, setFullNameAr] = useState("");
  const [phone, setPhone]         = useState("");
  const [dob, setDob]             = useState("");
  const [gender, setGender]       = useState("");
  const [address, setAddress]     = useState("");
  const [doctorId, setDoctorId]   = useState("");
  const [doctors, setDoctors]     = useState<Doctor[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("users")
      .select("id, full_name, specialty")
      .eq("role", "doctor").eq("is_active", true).order("full_name")
      .then(({ data }) => {
        setDoctors(data ?? []);
        if (data && data.length === 1) setDoctorId(data[0].id);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setError("Patient name is required."); return; }
    if (!phone.trim())    { setError("Phone number is required."); return; }

    setLoading(true); setError(null);

    const supabase = createClient();
    const { data: profile } = await supabase.auth.getUser()
      .then(r => supabase.from("users").select("clinic_id").eq("id", r.data.user?.id ?? "").single());

    const { data: patient, error: pe } = await supabase.from("patients").insert({
      clinic_id:           profile?.clinic_id,
      full_name:           fullName.trim(),
      full_name_ar:        fullNameAr.trim() || null,
      phone:               phone.trim(),
      dob:                 dob || null,
      gender:              gender || null,
      address:             address.trim() || null,
      preferred_doctor_id: doctorId || null,
    }).select("id").single();

    setLoading(false);

    if (pe || !patient) { setError(pe?.message ?? "Could not save patient."); return; }
    router.push(`/secretary/patients/${patient.id}`);
  }

  const inp = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500";

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Link href="/secretary/patients" className="text-sm text-neutral-500 hover:text-neutral-700">← Patients</Link>
        <span className="text-neutral-300">/</span>
        <span className="text-sm text-neutral-700">New Patient</span>
      </div>

      <h1 className="mb-6 text-lg font-medium text-neutral-900">Add New Patient</h1>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {/* Assign doctor — prominent at top */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <label className="mb-1.5 block text-sm font-semibold text-indigo-900">
            Assigned Doctor
            {doctors.length > 1 && <span className="ml-1 text-xs font-normal text-indigo-600">(required for multi-doctor clinics)</span>}
          </label>
          <select value={doctorId} onChange={e => setDoctorId(e.target.value)}
            className="w-full rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500">
            <option value="">— No specific doctor —</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>
                {d.full_name}{d.specialty ? ` · ${d.specialty}` : ""}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-indigo-600">
            This doctor will appear as default when booking appointments for this patient.
          </p>
        </div>

        {/* Patient info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="mb-1 block text-xs font-medium text-neutral-600 uppercase tracking-wide">Full Name (EN) *</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Patient full name" className={inp} />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="mb-1 block text-xs font-medium text-neutral-600 uppercase tracking-wide">Full Name (AR)</label>
            <input value={fullNameAr} onChange={e => setFullNameAr(e.target.value)} placeholder="الاسم الكامل" dir="rtl" className={inp} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 uppercase tracking-wide">Phone *</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+962 7x xxx xxxx" className={inp} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 uppercase tracking-wide">Date of Birth</label>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 uppercase tracking-wide">Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)} className={inp}>
              <option value="">— Select —</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 uppercase tracking-wide">Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="City, Street" className={inp} />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
          {loading ? "Saving..." : "Save Patient"}
        </button>
      </form>
    </div>
  );
}
