"use client";

import { useState } from "react";

interface PastVisit {
  id: string;
  visit_date: string | null;
  visit_type: string | null;
  status: string | null;
  clinical_note: string | null;
  voice_notes: string | null;
  key_clinical_points: string | null;
  prescriptions: { medication_name: string; dose: string | null; unit: string | null; instructions: string | null; duration: string | null }[];
  diagnoses: { icd_code: string | null; description: string; is_primary: boolean }[];
}

const PAGE_SIZE = 5;

export function HistoryTab({
  pastVisits,
  patientName,
}: {
  pastVisits: PastVisit[];
  patientName: string;
}) {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalPages = Math.ceil(pastVisits.length / PAGE_SIZE);
  const pageVisits = pastVisits.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (pastVisits.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-neutral-500">
        No previous visits on record for {patientName}.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-neutral-900">
          Patient History — {pastVisits.length} visit{pastVisits.length !== 1 ? "s" : ""}
        </h2>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50 disabled:opacity-40">←</button>
            <span>Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
              className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50 disabled:opacity-40">→</button>
          </div>
        )}
      </div>

      {pageVisits.map((visit) => {
        const isOpen = expanded === visit.id;
        return (
          <div key={visit.id} className="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : visit.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 text-left"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                  visit.status === "finalized" ? "bg-neutral-300" :
                  visit.status === "done" ? "bg-orange-400" : "bg-blue-400"
                }`} />
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {visit.visit_date ?? "—"}
                    <span className="ml-2 text-xs font-normal text-neutral-400 capitalize">{visit.visit_type}</span>
                  </p>
                  {visit.diagnoses.length > 0 && (
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {visit.diagnoses.filter(d => d.is_primary).map(d =>
                        d.icd_code ? `${d.icd_code} — ${d.description}` : d.description
                      ).join(", ") || visit.diagnoses[0]?.description}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-neutral-400 text-sm ml-4">{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
              <div className="border-t border-neutral-100 px-4 py-4 space-y-4 bg-neutral-50">
                {/* Diagnoses */}
                {visit.diagnoses.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-400 mb-2">Diagnoses</p>
                    {visit.diagnoses.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm py-1">
                        {d.icd_code && <span className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600">{d.icd_code}</span>}
                        <span>{d.description}</span>
                        {d.is_primary && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Primary</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Clinical note */}
                {(visit.clinical_note || visit.voice_notes || visit.key_clinical_points) && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-400 mb-2">Clinical Note</p>
                    <div className="rounded-md bg-white border border-neutral-200 px-3 py-2 text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {visit.clinical_note || visit.voice_notes || visit.key_clinical_points}
                    </div>
                  </div>
                )}

                {/* Medications */}
                {visit.prescriptions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-400 mb-2">
                      Medications ({visit.prescriptions.length})
                    </p>
                    <div className="space-y-1">
                      {visit.prescriptions.map((rx, i) => (
                        <div key={i} className="text-sm flex items-baseline gap-2">
                          <span className="font-medium">{rx.medication_name}</span>
                          <span className="text-neutral-500 text-xs">
                            {[rx.dose, rx.unit].filter(Boolean).join(" ")}
                            {rx.instructions && ` · ${rx.instructions}`}
                            {rx.duration && ` · ${rx.duration}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
