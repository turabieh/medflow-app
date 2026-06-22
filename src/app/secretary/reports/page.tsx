import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SecretaryReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  // Search patients to find one to print for
  let patients: { id: string; full_name: string; phone: string }[] = [];
  if (q?.trim()) {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, phone")
      .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(10);
    patients = data ?? [];
  }

  return (
    <div>
      <h1 className="mb-6 text-lg font-medium text-neutral-900">Reports &amp; Print</h1>

      <form className="mb-6">
        <label className="mb-1 block text-sm text-neutral-700">Search for a patient to print documents</label>
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Name or phone number..."
            className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          <button type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Search
          </button>
        </div>
      </form>

      {q && patients.length === 0 && (
        <p className="text-sm text-neutral-500">No patients found.</p>
      )}

      {patients.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <ul className="divide-y divide-neutral-100">
            {patients.map((patient) => (
              <li key={patient.id} className="px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{patient.full_name}</p>
                    <p className="font-mono text-xs text-neutral-500">{patient.phone}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/secretary/reports/print?type=summary&patientId=${patient.id}`}
                    target="_blank"
                    className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    🖨 Visit summary
                  </Link>
                  <Link
                    href={`/secretary/reports/print?type=confirmation&patientId=${patient.id}`}
                    target="_blank"
                    className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    🖨 Appointment confirmation
                  </Link>
                  <Link
                    href={`/secretary/reports/print?type=invoice&patientId=${patient.id}`}
                    target="_blank"
                    className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    🖨 Invoice / bill
                  </Link>
                  <Link
                    href={`/secretary/reports/print?type=prescription&patientId=${patient.id}`}
                    target="_blank"
                    className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    🖨 Prescription
                  </Link>
                  <Link
                    href={`/secretary/reports/print?type=referral&patientId=${patient.id}`}
                    target="_blank"
                    className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    🖨 Referral letter
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
