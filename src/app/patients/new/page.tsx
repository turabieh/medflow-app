"use client";
import { JordanDateInput } from "@/components/ui/jordan-date-input";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPatient } from "@/lib/actions/patients";
import { BilingualInput } from "@/components/ui/bilingual-input";

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [fullNameAr, setFullNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [phone2Relation, setPhone2Relation] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [allergies, setAllergies] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createPatient({
      first_name: fullName.split(' ')[0] || fullName,
      last_name: fullName.split(' ').slice(1).join(' ') || undefined,
      first_name_ar: fullNameAr ? fullNameAr.split(' ')[0] : undefined,
      last_name_ar: fullNameAr ? fullNameAr.split(' ').slice(1).join(' ') || undefined : undefined,
      phone,
      phone2: phone2 || undefined,
      phone2_relation: phone2Relation || undefined,
      dob: dob || undefined,
      gender: gender || undefined,
      address: address || undefined,
      email: email || undefined,
      allergies: allergies || undefined,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Could not save patient.");
      return;
    }

    router.push(`/patients/${result.patientId}`);
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-medium text-neutral-900">New patient</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            Cancel
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
        >
          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-4">
            <BilingualInput
              label="Full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Name in English or Arabic"
            />
            <BilingualInput
              label="Full name (other language, optional)"
              value={fullNameAr}
              onChange={(e) => setFullNameAr(e.target.value)}
              placeholder="الاسم بالعربية"
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-neutral-700">Phone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                placeholder="079 XXX XXXX"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-700">Date of birth</label>
              <JordanDateInput
                value={dob}
                onChange={setDob}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-neutral-700">Second phone (optional)</label>
              <input
                type="tel"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                placeholder="079 XXX XXXX"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-700">Relation (e.g. spouse, parent)</label>
              <input
                type="text"
                value={phone2Relation}
                onChange={(e) => setPhone2Relation(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm text-neutral-700">Gender</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="gender"
                  checked={gender === "male"}
                  onChange={() => setGender("male")}
                />
                Male
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="gender"
                  checked={gender === "female"}
                  onChange={() => setGender("female")}
                />
                Female
              </label>
            </div>
          </div>

          <div className="mb-4">
            <BilingualInput
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address in English or Arabic"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm text-neutral-700">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              placeholder="patient@example.com"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1 block text-sm text-neutral-700">Allergies (optional)</label>
            <textarea
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              placeholder="e.g. Penicillin"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save patient"}
          </button>
        </form>
      </div>
    </div>
  );
}
