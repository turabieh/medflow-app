"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { submitBookingRequest } from "@/lib/actions/booking-request";
import { BilingualInput } from "@/components/ui/bilingual-input";
import { JordanDateInput } from "@/components/ui/jordan-date-input";

export default function PublicBookingPage() {
  const params = useParams<{ slug: string }>();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [period, setPeriod] = useState<"morning" | "afternoon">("morning");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Earliest selectable date is tomorrow (Jordan time)
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await submitBookingRequest({
      clinicSlug: params.slug,
      fullName,
      phone,
      preferredDate,
      period,
      notes: notes || undefined,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mb-3 text-2xl">✓</div>
          <h1 className="mb-2 text-lg font-medium text-neutral-900">Request sent</h1>
          <p className="text-sm leading-relaxed text-neutral-500">
            We will call you to confirm your appointment.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setFullName("");
              setPhone("");
              setPreferredDate("");
              setNotes("");
            }}
            className="mt-6 text-sm text-neutral-600 underline hover:text-neutral-900"
          >
            Book another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-2 text-center text-lg font-medium text-neutral-900">
          Book an appointment
        </div>
        <p className="mb-6 text-center text-sm text-neutral-500">
          We&apos;ll call you to confirm your slot.
        </p>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
        >
          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-4">
            <BilingualInput
              label="Full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ahmad Al-Rashid"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm text-neutral-700">Phone number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              placeholder="079 123 4567"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm text-neutral-700">Preferred date</label>
            <input
              type="date"
              required
              min={minDate}
              value={preferredDate}
              onChange={e => setPreferredDate(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
            {preferredDate && (
              <p className="mt-1 text-xs text-neutral-400">
                {preferredDate.split("-").reverse().join("/")}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm text-neutral-700">Preferred time</label>
            <div className="flex gap-3">
              <label
                className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center text-sm transition ${
                  period === "morning"
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-700"
                }`}
              >
                <input
                  type="radio"
                  name="period"
                  className="hidden"
                  checked={period === "morning"}
                  onChange={() => setPeriod("morning")}
                />
                Morning
              </label>
              <label
                className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center text-sm transition ${
                  period === "afternoon"
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-700"
                }`}
              >
                <input
                  type="radio"
                  name="period"
                  className="hidden"
                  checked={period === "afternoon"}
                  onChange={() => setPeriod("afternoon")}
                />
                Afternoon
              </label>
            </div>
          </div>

          <div className="mb-6">
            <BilingualInput
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Symptoms or any other info..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Submit request →"}
          </button>
        </form>
      </div>
    </div>
  );
}
