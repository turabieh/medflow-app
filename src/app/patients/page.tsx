import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("patients")
    .select("id, full_name, full_name_ar, phone, dob, is_blacklisted")
    .order("created_at", { ascending: false })
    .limit(50);

  if (q?.trim()) {
    // Search by name or phone — RLS already scopes this to the user's clinic.
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data: patients, error } = await query;

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-medium text-neutral-900">Patients</h1>
          <Link
            href="/patients/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            New patient
          </Link>
        </div>

        <form className="mb-6">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name or phone..."
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </form>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </div>
        )}

        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          {!patients || patients.length === 0 ? (
            <p className="p-6 text-center text-sm text-neutral-500">
              {q ? "No patients match your search." : "No patients yet."}
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {patients.map((patient) => (
                <li key={patient.id}>
                  <Link
                    href={`/patients/${patient.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {patient.full_name}
                        {patient.full_name_ar && (
                          <span className="ml-2 text-neutral-500">{patient.full_name_ar}</span>
                        )}
                      </p>
                      <p className="font-mono text-xs text-neutral-500">{patient.phone}</p>
                    </div>
                    {patient.is_blacklisted && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        Blacklisted
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
