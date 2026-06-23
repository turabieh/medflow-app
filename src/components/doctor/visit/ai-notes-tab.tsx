"use client";

export function AINotesTab({ visitId }: { visitId: string }) {
  return (
    <div className="p-6 space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-medium text-blue-900">AI Clinical Note Generation</p>
        <p className="mt-1 text-xs text-blue-700">
          Coming in the next update. AI will read all symptoms, vitals, labs, medications,
          and diagnosis to generate a full clinical note and patient-friendly summary in
          English and Arabic. You will be able to edit and approve before printing.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm space-y-3 opacity-50 pointer-events-none">
        <p className="text-sm font-medium text-neutral-900">Generate Clinical Note with AI</p>
        <button className="w-full rounded-md bg-red-500 py-2 text-sm font-medium text-white">
          Generate Note (Coming Soon)
        </button>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm space-y-3 opacity-50 pointer-events-none">
        <p className="text-sm font-medium text-neutral-900">Patient-Friendly Summary</p>
        <p className="text-xs text-neutral-500">Simple summary in English + Arabic the patient can understand.</p>
        <button className="w-full rounded-md bg-neutral-200 py-2 text-sm font-medium text-neutral-600">
          Generate Summary (Coming Soon)
        </button>
      </div>
    </div>
  );
}
