"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  markArrived,
  markWithDoctor,
  markFinalized,
  markNoShow,
  cancelAppointment,
} from "@/lib/actions/appointments";

interface QueueItem {
  id: string;
  start_time: string | null;
  status: string;
  is_overbooked: boolean;
  patientName: string;
}

const STATUS_STYLES: Record<string, { border: string; badge: string; label: string }> = {
  booked: { border: "border-l-purple-400", badge: "bg-purple-100 text-purple-800", label: "Booked" },
  confirmed: { border: "border-l-blue-400", badge: "bg-blue-100 text-blue-800", label: "Confirmed" },
  arrived: { border: "border-l-emerald-400", badge: "bg-emerald-100 text-emerald-800", label: "Arrived" },
  with_doctor: { border: "border-l-indigo-400", badge: "bg-indigo-100 text-indigo-800", label: "With doctor" },
  done: { border: "border-l-orange-400", badge: "bg-orange-100 text-orange-800", label: "Needs finalizing" },
  finalized: { border: "border-l-neutral-300", badge: "bg-neutral-100 text-neutral-600", label: "Finalized" },
  no_show: { border: "border-l-red-400", badge: "bg-red-100 text-red-800", label: "No-show" },
  cancelled: { border: "border-l-neutral-300", badge: "bg-neutral-100 text-neutral-500", label: "Cancelled" },
};

export function TodayQueue({ items }: { items: QueueItem[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(
    id: string,
    action: (id: string) => Promise<{ success: boolean; error?: string }>
  ) {
    setLoadingId(id);
    setError(null);
    const result = await action(id);
    setLoadingId(null);
    if (!result.success) {
      setError(result.error ?? "Action failed.");
      return;
    }
    router.refresh();
  }

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">No appointments scheduled for today.</p>;
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {items.map((item) => {
        const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.booked;
        const isLoading = loadingId === item.id;

        return (
          <div
            key={item.id}
            className={`flex items-center justify-between rounded-md border-l-4 bg-white px-4 py-2.5 shadow-sm ${style.border}`}
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-neutral-500">
                {item.start_time?.slice(0, 5) ?? "—"}
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {item.patientName}
                  {item.is_overbooked && (
                    <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      Overbooked
                    </span>
                  )}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>
                {style.label}
              </span>
            </div>

            <div className="flex gap-1.5">
              {(item.status === "booked" || item.status === "confirmed") && (
                <>
                  <button
                    disabled={isLoading}
                    onClick={() => runAction(item.id, markArrived)}
                    className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Mark arrived
                  </button>
                  <button
                    disabled={isLoading}
                    onClick={() => {
                      if (confirm("Cancel this appointment?")) {
                        runAction(item.id, (id) => cancelAppointment(id));
                      }
                    }}
                    className="rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}

              {item.status === "arrived" && (
                <>
                  <button
                    disabled={isLoading}
                    onClick={() => runAction(item.id, markWithDoctor)}
                    className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Send to doctor
                  </button>
                  <button
                    disabled={isLoading}
                    onClick={() => {
                      if (confirm("Patient arrived but cannot wait — mark as no-show?")) {
                        runAction(item.id, markNoShow);
                      }
                    }}
                    className="rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Can&apos;t wait
                  </button>
                </>
              )}

              {item.status === "with_doctor" && (
                <span className="text-xs italic text-neutral-400">
                  With doctor — no actions available
                </span>
              )}

              {item.status === "done" && (
                <button
                  disabled={isLoading}
                  onClick={() => runAction(item.id, markFinalized)}
                  className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  Finalize (payment, print, book next)
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
