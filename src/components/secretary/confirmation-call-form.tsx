"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmAppointmentAttendance,
  logConfirmationCallAttempt,
  rescheduleAppointment,
  cancelAppointment,
} from "@/lib/actions/appointments";
import type { VisitType } from "@/lib/scheduling/slots";

interface ConfirmationCallFormProps {
  appointment: {
    id: string;
    appt_date: string;
    start_time: string;
    visit_type: VisitType;
    confirmation_call_attempts: number;
    no_answer_flag?: boolean;
  };
  patientName: string;
}

export function ConfirmationCallForm({ appointment, patientName }: ConfirmationCallFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"default" | "reschedule" | "cancel">("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newDate, setNewDate] = useState(appointment.appt_date);
  const [newTime, setNewTime] = useState(appointment.start_time?.slice(0, 5) ?? "");
  const [cancelReason, setCancelReason] = useState("");

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await confirmAppointmentAttendance(appointment.id);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Could not confirm.");
      return;
    }
    router.refresh();
  }

  async function handleNoAnswer() {
    setLoading(true);
    setError(null);
    const result = await logConfirmationCallAttempt(appointment.id);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Could not log call attempt.");
      return;
    }
    router.refresh();
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await rescheduleAppointment(appointment.id, newDate, newTime, appointment.visit_type);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Could not reschedule.");
      return;
    }
    router.refresh();
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await cancelAppointment(appointment.id, cancelReason);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Could not cancel.");
      return;
    }
    router.refresh();
  }

  const isNoAnswer = appointment.no_answer_flag || appointment.confirmation_call_attempts >= 3;
  const attemptsLeft = Math.max(0, 3 - appointment.confirmation_call_attempts);

  return (
    <div className={`rounded-lg border p-4 ${isNoAnswer ? "border-red-300 bg-red-50/60" : "border-blue-200 bg-blue-50/40"}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-neutral-900">{patientName}</p>
            {isNoAnswer && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                🚩 No Answer × 3 — Slot can be overbooked
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            {appointment.appt_date} at {appointment.start_time?.slice(0, 5)} ·{" "}
            {appointment.confirmation_call_attempts} call attempt{appointment.confirmation_call_attempts === 1 ? "" : "s"}
            {!isNoAnswer && attemptsLeft > 0 && (
              <span className="ml-1 text-amber-600 font-medium">
                · {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} remaining before flag
              </span>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {mode === "default" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            Confirmed
          </button>
          <button
            onClick={handleNoAnswer}
            disabled={loading}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            No answer
          </button>
          <button
            onClick={() => setMode("reschedule")}
            disabled={loading}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Reschedule
          </button>
          <button
            onClick={() => setMode("cancel")}
            disabled={loading}
            className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Cancel appointment
          </button>
        </div>
      )}

      {mode === "reschedule" && (
        <form onSubmit={handleReschedule} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <input
              type="time"
              required
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <p className="text-xs text-neutral-500">
            Note: slot availability isn&apos;t re-checked here yet — double-check the new time doesn&apos;t clash before saving.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save new time"}
            </button>
            <button
              type="button"
              onClick={() => setMode("default")}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              Back
            </button>
          </div>
        </form>
      )}

      {mode === "cancel" && (
        <form onSubmit={handleCancel} className="space-y-2">
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Cancelling..." : "Confirm cancellation"}
            </button>
            <button
              type="button"
              onClick={() => setMode("default")}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
