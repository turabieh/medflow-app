import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SecretaryPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const q      = params.q?.trim() ?? "";
  const filter = params.filter ?? "all"; // all | outpatient | inpatient
  const supabase = await createClient();

  const { data: profile } = await supabase.auth.getUser().then(async r => {
    if (!r.data.user) return { data: null };
    return supabase.from("users").select("clinic_id").eq("id", r.data.user.id).single();
  });
  const clinicId = profile?.clinic_id ?? "";

  let patients: { id: string; full_name: string; full_name_ar: string | null; phone: string }[] = [];

  if (q.length >= 2) {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, full_name_ar, phone")
      .eq("clinic_id", clinicId)
      .or(`full_name.ilike.%${q}%,full_name_ar.ilike.%${q}%,phone.ilike.%${q}%`)
      .order("full_name")
      .limit(50);
    patients = data ?? [];
  }

  // For each patient, check active inpatient + today's appointment
  const today = new Date().toISOString().split("T")[0];
  const patientIds = patients.map(p => p.id);

  const [inpatientRes, apptRes] = patientIds.length > 0
    ? await Promise.all([
        supabase.from("inpatients")
          .select("patient_id, status, location, hospitals(name)")
          .eq("clinic_id", clinicId)
          .in("patient_id", patientIds)
          .eq("status", "active"),
        supabase.from("appointments")
          .select("patient_id, status, start_time, visit_type")
          .eq("clinic_id", clinicId)
          .in("patient_id", patientIds)
          .eq("appt_date", today)
          .not("status", "in", '("cancelled","no_show")'),
      ])
    : [{ data: [] }, { data: [] }];

  // Build lookup maps
  type InpatientRow = { patient_id: string; status: string; location: string | null; hospitals: { name: string } | { name: string }[] | null };
  type ApptRow      = { patient_id: string; status: string; start_time: string; visit_type: string };

  const inpatientMap = new Map<string, InpatientRow>();
  for (const ip of (inpatientRes.data ?? []) as InpatientRow[])
    inpatientMap.set(ip.patient_id, ip);

  const apptMap = new Map<string, ApptRow>();
  for (const a of (apptRes.data ?? []) as ApptRow[])
    apptMap.set(a.patient_id, a);

  // Apply filter
  const filtered = patients.filter(p => {
    if (filter === "inpatient")  return inpatientMap.has(p.id);
    if (filter === "outpatient") return !inpatientMap.has(p.id);
    return true;
  });

  const inpatientCount  = patients.filter(p => inpatientMap.has(p.id)).length;
  const outpatientCount = patients.filter(p => !inpatientMap.has(p.id)).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium text-neutral-900">Patients</h1>
        <Link href="/secretary/patients/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          + New patient
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="mb-4 flex gap-2">
        <input type="hidden" name="filter" value={filter} />
        <input type="text" name="q" defaultValue={q}
          placeholder="Search by name or phone..."
          autoFocus
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500" />
        <button type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Search
        </button>
      </form>

      {q.length > 0 && q.length < 2 && (
        <p className="text-sm text-neutral-500">Type at least 2 characters to search.</p>
      )}

      {q.length >= 2 && (
        <>
          {/* Filter tabs */}
          {patients.length > 0 && (
            <div className="mb-3 flex items-center gap-2">
              {[
                { key:"all",        label:"All",        count: patients.length },
                { key:"outpatient", label:"Outpatient", count: outpatientCount },
                { key:"inpatient",  label:"Inpatient",  count: inpatientCount  },
              ].map(tab => (
                <Link key={tab.key}
                  href={`/secretary/patients?q=${encodeURIComponent(q)}&filter=${tab.key}`}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filter === tab.key
                      ? tab.key === "inpatient"
                        ? "bg-blue-600 text-white"
                        : tab.key === "outpatient"
                        ? "bg-emerald-600 text-white"
                        : "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}>
                  {tab.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    filter === tab.key ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-500"
                  }`}>{tab.count}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="mb-3 flex gap-4 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />Outpatient
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />Inpatient (currently admitted)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />Has appointment today
            </span>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-neutral-500">
                No {filter !== "all" ? filter : ""} patients found for &quot;{q}&quot;.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {filtered.map(patient => {
                  const ip   = inpatientMap.get(patient.id);
                  const appt = apptMap.get(patient.id);
                  const isInpatient = !!ip;
                  const hospName = ip?.hospitals
                    ? (Array.isArray(ip.hospitals) ? ip.hospitals[0]?.name : (ip.hospitals as {name:string}).name)
                    : null;

                  return (
                    <li key={patient.id}>
                      <Link href={`/secretary/patients/${patient.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors">
                        {/* Color strip */}
                        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                          isInpatient ? "bg-blue-500" : "bg-emerald-500"
                        }`} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-neutral-900">{patient.full_name}</span>
                            {patient.full_name_ar && (
                              <span className="text-xs text-neutral-400" dir="rtl">{patient.full_name_ar}</span>
                            )}
                            {/* Type badge */}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isInpatient
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}>
                              {isInpatient ? "🏨 Inpatient" : "🏥 Outpatient"}
                            </span>
                            {/* Today's appointment */}
                            {appt && (
                              <span className="rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 text-[10px] font-bold">
                                📅 Today {appt.start_time?.slice(0,5)}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-400">
                            <span className="font-mono">{patient.phone}</span>
                            {isInpatient && ip.location && (
                              <span>📍 {ip.location}{hospName ? ` · ${hospName}` : ""}</span>
                            )}
                            {appt && !isInpatient && (
                              <span className="capitalize">{appt.visit_type?.replace(/_/g," ")}</span>
                            )}
                          </div>
                        </div>

                        <span className="text-xs text-neutral-400 flex-shrink-0">→</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
