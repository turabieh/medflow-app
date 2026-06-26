import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DoctorPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { q: rawQ, filter = "all" } = await searchParams;
  const q = rawQ?.trim() ?? "";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("id, clinic_id").eq("id", user!.id).single();
  const clinicId = profile?.clinic_id ?? "";
  const doctorId = profile?.id ?? "";
  const today = new Date().toISOString().split("T")[0];

  let patients: {
    id: string; full_name: string; full_name_ar: string | null;
    phone: string; dob: string | null; gender: string | null; blood_type: string | null;
  }[] = [];

  if (q.length >= 2) {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, full_name_ar, phone, dob, gender, blood_type")
      .eq("clinic_id", clinicId)
      .or(`full_name.ilike.%${q}%,full_name_ar.ilike.%${q}%,phone.ilike.%${q}%`)
      .order("full_name")
      .limit(50);
    patients = data ?? [];
  }

  const patientIds = patients.map(p => p.id);

  // Active inpatients for this doctor
  const [inpatientRes, apptRes, lastVisitRes] = patientIds.length > 0
    ? await Promise.all([
        supabase.from("inpatients")
          .select("patient_id, status, location, hospital_patient_id, admission_date, hospitals(name)")
          .eq("clinic_id", clinicId)
          .eq("doctor_id", doctorId)
          .eq("status", "active")
          .in("patient_id", patientIds),
        supabase.from("appointments")
          .select("patient_id, status, start_time, visit_type")
          .eq("clinic_id", clinicId)
          .eq("doctor_id", doctorId)
          .eq("appt_date", today)
          .not("status", "in", '("cancelled","no_show")')
          .in("patient_id", patientIds),
        supabase.from("visits")
          .select("patient_id, visit_date, visit_type, assessment")
          .eq("clinic_id", clinicId)
          .eq("doctor_id", doctorId)
          .in("patient_id", patientIds)
          .order("visit_date", { ascending: false })
          .limit(patientIds.length * 3),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  type IpRow   = { patient_id: string; location: string | null; hospital_patient_id: string | null; admission_date: string | null; hospitals: {name:string}|{name:string}[]|null };
  type ApptRow = { patient_id: string; status: string; start_time: string; visit_type: string };
  type VisitRow= { patient_id: string; visit_date: string; visit_type: string; assessment: string | null };

  const inpatientMap = new Map<string, IpRow>();
  for (const ip of (inpatientRes.data ?? []) as IpRow[])
    inpatientMap.set(ip.patient_id, ip);

  const apptMap = new Map<string, ApptRow>();
  for (const a of (apptRes.data ?? []) as ApptRow[])
    apptMap.set(a.patient_id, a);

  // Last visit per patient
  const lastVisitMap = new Map<string, VisitRow>();
  for (const v of (lastVisitRes.data ?? []) as VisitRow[])
    if (!lastVisitMap.has(v.patient_id)) lastVisitMap.set(v.patient_id, v);

  const filtered = patients.filter(p => {
    if (filter === "inpatient")  return inpatientMap.has(p.id);
    if (filter === "outpatient") return !inpatientMap.has(p.id);
    return true;
  });

  const inpatientCount  = patients.filter(p =>  inpatientMap.has(p.id)).length;
  const outpatientCount = patients.filter(p => !inpatientMap.has(p.id)).length;

  return (
    <div className="p-6">
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Patient Search</h1>
      <p className="mb-5 text-sm text-neutral-500">Search by name or phone number.</p>

      <form method="GET" className="mb-4 flex gap-2">
        <input type="hidden" name="filter" value={filter} />
        <input type="text" name="q" defaultValue={q} autoFocus
          placeholder="Search by name or phone..."
          className="flex-1 max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500" />
        <button type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Search
        </button>
      </form>

      {q.length > 0 && q.length < 2 && (
        <p className="text-sm text-neutral-500">Type at least 2 characters.</p>
      )}

      {!q && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center">
          <p className="text-sm text-neutral-500">Search by patient name or phone number.</p>
        </div>
      )}

      {q.length >= 2 && (
        <>
          {/* Filter tabs */}
          {patients.length > 0 && (
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              {[
                { key:"all",        label:"All",        count: patients.length },
                { key:"outpatient", label:"Outpatient", count: outpatientCount },
                { key:"inpatient",  label:"Inpatient",  count: inpatientCount  },
              ].map(tab => (
                <Link key={tab.key}
                  href={`/doctor/patients?q=${encodeURIComponent(q)}&filter=${tab.key}`}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filter === tab.key
                      ? tab.key === "inpatient"  ? "bg-blue-600 text-white"
                      : tab.key === "outpatient" ? "bg-emerald-600 text-white"
                      :                            "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}>
                  {tab.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    filter === tab.key ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-500"
                  }`}>{tab.count}</span>
                </Link>
              ))}
              <span className="text-xs text-neutral-400 ml-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />Outpatient
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mx-1 ml-3" />Inpatient
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mx-1 ml-3" />Today
              </span>
            </div>
          )}

          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-neutral-500">
                No {filter !== "all" ? filter : ""} patients found for &quot;{q}&quot;.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {filtered.map(patient => {
                  const ip        = inpatientMap.get(patient.id);
                  const appt      = apptMap.get(patient.id);
                  const lastVisit = lastVisitMap.get(patient.id);
                  const isInpatient = !!ip;
                  const age = patient.dob
                    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 86400000))
                    : null;
                  const hospName = ip?.hospitals
                    ? (Array.isArray(ip.hospitals) ? ip.hospitals[0]?.name : (ip.hospitals as {name:string}).name)
                    : null;

                  return (
                    <li key={patient.id}>
                      <Link href={`/doctor/patients/${patient.id}`}
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 transition-colors">

                        {/* Left color strip */}
                        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                          isInpatient ? "bg-blue-500" : "bg-emerald-500"
                        }`} />

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-neutral-900">{patient.full_name}</span>
                            {patient.full_name_ar && (
                              <span className="text-xs text-neutral-400" dir="rtl">{patient.full_name_ar}</span>
                            )}
                            {/* Type badge */}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              isInpatient
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                              {isInpatient ? "🏨 Inpatient" : "🏥 Outpatient"}
                            </span>
                            {/* Today badge */}
                            {appt && (
                              <span className="rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 text-[10px] font-bold">
                                📅 Today {appt.start_time?.slice(0,5)}
                              </span>
                            )}
                            {/* Blood type */}
                            {patient.blood_type && (
                              <span className="rounded-full bg-red-50 border border-red-200 text-red-600 px-2 py-0.5 text-[10px] font-bold">
                                {patient.blood_type}
                              </span>
                            )}
                          </div>

                          {/* Secondary info */}
                          <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-400 flex-wrap">
                            <span className="font-mono">{patient.phone}</span>
                            {age !== null && <span>{age}y</span>}
                            {patient.gender && <span className="capitalize">{patient.gender}</span>}
                            {isInpatient && (
                              <span className="text-blue-500">
                                {ip.hospital_patient_id && <span className="font-mono mr-1">{ip.hospital_patient_id}</span>}
                                {ip.location && <span>· {ip.location}</span>}
                                {hospName && <span> · {hospName}</span>}
                              </span>
                            )}
                            {lastVisit && (
                              <span className="text-neutral-300">
                                Last: {lastVisit.visit_date}
                                {lastVisit.assessment && ` — ${lastVisit.assessment.slice(0,40)}${lastVisit.assessment.length > 40 ? "…" : ""}`}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-xs text-neutral-400 flex-shrink-0">View file →</span>
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
