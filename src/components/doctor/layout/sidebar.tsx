"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/ui/logout-button";

interface Patient {
  appointmentId: string;
  visitId?: string | null;
  patientName: string;
  startTime: string | null;
  status: string;
  visitType: string;
}

const STATUS_DOT: Record<string, string> = {
  arrived:     "bg-emerald-400",
  with_doctor: "bg-indigo-400",
  done:        "bg-orange-300",
  finalized:   "bg-neutral-300",
};

const STATUS_LABEL: Record<string, string> = {
  arrived:     "Waiting",
  with_doctor: "With you",
  done:        "Done",
  finalized:   "Finalized",
};

export function DoctorSidebarNav({
  doctorId,
  doctorName,
  specialty,
  clinicName,
  logoUrl,
  patients = [],
}: {
  doctorId: string;
  doctorName: string;
  specialty?: string | null;
  clinicName: string;
  logoUrl?: string | null;
  patients?: Patient[];
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-neutral-200 bg-white">
      {/* Clinic header */}
      <div className="border-b border-neutral-100 px-4 py-4">
        {logoUrl && (
          <img src={logoUrl} alt="logo" className="mb-2 h-8 w-auto object-contain" />
        )}
        <p className="text-xs text-neutral-500">{clinicName}</p>
        <p className="text-sm font-medium text-neutral-900">{doctorName}</p>
        {specialty && <p className="text-xs text-neutral-400">{specialty}</p>}
      </div>

      {/* Today's queue */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            Today&apos;s Patients
          </p>
          {patients.length === 0 ? (
            <p className="text-xs text-neutral-400">No patients today.</p>
          ) : (
            <div className="space-y-1">
              {patients.map((p) => {
                const href = p.visitId
                  ? `/doctor/visit/${p.visitId}`
                  : `/doctor/dashboard`;
                const isActive = pathname === href;
                return (
                  <Link
                    key={p.appointmentId}
                    href={href}
                    className={`flex items-center gap-2 rounded-md px-2 py-2 transition-colors ${
                      isActive
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${STATUS_DOT[p.status] ?? "bg-neutral-300"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{p.patientName}</p>
                      <p className={`text-[10px] ${isActive ? "text-neutral-300" : "text-neutral-400"}`}>
                        {p.startTime?.slice(0, 5)} · {STATUS_LABEL[p.status] ?? p.status}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-100 px-4 py-3">
          <Link
            href="/doctor/dashboard"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
              pathname === "/doctor/dashboard"
                ? "bg-neutral-100 text-neutral-900 font-medium"
                : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
            }`}
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="border-t border-neutral-100 p-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
