"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { markWithDoctor, markDone } from "@/lib/actions/appointments";

interface DoctorQueueItem {
  id: string;
  start_time: string | null;
  status: string;
  visit_type: string;
  patientName: string;
  visitId?: string | null;
}

export function DoctorQueue({ items }: { items: DoctorQueueItem[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCallIn(id: string) {
    setLoadingId(id);
    setError(null);
    const result = await markWithDoctor(id);
    setLoadingId(null);
    if (!result.success) {
      setError(result.error ?? "Could not update.");
      return;
    }
    router.refresh();
  }

  async function handleDone(id: string) {
    setLoadingId(id);
    setError(null);
    const result = await markDone(id);
    setLoadingId(null);
    if (!result.success) {
      setError(result.error ?? "Could not update.");
      return;
    }
    router.refresh();
  }

  const arrived = items.filter((i) => i.status === "arrived");
  const withDoctor = items.filter((i) => i.status === "with_doctor");

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">No patients waiting or with you right now.</p>;
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {withDoctor.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-md border-l-4 border-l-indigo-400 bg-white px-4 py-3 shadow-sm"
        >
          <div>
            <p className="text-sm font-medium text-neutral-900">{item.patientName}</p>
            <p className="text-xs text-neutral-500">
              {item.start_time?.slice(0, 5)} · currently with you
            </p>
          </div>
          <div className="flex items-center gap-2">
            {item.visitId && (
              <Link href={`/doctor/visit/${item.visitId}`}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
                Open Note
              </Link>
            )}
            {!item.visitId && (
              <span className="text-xs text-neutral-400">Note loading...</span>
            )}
            <button
              disabled={loadingId === item.id}
              onClick={() => handleDone(item.id)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {loadingId === item.id ? "Saving..." : "Mark done"}
            </button>
          </div>
        </div>
      ))}

      {arrived.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-md border-l-4 border-l-emerald-400 bg-white px-4 py-3 shadow-sm"
        >
          <div>
            <p className="text-sm font-medium text-neutral-900">{item.patientName}</p>
            <p className="text-xs text-neutral-500">
              {item.start_time?.slice(0, 5)} · waiting
            </p>
          </div>
          <button
            disabled={loadingId === item.id}
            onClick={() => handleCallIn(item.id)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {loadingId === item.id ? "Saving..." : "Call in"}
          </button>
        </div>
      ))}
    </div>
  );
}
