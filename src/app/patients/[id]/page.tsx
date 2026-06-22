import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PatientDetailPage({
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

  if (error || !patient) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/patients" className="mb-4 inline-block text-sm text-neutral-500 hover:text-neutral-700">
          ← Back to patients
        </Link>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-medium text-neutral-900">{patient.full_name}</h1>
              {patient.full_name_ar && (
                <p className="text-sm text-neutral-500" dir="rtl">{patient.full_name_ar}</p>
              )}
            </div>
            {patient.is_blacklisted && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                Blacklisted
              </span>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-neutral-500">Phone</dt>
              <dd className="font-mono text-neutral-900">{patient.phone}</dd>
            </div>
            {patient.phone2 && (
              <div>
                <dt className="text-neutral-500">Second phone</dt>
                <dd className="font-mono text-neutral-900">
                  {patient.phone2}
                  {patient.phone2_relation && (
                    <span className="ml-1 text-neutral-500">({patient.phone2_relation})</span>
                  )}
                </dd>
              </div>
            )}
            {patient.dob && (
              <div>
                <dt className="text-neutral-500">Date of birth</dt>
                <dd className="text-neutral-900">{patient.dob}</dd>
              </div>
            )}
            {patient.gender && (
              <div>
                <dt className="text-neutral-500">Gender</dt>
                <dd className="capitalize text-neutral-900">{patient.gender}</dd>
              </div>
            )}
            {patient.address && (
              <div className="col-span-2">
                <dt className="text-neutral-500">Address</dt>
                <dd className="text-neutral-900">{patient.address}</dd>
              </div>
            )}
            {patient.email && (
              <div>
                <dt className="text-neutral-500">Email</dt>
                <dd className="text-neutral-900">{patient.email}</dd>
              </div>
            )}
            {patient.allergies && (
              <div className="col-span-2">
                <dt className="text-neutral-500">Allergies</dt>
                <dd className="text-neutral-900">{patient.allergies}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 border-t border-neutral-100 pt-4">
            <p className="text-sm text-neutral-500">
              Appointment history and booking will appear here once the appointment system is built.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
