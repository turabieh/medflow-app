"use client";

import { useState } from "react";

const CAT_COLORS: Record<string, string> = {
  general:    "bg-neutral-100 text-neutral-600",
  monitoring: "bg-blue-100 text-blue-700",
  lab:        "bg-purple-100 text-purple-700",
  setup:      "bg-amber-100 text-amber-700",
  medication: "bg-red-100 text-red-700",
  other:      "bg-neutral-100 text-neutral-500",
};

interface NurseRecord {
  id: string;
  procedure_name: string;
  category: string;
  started_at: string;
  notes: string | null;
  recorded_by_name: string | null;
}

export function NurseProceduresSection({ records }: { records: NurseRecord[] }) {
  const [open, setOpen] = useState(false);

  // Sort newest first
  const sorted = [...records].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  return (
    <div className="mt-5 rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
      {/* Clickable header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900">🩺 Nurse Procedures</span>
          {records.length > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              {records.length}
            </span>
          )}
        </div>
        <span className="text-neutral-400 text-sm select-none">{open ? "▲" : "▼"}</span>
      </button>

      {/* Collapsible body */}
      {open && (
        records.length === 0 ? (
          <div className="border-t border-neutral-100 px-4 py-6 text-center text-sm text-neutral-400">
            No nurse procedures recorded yet.
          </div>
        ) : (
          <div className="border-t border-neutral-100 divide-y divide-neutral-50">
            {sorted.map((r, idx) => (
              <div key={r.id} className={`flex items-start justify-between px-4 py-3 ${idx === 0 ? "bg-blue-50/40" : ""}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-neutral-900">{r.procedure_name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CAT_COLORS[r.category] ?? "bg-neutral-100 text-neutral-600"}`}>
                      {r.category}
                    </span>
                    {idx === 0 && (
                      <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white">Latest</span>
                    )}
                  </div>
                  {r.recorded_by_name && (
                    <p className="text-xs text-neutral-400 mt-0.5">By: {r.recorded_by_name}</p>
                  )}
                  {r.notes && (
                    <p className="text-xs text-neutral-400 mt-0.5 truncate max-w-xs">{r.notes}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-xs font-semibold text-neutral-700">
                    {new Date(r.started_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short" })}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {new Date(r.started_at).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
