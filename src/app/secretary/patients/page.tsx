import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SecretaryPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const supabase = await createClient();

  let patients: { id: string; full_name: string; full_name_ar: string | null; phone: string }[] = [];

  if (q.length >= 2) {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, full_name_ar, phone")
      .or(`full_name.ilike.%${q}%,full_name_ar.ilike.%${q}%,phone.ilike.%${q}%`)
      .order("full_name")
      .limit(30);
    patients = data ?? [];
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium text-neutral-900">Patients</h1>
        <Link
          href="/secretary/patients/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + New patient
        </Link>
      </div>

      <form method="GET" className="mb-4 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name or phone number..."
          autoFocus
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Search
        </button>
      </form>

      {q.length > 0 && q.length < 2 && (
        <p className="text-sm text-neutral-500">Type at least 2 characters to search.</p>
      )}

      {q.length >= 2 && (
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          {patients.length === 0 ? (
            <p className="p-6 text-center text-sm text-neutral-500">No patients found for &quot;{q}&quot;.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {patients.map((patient) => (
                <li key={patient.id}>
                  <Link
                    href={`/secretary/patients/${patient.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {patient.full_name}
                        {patient.full_name_ar && (
                          <span className="ml-2 text-neutral-400" dir="rtl">{patient.full_name_ar}</span>
                        )}
                      </p>
                      <p className="font-mono text-xs text-neutral-500">{patient.phone}</p>
                    </div>
                    <span className="text-xs text-neutral-400">View →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!q && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center">
          <p className="text-sm text-neutral-500">Search by patient name or phone number to find a patient.</p>
        </div>
      )}
    </div>
  );
}
