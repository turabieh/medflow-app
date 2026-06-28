"use client";
import { to12h, todayJordan } from "@/lib/client-timezone";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  markArrived,
  markWithDoctor,
  markFinalized,
  markNoShow,
  cancelAppointment,
  saveVitals,
  confirmPayment,
} from "@/lib/actions/appointments";

interface QueueItem {
  id: string;
  start_time: string | null;
  status: string;
  visit_type: string;
  is_overbooked: boolean;
  patientId: string;
  patientName: string;
  patientNameAr?: string | null;
  phone?: string;
  // Existing vitals
  vital_heart_rate?: number | null;
  vital_bp?: string | null;
  vital_temperature?: number | null;
  vital_o2_saturation?: number | null;
  vital_resp_rate?: number | null;
  vital_weight_kg?: number | null;
  vital_height_cm?: number | null;
  vitals_recorded_at?: string | null;
  payment_confirmed?: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  booked: "bg-purple-100 text-purple-800",
  confirmed: "bg-blue-100 text-blue-800",
  arrived: "bg-emerald-100 text-emerald-800",
  with_doctor: "bg-indigo-100 text-indigo-800",
  done: "bg-orange-100 text-orange-800",
  finalized: "bg-neutral-100 text-neutral-500",
  no_show: "bg-red-100 text-red-700",
  cancelled: "bg-neutral-100 text-neutral-400",
};

const STATUS_BORDER: Record<string, string> = {
  booked: "border-l-purple-400",
  confirmed: "border-l-blue-400",
  arrived: "border-l-emerald-400",
  with_doctor: "border-l-indigo-400",
  done: "border-l-orange-400",
  finalized: "border-l-neutral-300",
  no_show: "border-l-red-300",
  cancelled: "border-l-neutral-200",
};

function VitalsForm({ item, onClose }: { item: QueueItem; onClose: () => void }) {
  const router = useRouter();
  const [hr, setHr] = useState(item.vital_heart_rate?.toString() ?? "");
  const [bp, setBp] = useState(item.vital_bp ?? "");
  const [temp, setTemp] = useState(item.vital_temperature?.toString() ?? "");
  const [o2, setO2] = useState(item.vital_o2_saturation?.toString() ?? "");
  const [rr, setRr] = useState(item.vital_resp_rate?.toString() ?? "");
  const [weight, setWeight] = useState(item.vital_weight_kg?.toString() ?? "");
  const [height, setHeight] = useState(item.vital_height_cm?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveVitals({
      appointmentId: item.id,
      heartRate:    hr     ? parseInt(hr)     : undefined,
      bp:           bp     || undefined,
      temperature:  temp   ? parseFloat(temp) : undefined,
      o2Saturation: o2     ? parseInt(o2)     : undefined,
      respRate:     rr     ? parseInt(rr)     : undefined,
      weightKg:     weight ? parseFloat(weight) : undefined,
      heightCm:     height ? parseFloat(height) : undefined,
    });
    setSaving(false);
    if (!result.success) { setError(result.error ?? "Could not save."); return; }
    router.refresh();
    onClose();
  }

  return (
    <form onSubmit={handleSave} className="mt-3 rounded-md border border-neutral-200 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-neutral-900">Patient vitals</p>
      {item.vitals_recorded_at && (
        <p className="mb-2 text-xs text-emerald-600">Vitals already recorded - you can update them below.</p>
      )}
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <div className="mb-3 grid grid-cols-5 gap-2">
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">HR Heart Rate</label>
          <input type="number" placeholder="bpm" value={hr} onChange={(e) => setHr(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">BP Blood Pressure</label>
          <input type="text" placeholder="120/80" value={bp} onChange={(e) => setBp(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">Temp Temperature</label>
          <input type="number" step="0.1" placeholder="36.5" value={temp} onChange={(e) => setTemp(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">O2 O2 Sat</label>
          <input type="number" placeholder="%" value={o2} onChange={(e) => setO2(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">RR Resp. Rate</label>
          <input type="number" placeholder="/min" value={rr} onChange={(e) => setRr(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm" />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">Wt Weight (kg)</label>
          <input type="number" step="0.1" placeholder="70" value={weight} onChange={(e) => setWeight(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">Ht Height (cm)</label>
          <input type="number" placeholder="170" value={height} onChange={(e) => setHeight(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm" />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="rounded-md bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
          {saving ? "Saving..." : "Save Save Vitals"}
        </button>
        <button type="button" onClick={onClose}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50">
          Close
        </button>
      </div>
    </form>
  );
}

function DonePanel({ item, patientId, currency }: { item: QueueItem; patientId: string; currency: string }) {
  const router = useRouter();
  const [showPanel, setShowPanel] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "insurance" | "card" | "other">("cash");
  const [paymentAmount, setPaymentAmount] = useState("0.00");
  const [paymentDone, setPaymentDone] = useState(item.payment_confirmed ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePayment() {
    setLoading(true);
    setError(null);
    const amount = parseFloat(paymentAmount) || 0;
    const result = await confirmPayment(item.id, paymentMethod, amount);
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Error"); return; }
    setPaymentDone(true);
    router.refresh();
  }

  async function handleFinalize() {
    setLoading(true);
    const result = await markFinalized(item.id);
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Error"); return; }
    router.refresh();
  }

  function openPrint(type: string) {
    window.open(`/print/report?type=${type}&patientId=${patientId}`, "_blank");
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <button onClick={handleFinalize} disabled={loading}
          className="flex-1 rounded-md border border-neutral-300 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50">
          [OK] Finalize
        </button>
        <button onClick={() => setShowPanel(!showPanel)}
          className="flex-1 rounded-md border border-neutral-300 py-1.5 text-sm hover:bg-neutral-50">
          Panel Reports and Payment
        </button>
      </div>

      {showPanel && (
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

          <div className="mb-4 grid grid-cols-2 gap-4">
            {/* Payment */}
            <div>
              <p className="mb-2 text-sm font-medium">Payment Payment</p>
              {paymentDone ? (
                <p className="text-sm text-emerald-600">v Payment confirmed</p>
              ) : (
                <>
                  <p className="mb-2 text-xs text-neutral-500">Collect payment before finalizing.</p>
                  <div className="mb-2">
                    <label className="mb-1 block text-xs text-neutral-600">Amount ({currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="mb-1 block text-xs text-neutral-600">Method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                      className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                      <option value="cash">Cash</option>
                      <option value="insurance">Insurance</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <button onClick={handlePayment} disabled={loading}
                    className="w-full rounded-md bg-red-500 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
                    [OK] Confirm Payment
                  </button>
                </>
              )}
            </div>

            {/* Reports */}
            <div>
              <p className="mb-2 text-sm font-medium">Reports Reports</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => openPrint("summary")}
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs hover:bg-neutral-50">
                  Summary Summary
                </button>
                <button onClick={() => openPrint("prescription")}
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs hover:bg-neutral-50">
                  Prescription Prescription
                </button>
                <button onClick={() => openPrint("invoice")}
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs hover:bg-neutral-50">
                  Receipt Receipt
                </button>
                <button onClick={() => openPrint("referral")}
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs hover:bg-neutral-50">
                  Referral Referral
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-t border-neutral-100 pt-3">
            <button onClick={handleFinalize} disabled={loading}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50">
              [OK] Finalize Visit
            </button>
            <button
              onClick={() => window.open(`/secretary/appointments/new?patientId=${patientId}`, "_self")}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
              Book Book Follow-up
            </button>
            <button onClick={() => setShowPanel(false)}
              className="ml-auto rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-50">
              x Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TodayQueue({ items, currency = "JOD" }: { items: QueueItem[]; currency?: string }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openVitals, setOpenVitals] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(id: string, action: (id: string) => Promise<{ success: boolean; error?: string }>) {
    setLoadingId(id);
    setError(null);
    const result = await action(id);
    setLoadingId(null);
    if (!result.success) { setError(result.error ?? "Action failed."); return; }
    router.refresh();
  }

  const active = items.filter((i) => !["finalized", "cancelled", "no_show"].includes(i.status));
  const terminal = items.filter((i) => ["finalized", "cancelled", "no_show"].includes(i.status));

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">No appointments scheduled for today.</p>;
  }

  const renderItem = (item: QueueItem) => {
    const isLoading = loadingId === item.id;
    const border = STATUS_BORDER[item.status] ?? "border-l-neutral-200";
    const badge = STATUS_BADGE[item.status] ?? "";
    const isVitalsOpen = openVitals === item.id;
    const hasVitals = !!item.vitals_recorded_at;

    return (
      <div key={item.id} className={`rounded-md border-l-4 bg-white p-3 shadow-sm ${border}`}>
        <div className="flex items-start justify-between gap-3">
          {/* Left: patient info */}
          <div className="flex items-start gap-3">
            <span className="mt-0.5 w-12 flex-shrink-0 font-mono text-xs text-neutral-500">
              {to12h(item.start_time) || "-"}
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-900">
                {item.patientName}
                {item.is_overbooked && (
                  <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    Overbooked
                  </span>
                )}
              </p>
              {item.patientNameAr && (
                <p className="text-xs text-neutral-400" dir="rtl">{item.patientNameAr} · {item.visit_type}</p>
              )}
              {!item.patientNameAr && (
                <p className="text-xs text-neutral-400">{item.visit_type}</p>
              )}
              {item.phone && <p className="font-mono text-xs text-neutral-400">{item.phone}</p>}
            </div>
          </div>

          {/* Right: status + action buttons */}
          <div className="flex flex-shrink-0 items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
              {item.status === "with_doctor" ? "With doctor" : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </span>

            {(item.status === "booked" || item.status === "confirmed") && (
              <>
                <button disabled={isLoading} onClick={() => runAction(item.id, markArrived)}
                  className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50">
                  Arrived Arrived
                </button>
                <button disabled={isLoading} onClick={() => runAction(item.id, markNoShow)}
                  className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50">
                  No-show No-show
                </button>
                <button disabled={isLoading} onClick={() => { if (confirm("Cancel this appointment?")) runAction(item.id, (id) => cancelAppointment(id)); }}
                  className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
                  x Cancel
                </button>
              </>
            )}

            {item.status === "arrived" && (
              <>
                <button disabled={isLoading} onClick={() => runAction(item.id, markWithDoctor)}
                  className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50">
                  Send to doctor
                </button>
                <button disabled={isLoading} onClick={() => { if (confirm("Patient can't wait?")) runAction(item.id, markNoShow); }}
                  className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
                  No-show No-show
                </button>
                <button disabled={isLoading} onClick={() => { if (confirm("Cancel this appointment?")) runAction(item.id, (id) => cancelAppointment(id)); }}
                  className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">
                  x Cancel
                </button>
              </>
            )}

            {item.status === "with_doctor" && (
              <span className="text-xs italic text-neutral-400">With doctor - locked</span>
            )}
          </div>
        </div>

        {/* Vitals toggle for arrived patients */}
        {item.status === "arrived" && (
          <div className="mt-2">
            <button
              onClick={() => setOpenVitals(isVitalsOpen ? null : item.id)}
              className={`rounded-md border px-3 py-1 text-xs ${hasVitals ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"}`}
            >
              Vitals Vitals {hasVitals ? "[OK]" : ""}
            </button>
            {isVitalsOpen && (
              <VitalsForm item={item} onClose={() => setOpenVitals(null)} />
            )}
          </div>
        )}

        {/* Done panel */}
        {item.status === "done" && (
          <DonePanel item={item} patientId={item.patientId} currency={currency} />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {active.map(renderItem)}
      {terminal.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-600">
            Show finalized / cancelled / no-show ({terminal.length})
          </summary>
          <div className="mt-2 space-y-2">{terminal.map(renderItem)}</div>
        </details>
      )}
    </div>
  );
}
