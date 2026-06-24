import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DoctorInpatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "active" } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("id, clinic_id").eq("id", user?.id ?? "").single();

  const { data: inpatients } = await supabase
    .from("inpatients")
    .select(`
      id, admission_date, location, status, discharge_date,
      hospital_patient_id, diagnosis_summary, fee_per_visit,
      patients(id, full_name, full_name_ar, dob, blood_type),
      hospitals(id, name)
    `)
    .eq("clinic_id", profile?.clinic_id ?? "")
    .eq("doctor_id", profile?.id ?? "")
    .eq("status", status)
    .order("admission_date", { ascending: false });

  // Count visits per admission
  const ids = (inpatients ?? []).map(i => i.id);
  const { data: visitCounts } = ids.length
    ? await supabase.from("visits").select("inpatient_id").in("inpatient_id", ids)
    : { data: [] };
  const countMap = new Map<string, number>();
  for (const v of visitCounts ?? []) countMap.set(v.inpatient_id, (countMap.get(v.inpatient_id) ?? 0) + 1);

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">Inpatients</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Hospital patients under your care</p>
        </div>
        <Link href="/doctor/inpatients/new"
          className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">
          + Admit Patient
        </Link>
      </div>

      {/* Status tabs */}
      <div className="mb-5 flex gap-2">
        {["active", "discharged"].map(s => (
          <Link key={s} href={`/doctor/inpatients?status=${s}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
              status === s
                ? "bg-neutral-900 text-white"
                : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            }`}>
            {s === "active" ? "Active Admissions" : "Discharged"}
          </Link>
        ))}
      </div>

      {(!inpatients || inpatients.length === 0) ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-400">
          {status === "active" ? "No active inpatients." : "No discharged patients."}
        </div>
      ) : (
        <div className="space-y-2">
          {inpatients.map(ip => {
            const patient = Array.isArray(ip.patients) ? ip.patients[0] : ip.patients as { id: string; full_name: string; full_name_ar: string | null; dob: string | null; blood_type: string | null } | null;
            const hospital = Array.isArray(ip.hospitals) ? ip.hospitals[0] : ip.hospitals as { id: string; name: string } | null;
            const age = patient?.dob
              ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
              : null;
            const visits = countMap.get(ip.id) ?? 0;

            return (
              <Link key={ip.id} href={`/doctor/inpatients/${ip.id}`}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm hover:bg-neutral-50 hover:border-neutral-300 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${ip.status === "active" ? "bg-green-500" : "bg-neutral-300"}`} />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {patient?.full_name}
                      {patient?.blood_type && <span className="ml-2 text-xs text-red-500">{patient.blood_type}</span>}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {hospital?.name && <span className="font-medium">{hospital.name}</span>}
                      {ip.location && <span className="ml-2 text-neutral-400">· {ip.location}</span>}
                      {ip.hospital_patient_id && <span className="ml-2 font-mono text-neutral-400">MRN: {ip.hospital_patient_id}</span>}
                    </p>
                    {ip.diagnosis_summary && (
                      <p className="text-xs text-neutral-400 mt-0.5 italic">{ip.diagnosis_summary}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-xs text-neutral-500">
                    Admitted: <span className="font-medium text-neutral-700">{ip.admission_date}</span>
                  </p>
                  {age !== null && <p className="text-xs text-neutral-400">{age} yrs</p>}
                  <p className="text-xs text-neutral-400 mt-0.5">{visits} visit{visits !== 1 ? "s" : ""}</p>
                  {ip.status === "discharged" && ip.discharge_date && (
                    <p className="text-xs text-neutral-400">Discharged: {ip.discharge_date}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
