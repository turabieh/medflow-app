import { createClient } from "@/lib/supabase/server";
import { DeletePatientButton } from "./delete-patient-button";

export const dynamic = "force-dynamic";

export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("clinic_id, role").eq("id", user?.id ?? "").single();

  if (profile?.role !== "admin") {
    return <div className="p-6 text-sm text-red-600">Access denied.</div>;
  }

  let patients: {
    id: string;
    full_name: string;
    full_name_ar: string | null;
    phone: string;
    dob: string | null;
    gender: string | null;
    created_at: string;
  }[] = [];

  if (q?.trim()) {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, full_name_ar, phone, dob, gender, created_at")
      .eq("clinic_id", profile.clinic_id)
      .or(`full_name.ilike.%${q}%,full_name_ar.ilike.%${q}%,phone.ilike.%${q}%`)
      .order("full_name")
      .limit(30);
    patients = data ?? [];
  }

  // Count per patient: visits and appointments
  const ids = patients.map(p => p.id);
  const [{ data: visitCounts }, { data: apptCounts }] = await Promise.all([
    ids.length
      ? supabase.from("visits").select("patient_id").in("patient_id", ids)
      : { data: [] },
    ids.length
      ? supabase.from("appointments").select("patient_id").in("patient_id", ids)
      : { data: [] },
  ]);

  const visitMap = new Map<string, number>();
  const apptMap = new Map<string, number>();
  for (const v of visitCounts ?? []) visitMap.set(v.patient_id, (visitMap.get(v.patient_id) ?? 0) + 1);
  for (const a of apptCounts ?? []) apptMap.set(a.patient_id, (apptMap.get(a.patient_id) ?? 0) + 1);

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Patient Management</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Search for patients and permanently remove them from the clinic database.
      </p>

      <form method="GET" className="mb-6 flex gap-2">
        <input type="text" name="q" defaultValue={q} autoFocus
          placeholder="Search by name or phone..."
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500" />
        <button type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Search
        </button>
      </form>

      {q && patients.length === 0 && (
        <p className="text-sm text-neutral-500">No patients found for &quot;{q}&quot;.</p>
      )}

      {!q && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-400">
          Search by patient name or phone number to manage records.
        </div>
      )}

      {patients.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-4 py-2 flex items-center justify-between">
            <p className="text-xs text-neutral-500">{patients.length} patient{patients.length !== 1 ? "s" : ""} found</p>
            <p className="text-xs text-red-500 font-medium">⚠ Deletion is permanent and cannot be undone</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-4 py-2 text-xs font-medium text-neutral-500">Patient</th>
                <th className="px-4 py-2 text-xs font-medium text-neutral-500">Phone</th>
                <th className="px-4 py-2 text-xs font-medium text-neutral-500">DOB</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-neutral-500">Visits</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-neutral-500">Appts</th>
                <th className="px-4 py-2 text-xs font-medium text-neutral-500">Registered</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {patients.map(p => {
                const age = p.dob
                  ? Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
                  : null;
                return (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{p.full_name}</p>
                      {p.full_name_ar && <p className="text-xs text-neutral-400" dir="rtl">{p.full_name_ar}</p>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-600">{p.phone}</td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {p.dob ?? "—"}
                      {age !== null && <span className="ml-1 text-neutral-400">({age}y)</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-medium text-neutral-700">
                      {visitMap.get(p.id) ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-medium text-neutral-700">
                      {apptMap.get(p.id) ?? 0}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-400">
                      {new Date(p.created_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeletePatientButton
                        patientId={p.id}
                        patientName={p.full_name}
                        visitCount={visitMap.get(p.id) ?? 0}
                        apptCount={apptMap.get(p.id) ?? 0}
                        searchQuery={q ?? ""}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
