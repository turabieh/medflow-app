import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DoctorPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let patients: { id: string; full_name: string; full_name_ar: string | null; phone: string; dob: string | null; gender: string | null }[] = [];

  if (q && q.trim().length >= 2) {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, full_name_ar, phone, dob, gender")
      .or(`full_name.ilike.%${q}%,full_name_ar.ilike.%${q}%,phone.ilike.%${q}%`)
      .order("full_name")
      .limit(30);
    patients = data ?? [];
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Patient Search</h1>
      <p className="mb-6 text-sm text-neutral-500">Search for any patient to view their records and history.</p>

      <form method="GET" className="mb-4 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="Search by name or phone number..."
          className="flex-1 max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Search
        </button>
      </form>

      {q && q.length >= 2 && patients.length === 0 && (
        <p className="text-sm text-neutral-500">No patients found for &quot;{q}&quot;.</p>
      )}

      {patients.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <ul className="divide-y divide-neutral-100">
            {patients.map((patient) => {
              const age = patient.dob
                ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
                : null;
              return (
                <li key={patient.id}>
                  <Link href={`/doctor/patients/${patient.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {patient.full_name}
                        {patient.full_name_ar && (
                          <span className="ml-2 text-neutral-400" dir="rtl">{patient.full_name_ar}</span>
                        )}
                      </p>
                      <p className="text-xs text-neutral-500">
                        <span className="font-mono">{patient.phone}</span>
                        {age !== null && <span className="ml-2">{age} yrs</span>}
                        {patient.gender && <span className="ml-2 capitalize">{patient.gender}</span>}
                      </p>
                    </div>
                    <span className="text-xs text-neutral-400">View file →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!q && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center">
          <p className="text-sm text-neutral-500">Search by patient name or phone number.</p>
        </div>
      )}
    </div>
  );
}
