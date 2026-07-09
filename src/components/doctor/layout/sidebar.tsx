"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { LogoutButton } from "@/components/ui/logout-button";
import { createClient } from "@/lib/supabase/client";

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
  doctorId,
  doctorName,
  specialty,
  clinicName,
  logoUrl,
  patients: initialPatients = [],
  inpatients = [],
  isClinicHead = false,
}: {
  doctorId: string;
  doctorName: string;
  specialty?: string | null;
  clinicName: string;
  logoUrl?: string | null;
  patients?: OutpatientEntry[];
  inpatients?: InpatientEntry[];
  isClinicHead?: boolean;
}) {
  const pathname = usePathname();
  const [patients, setPatients] = useState<OutpatientEntry[]>(initialPatients);
  const [notification, setNotification] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sync when server re-renders with new props
  useEffect(() => { setPatients(initialPatients); }, [initialPatients]);

  // Pre-warm AudioContext on first user interaction
  useEffect(() => {
    function warmAudio() {
      if (!audioCtxRef.current) {
        try {
          audioCtxRef.current = new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext)();
        } catch {}
      }
      document.removeEventListener("click", warmAudio);
    }
    document.addEventListener("click", warmAudio);
    return () => document.removeEventListener("click", warmAudio);
  }, []);

  // Realtime: watch appointment status changes for this doctor today
  useEffect(() => {
    const sb = createClient();
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });

    const channel = sb.channel("doctor-queue-" + doctorId)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "appointments",
        filter: `doctor_id=eq.${doctorId}`,
      }, async (payload) => {
        const appt = payload.new as Record<string, unknown>;
        if (appt.appt_date !== today) return;

        // Fetch updated patient list silently
        // Fetch updated list WITH visit IDs
        const { data: updated } = await sb
          .from("appointments")
          .select("id, start_time, status, visit_type, patient_id, patients(full_name), visits(id)")
          .eq("doctor_id", doctorId)
          .eq("appt_date", today)
          .in("status", ["booked","confirmed","arrived","with_doctor","done"])
          .order("start_time");

        if (updated) {
          const newList: OutpatientEntry[] = updated.map((a: Record<string, unknown>) => {
            const pt = Array.isArray(a.patients) ? a.patients[0] : a.patients as {full_name?: string}|null;
            const visits = Array.isArray(a.visits) ? a.visits : (a.visits ? [a.visits] : []);
            const visitId = (visits[0] as {id?: string}|null)?.id ?? null;
            return {
              appointmentId: a.id as string,
              visitId,
              patientName: pt?.full_name ?? "Patient",
              startTime: a.start_time as string,
              status: a.status as string,
              visitType: a.visit_type as string,
            };
          });
          setPatients(newList);

          // Notification + sound for key status changes
          const newStatus = appt.status as string;
          if (newStatus === "with_doctor") {
            setNotification("🟢 New patient waiting for you");
            // Play notification sound
            try {
              const ctx = new (window.AudioContext || (window as unknown as Record<string,typeof AudioContext>).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
              gain.gain.setValueAtTime(0.3, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.5);
            } catch {}
          } else if (newStatus === "arrived") {
            setNotification("🟡 Patient arrived — awaiting you");
          }
          // Keep notification longer (12 seconds)
          setTimeout(() => setNotification(null), 12000);
        }
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") console.log("[Realtime] Doctor queue connected");
      });

    return () => { sb.removeChannel(channel); };
  }, [doctorId]);

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

        {/* Realtime notification */}
        {notification && (
          <div className="mx-2 mb-2 flex items-center justify-between rounded-lg border border-indigo-300 bg-indigo-600 px-3 py-2 shadow-lg">
            <span className="text-xs font-semibold text-white">{notification}</span>
            <button onClick={() => setNotification(null)}
              className="ml-2 flex-shrink-0 text-indigo-200 hover:text-white text-sm leading-none">
              ✕
            </button>
          </div>
        )}

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
          <Link href="/doctor/dashboard"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
              pathname === "/doctor/dashboard" ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"
            }`}>
            Dashboard
          </Link>
          <Link href="/doctor/pending-visits"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
              pathname.startsWith("/doctor/pending-visits") ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"
            }`}>
            ⏳ Pending Visits
          </Link>
          <Link href="/doctor/schedule"
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${pathname.startsWith("/doctor/schedule") ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"}`}>
            <span>🗓</span>
            <span>{isClinicHead ? "Clinic Schedule" : "My Schedule"}</span>
          </Link>
          <Link href="/doctor/patients"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
              pathname.startsWith("/doctor/patients") ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-700"
            }`}>
            Patient Search
          </Link>
          <Link href="/doctor/inpatients"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
              pathname === "/doctor/inpatients" || pathname === "/doctor/inpatients/"
                ? "bg-neutral-100 font-medium text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-700"
            }`}>
            🏨 All Inpatients
          </Link>
          <Link href="/doctor/claims"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
              pathname.startsWith("/doctor/claims") ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-700"
            }`}>
            🧾 Claims
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
