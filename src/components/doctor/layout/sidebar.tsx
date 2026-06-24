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
  doctorId,
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
  patients?: Patient[];
  inpatients?: Patient[];
}) {
  const pathname = usePathname();

  function PatientLink({ p }: { p: Patient }) {
    const href = p.visitId ? `/doctor/visit/${p.visitId}` : `/doctor/dashboard`;
    const isActive = pathname === href;
    return (
      <Link key={p.appointmentId} href={href}
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

  return (
    <aside className="flex w-56 flex-col border-r border-neutral-200 bg-white" style={{height:"100vh"}}>
      {/* Clinic header */}
      <div className="flex-shrink-0 border-b border-neutral-100 px-4 py-3">
        {logoUrl && <img src={logoUrl} alt="logo" className="mb-1.5 h-8 w-auto object-contain" />}
        <p className="text-[11px] text-neutral-400">{clinicName}</p>
        <p className="text-sm font-medium text-neutral-900">{doctorName}</p>
        {specialty && <p className="text-[11px] text-neutral-400">{specialty}</p>}
      </div>

      {/* Scrollable patient list - max height so nav always visible */}
      <div className="flex-1 overflow-y-auto px-3 py-2" style={{minHeight:0}}>
        {/* Today's patients */}
        <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
          Today ({patients.length})
        </p>
        {patients.length === 0 ? (
          <p className="px-2 text-[11px] text-neutral-400">No patients yet.</p>
        ) : (
          <div className="space-y-0.5 mb-3">
            {patients.map((p) => <PatientLink key={p.appointmentId} p={p} />)}
          </div>
        )}

        {/* Inpatients */}
        {inpatients.length > 0 && (
          <>
            <p className="mb-1 mt-3 px-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
              Inpatients ({inpatients.length})
            </p>
            <div className="space-y-0.5">
              {inpatients.map((p) => <PatientLink key={p.appointmentId} p={p} />)}
            </div>
          </>
        )}
      </div>

      {/* Fixed bottom nav — always visible */}
      <div className="flex-shrink-0 border-t border-neutral-100">
        <div className="px-3 py-2 space-y-0.5">
          <Link href="/doctor/inpatients"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
              pathname.startsWith("/doctor/inpatients") ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-700"
            }`}>
            🏨 Inpatients
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
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700">
            Secretary Mode
          </Link>
          <Link href="/doctor/settings"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
              pathname.startsWith("/doctor/settings") ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"
            }`}>
            My Schedule
          </Link>
        </div>
        <div className="border-t border-neutral-100 px-4 py-3">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
