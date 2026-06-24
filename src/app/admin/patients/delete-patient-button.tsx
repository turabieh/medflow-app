"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePatient } from "@/lib/actions/delete-patient";

export function DeletePatientButton({
  patientId,
  patientName,
  visitCount,
  apptCount,
  searchQuery,
}: {
  patientId: string;
  patientName: string;
  visitCount: number;
  apptCount: number;
  searchQuery: string;
}) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const result = await deletePatient(patientId);
    setDeleting(false);
    if (!result.success) {
      setError(result.error ?? "Delete failed.");
      return;
    }
    setShowConfirm(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-300"
      >
        Delete
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <h2 className="text-base font-semibold text-neutral-900">Delete patient permanently?</h2>
            </div>
            <p className="mb-4 text-sm text-neutral-600">
              You are about to permanently delete <strong>{patientName}</strong> and all their data from the clinic database.
            </p>

            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 space-y-1">
              <p className="font-medium">The following will be deleted forever:</p>
              <ul className="mt-1 space-y-0.5 list-disc list-inside text-xs">
                <li>Patient profile and personal information</li>
                <li>{apptCount} appointment{apptCount !== 1 ? "s" : ""}</li>
                <li>{visitCount} visit{visitCount !== 1 ? "s" : ""} (including notes, diagnoses, prescriptions, labs)</li>
                <li>All billing and payment records</li>
              </ul>
              <p className="mt-2 font-medium">This cannot be undone.</p>
            </div>

            {error && (
              <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setError(null); }}
                disabled={deleting}
                className="flex-1 rounded-md border border-neutral-300 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
