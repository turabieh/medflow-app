"use client";
import { JordanDateInput } from "@/components/ui/jordan-date-input";
import { to12h, todayJordan } from "@/lib/client-timezone";

import { useRouter } from "next/navigation";
import Link from "next/link";

interface AppointmentItem {
  id: string;
  start_time: string | null;
  status: string;
  visit_type: string;
  is_overbooked: boolean;
  patientName: string;
  phone: string;
  doctorName: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-amber-100 text-amber-800",
  booked:      "bg-purple-100 text-purple-800",
  confirmed:   "bg-blue-100 text-blue-800",
  arrived:     "bg-emerald-100 text-emerald-800",
  with_doctor: "bg-indigo-100 text-indigo-800",
  done:        "bg-orange-100 text-orange-800",
  finalized:   "bg-neutral-100 text-neutral-600",
  no_show:     "bg-red-100 text-red-700",
  cancelled:   "bg-neutral-100 text-neutral-500",
};

const STATUS_BORDER: Record<string, string> = {
  pending:     "border-l-amber-400",
  booked:      "border-l-purple-400",
  confirmed:   "border-l-blue-400",
  arrived:     "border-l-emerald-400",
  with_doctor: "border-l-indigo-400",
  done:        "border-l-orange-400",
  finalized:   "border-l-neutral-200",
  no_show:     "border-l-red-300",
  cancelled:   "border-l-neutral-200",
};

export function AppointmentsView({
  items,
  currentDate,
}: {
  items: AppointmentItem[];
  currentDate: string;
}) {
  const router = useRouter();

  function goToDate(dateStr: string) {
    router.push(`/secretary/appointments?date=${dateStr}`);
  }

  function prevDay() {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() - 1);
    goToDate(d.toLocaleDateString("en-CA", { timeZone: "Asia/Amman" }));
  }

  function nextDay() {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    goToDate(d.toLocaleDateString("en-CA", { timeZone: "Asia/Amman" }));
  }

  const displayDate = new Date(currentDate + "T00:00:00").toLocaleDateString("en", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div>
      {/* Date navigation */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={prevDay}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          ← Prev
        </button>
        <JordanDateInput
          value={currentDate}
          onChange={goToDate}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          onClick={nextDay}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          Next →
        </button>
        <button
          onClick={() => goToDate(todayJordan())}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          Today
        </button>
      </div>

      <p className="mb-3 text-sm text-neutral-500">
        {displayDate} &middot; {items.length} appointment{items.length !== 1 ? "s" : ""}
      </p>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center">
          <p className="text-sm text-neutral-500">No appointments on this date.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((appt) => (
            <div
              key={appt.id}
              className={`flex items-center justify-between rounded-md border-l-4 bg-white px-4 py-3 shadow-sm ${STATUS_BORDER[appt.status] ?? "border-l-neutral-200"}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-12 font-mono text-xs text-neutral-500">
                  {to12h(appt.start_time) || "—"}
                </span>
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {appt.patientName}
                    {appt.is_overbooked && (
                      <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                        Overbooked
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {appt.visit_type} &middot; {appt.doctorName}
                    {appt.phone && <span className="ml-2 font-mono">{appt.phone}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[appt.status] ?? ""}`}
                >
                  {appt.status.replace(/_/g, " ")}
                </span>
                <Link
                  href={`/secretary/appointments/${appt.id}`}
                  className="text-xs text-neutral-400 hover:text-neutral-700"
                >
                  Edit →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
