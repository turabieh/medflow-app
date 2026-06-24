"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/ui/logout-button";

interface OutpatientEntry {
  appointmentId: string;
  visitId?: string | null;
  patientName: string;
  startTime: string | null;
  status: string;
  visitType: string;
}

interface InpatientEntry {
  inpatientId: string;
  patientName: string;
  location: string;
  hospitalName: string;
}

const STATUS_DOT: Record<string, string> = {
  arrived:     "bg-emerald-400",
  with_doctor: "bg-indigo-400",
  done:        "bg-orange-300",
  finalized:   "bg-neutral-300",
  booked:      "bg-purple-300",
  confirmed:   "bg-blue-300",
};

const STATUS_LABEL: Record<string, string> = {
  arrived:     "Waiting",
  with_doctor: "With you",
  done:        "Done",
  finalized:   "Finalized",
  booked:      "Booked",
  confirmed:   "Confirmed",
};

export function DoctorSidebarNav({
  doctorName,
  specialty,
  clinicName,
  logoUrl,
  patients = [],
  inpatients = [],
}: {
  doctorId: string;
  doctorName: string;
  specialty?: string | null;
  clinicName: string;
  logoUrl?: string | null;
  patients?: OutpatientEntry[];
  inpatients?: InpatientEntry[];
}) {
  const pathname = usePathname();

  function OutpatientLink({ p }: { p: OutpatientEntry }) {
    const href = p.visitId ? `/doctor/visit/${p.visitId}` : `/doctor/dashboard`;
    const isActive = pathname === href;
    return (
      <Link href={href}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
          isActive ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
        }`}>
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${STATUS_DOT[p.status] ?? "bg-neutral-300"}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{p.patientName}</p>
          <p className={`text-[10px] ${isActive ? "text-neutral-300" : "text-neutral-400"}`}>
            {p.startTime?.slice(0, 5)} · {STATUS_LABEL[p.status] ?? p.status}
          </p>
        </div>
      </Link>
    );
  }

  function InpatientLink({ ip }: { ip: InpatientEntry }) {
    const href = `/doctor/inpatients/${ip.inpatientId}`;
    const isActive = pathname.startsWith(href);
    return (
      <Link href={href}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
          isActive ? "bg-blue-700 text-white" : "text-neutral-700 hover:bg-blue-50"
        }`}>
        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{ip.patientName}</p>
          <p className={`text-[10px] truncate ${isActive ? "text-blue-200" : "text-neutral-400"}`}>
            {ip.location}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <aside className="flex w-56 flex-col border-r border-neutral-200 bg-white" style={{ height: "100vh" }}>
      {/* Clinic header */}
      <div className="flex-shrink-0 border-b border-neutral-100 px-4 py-3">
        {logoUrl && <img src={logoUrl} alt="logo" className="mb-1.5 h-8 w-auto object-contain" />}
        <p className="text-[11px] text-neutral-400">{clinicName}</p>
        <p className="text-sm font-medium text-neutral-900">{doctorName}</p>
        {specialty && <p className="text-[11px] text-neutral-400">{specialty}</p>}
      </div>

      {/* Scrollable patient lists */}
      <div className="flex-1 overflow-y-auto px-3 py-2" style={{ minHeight: 0 }}>

        {/* Today's outpatients */}
        <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
          Today&apos;s Patients ({patients.length})
        </p>
        {patients.length === 0 ? (
          <p className="px-2 text-[11px] text-neutral-400">No outpatients today.</p>
        ) : (
          <div className="space-y-0.5 mb-3">
            {patients.map((p) => <OutpatientLink key={p.appointmentId} p={p} />)}
          </div>
        )}

        {/* Active inpatients — separate section */}
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-blue-500">
            Inpatients ({inpatients.length})
          </p>
          {inpatients.length === 0 ? (
            <p className="px-2 text-[11px] text-neutral-400">No active inpatients.</p>
          ) : (
            <div className="space-y-0.5">
              {inpatients.map((ip) => <InpatientLink key={ip.inpatientId} ip={ip} />)}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom nav */}
      <div className="flex-shrink-0 border-t border-neutral-100">
        <div className="px-3 py-2 space-y-0.5">
          <Link href="/doctor/inpatients"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
              pathname === "/doctor/inpatients" || pathname === "/doctor/inpatients/"
                ? "bg-neutral-100 font-medium text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-700"
            }`}>
            🏨 All Inpatients
          </Link>
          <Link href="/doctor/patients"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
              pathname.startsWith("/doctor/patients") ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-700"
            }`}>
            Patient Search
          </Link>
          <Link href="/doctor/dashboard"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
              pathname === "/doctor/dashboard" ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"
            }`}>
            Dashboard
          </Link>
          <Link href="/secretary/dashboard"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700">
            Secretary Mode
          </Link>
          <Link href="/doctor/settings"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
              pathname === "/doctor/settings" ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"
            }`}>
            Settings
          </Link>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
