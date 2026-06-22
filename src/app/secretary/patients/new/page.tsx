"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPatient } from "@/lib/actions/patients";
import { BilingualInput } from "@/components/ui/bilingual-input";

export default function SecretaryNewPatientPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [fullNameAr, setFullNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createPatient({
      full_name: fullName,
      full_name_ar: fullNameAr || undefined,
      phone,
      dob: dob || undefined,
      gender: (gender as "male" | "female") || undefined,
      address: address || undefined,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Could not save patient.");
      return;
    }

    router.push(`/secretary/patients/${result.patientId}`);
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Link href="/secretary/patients" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← Patients
        </Link>
      </div>

      <h1 className="mb-6 text-lg font-medium text-neutral-900">New patient</h1>

      <form onSubmit={handleSubmit} className="max-w-xl rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="mb-3 grid grid-cols-2 gap-3">
          <BilingualInput label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ahmad Al-Rashid" />
          <BilingualInput label="Full name (Arabic)" value={fullNameAr} onChange={(e) => setFullNameAr(e.target.value)} placeholder="أحمد الراشد" />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Phone</label>
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="079 123 4567"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Date of birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs text-neutral-600">Gender</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="gender" checked={gender === "male"} onChange={() => setGender("male")} />
              Male
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="gender" checked={gender === "female"} onChange={() => setGender("female")} />
              Female
            </label>
          </div>
        </div>

        <div className="mb-4">
          <BilingualInput label="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <button type="submit" disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
          {loading ? "Saving..." : "Save patient"}
        </button>
      </form>
    </div>
  );
}
