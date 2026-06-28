"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { markTechArrived, markTechDone, markTechNoShow, cancelTechAppointment } from "@/lib/actions/technician-appointments";

type R = Record<string, unknown>;

const STATUS: Record<string, { bg: string; text: string; label: string }> = {
  scheduled:   { bg:"bg-blue-50",    text:"text-blue-700",   label:"Scheduled"    },
  in_progress: { bg:"bg-amber-50",   text:"text-amber-700",  label:"In Progress"  },
  done:        { bg:"bg-green-50",   text:"text-green-700",  label:"Done"         },
  cancelled:   { bg:"bg-neutral-100",text:"text-neutral-500",label:"Cancelled"    },
  no_show:     { bg:"bg-red-50",     text:"text-red-500",    label:"No Show"      },
};

export function TechQueue({ appointments, clinicId }: { appointments: R[]; clinicId: string }) {
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function run(id: string, action: (id: string) => Promise<void>) {
    setLoadingId(id);
    startTransition(async () => { await action(id); setLoadingId(null); });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">
          🔬 Technician Queue <span className="ml-1 text-xs font-normal text-neutral-400">({appointments.length})</span>
        </h2>
        <Link href="/secretary/technician-schedule"
          className="text-xs text-blue-600 hover:underline">View full schedule →</Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {appointments.map((a, i) => {
          const p     = (Array.isArray(a.patients)   ? a.patients[0]   : a.patients)   as {full_name:string;phone:string}|null;
          const proc  = (Array.isArray(a.technician_procedures) ? a.technician_procedures[0] : a.technician_procedures) as {name:string;price:number|null}|null;
          const tech  = (Array.isArray(a.users) ? a.users[0] : a.users) as {full_name:string}|null;
          const rep   = (Array.isArray(a.technician_reports) ? a.technician_reports[0] : a.technician_reports) as {id:string;status:string}|null;
          const st    = STATUS[a.status as string] ?? STATUS.scheduled;
          const loading = loadingId === a.id;

          return (
            <div key={a.id as string}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-neutral-100" : ""}`}>
              {/* Time */}
              <div className="w-12 flex-shrink-0 text-center">
                <p className="font-mono text-sm font-bold text-neutral-800">{(a.start_time as string)?.slice(0,5)}</p>
              </div>

              {/* Patient + Procedure */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900">{p?.full_name}</p>
                <p className="text-xs text-neutral-400">
                  {proc?.name}{proc?.price ? ` · ${proc.price} JOD` : ""} · {tech?.full_name}
                </p>
              </div>

              {/* Status badge */}
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.bg} ${st.text}`}>
                {st.label}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {a.status === "scheduled" && (
                  <>
                    <button disabled={loading} onClick={() => run(a.id as string, markTechArrived)}
                      className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                      ✓ Arrived
                    </button>
                    <button disabled={loading} onClick={() => { if (confirm("Mark as no-show?")) run(a.id as string, markTechNoShow); }}
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50">
                      No-show
                    </button>
                  </>
                )}
                {a.status === "in_progress" && (
                  <>
                    {rep?.status === "finalized" ? (
                      <button disabled={loading} onClick={() => run(a.id as string, markTechDone)}
                        className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
                        ✓ Mark Done
                      </button>
                    ) : (
                      <span className="text-xs italic text-neutral-400">Awaiting report...</span>
                    )}
                  </>
                )}
                {a.status === "done" && (
                  <span className="text-xs text-neutral-400 italic">Completed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
