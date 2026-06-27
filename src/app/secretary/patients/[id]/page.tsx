import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PatientEditForm } from "@/components/secretary/patient-edit-form";

export default async function SecretaryPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !patient) notFound();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, appt_date, start_time, status, visit_type, doctor_id, users(full_name)")
    .eq("patient_id", id)
    .order("appt_date", { ascending: false })
    .limit(20);

  const { data: doctors } = await supabase
    .from("users")
    .select("id, full_name, specialty")
    .eq("role", "doctor").eq("is_active", true).order("full_name");

  const { data: insuranceCompanies } = await supabase
    .from("insurance_companies")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  const STATUS_LABELS: Record<string, string> = {
    pending: "Pending", booked: "Booked", confirmed: "Confirmed",
    arrived: "Arrived", with_doctor: "With doctor", done: "Done",
    finalized: "Finalized", no_show: "No-show", cancelled: "Cancelled",
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Link href="/secretary/patients" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← Patients
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium text-neutral-900">{patient.full_name}</h1>
        <Link
          href={`/secretary/appointments/new?patientId=${id}`}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Book appointment
        </Link>
      </div>

      <PatientEditForm patient={patient} insuranceCompanies={insuranceCompanies ?? []} />

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Appointment history
        </h2>
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          {!appointments || appointments.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">No appointments yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {appointments.map((appt) => {
                const doctor = Array.isArray(appt.users) ? appt.users[0] : appt.users;
                return (
                  <li key={appt.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm text-neutral-900">
                        {appt.appt_date}
                        {appt.start_time && (
                          <span className="ml-2 font-mono text-xs text-neutral-500">
                            {appt.start_time.slice(0, 5)}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {appt.visit_type} · {doctor?.full_name ?? "—"}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      appt.status === "finalized" ? "bg-neutral-100 text-neutral-600" :
                      appt.status === "cancelled" || appt.status === "no_show" ? "bg-red-50 text-red-700" :
                      "bg-blue-50 text-blue-700"
                    }`}>
                      {STATUS_LABELS[appt.status] ?? appt.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
