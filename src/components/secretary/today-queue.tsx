"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { to12h } from "@/lib/client-timezone";
import {
  markArrived,
  markWithDoctor,
  markNoShow,
  cancelAppointment,
  saveVitals,
  confirmPayment,
  markFinalized,
  markDone,
} from "@/lib/actions/appointments";

interface QueueItem {
  id: string;
  start_time: string | null;
  status: string;
  visit_type: string;
  is_overbooked: boolean;
  no_answer_flag?: boolean;
  patientId: string;
  patientName: string;
  patientNameAr?: string | null;
  phone?: string;
  vital_heart_rate?: number | null;
  vital_bp?: string | null;
  vital_temperature?: number | null;
  vital_o2_saturation?: number | null;
  vital_resp_rate?: number | null;
  vital_weight_kg?: number | null;
  vital_height_cm?: number | null;
  vitals_recorded_at?: string | null;
  secretary_arrival_note?: string | null;
  payment_confirmed?: boolean | null;
}

type Symptom = { id: string; name: string; name_ar: string | null; category?: string };

const STATUS_BADGE: Record<string, string> = {
  booked:      "bg-purple-100 text-purple-700",
  confirmed:   "bg-blue-100 text-blue-700",
  arrived:     "bg-emerald-100 text-emerald-800",
  with_doctor: "bg-indigo-100 text-indigo-800",
  done:        "bg-orange-100 text-orange-700",
  finalized:   "bg-neutral-100 text-neutral-500",
  no_show:     "bg-red-100 text-red-700",
  cancelled:   "bg-neutral-100 text-neutral-400",
};
const STATUS_BORDER: Record<string, string> = {
  booked:      "border-l-purple-300",
  confirmed:   "border-l-blue-300",
  arrived:     "border-l-emerald-400",
  with_doctor: "border-l-indigo-400",
  done:        "border-l-orange-300",
  finalized:   "border-l-neutral-200",
  no_show:     "border-l-red-300",
  cancelled:   "border-l-neutral-200",
};

// ── Vitals + Symptoms + Note Form ───────────────────────────────────────────
function VitalsForm({ item, onClose, basicSymptoms = [] }: {
  item: QueueItem;
  onClose: () => void;
  basicSymptoms?: Symptom[];
}) {
  const router = useRouter();
  // Pre-fill from saved vitals
  const [hr,     setHr]     = useState(item.vital_heart_rate?.toString() ?? "");
  const [bp,     setBp]     = useState(item.vital_bp ?? "");
  const [temp,   setTemp]   = useState(item.vital_temperature?.toString() ?? "");
  const [o2,     setO2]     = useState(item.vital_o2_saturation?.toString() ?? "");
  const [rr,     setRr]     = useState(item.vital_resp_rate?.toString() ?? "");
  const [weight, setWeight] = useState(item.vital_weight_kg?.toString() ?? "");
  const [height, setHeight] = useState(item.vital_height_cm?.toString() ?? "");
  const [arrivalNote, setArrivalNote] = useState(item.secretary_arrival_note ?? "");
  const [checkedSymptoms, setCheckedSymptoms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  function toggleSym(id: string) {
    setCheckedSymptoms(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);

    // Save arrival note
    if (arrivalNote !== (item.secretary_arrival_note ?? "")) {
      const { createClient } = await import("@/lib/supabase/client");
      const sb = createClient();
      await sb.from("appointments").update({ secretary_arrival_note: arrivalNote.trim() || null }).eq("id", item.id);
    }

    // Save checked symptoms to visit
    if (checkedSymptoms.size > 0) {
      const { createClient } = await import("@/lib/supabase/client");
      const sb = createClient();
      const { data: visit } = await sb.from("visits").select("id").eq("appointment_id", item.id).single();
      if (visit) {
        const rows = Array.from(checkedSymptoms).map(sid => ({ visit_id: visit.id, symptom_id: sid }));
        await sb.from("visit_symptoms").upsert(rows, { onConflict: "visit_id,symptom_id" });
      }
    }

    const result = await saveVitals({
      appointmentId: item.id,
      heartRate:    hr     ? parseInt(hr)       : undefined,
      bp:           bp     || undefined,
      temperature:  temp   ? parseFloat(temp)   : undefined,
      o2Saturation: o2     ? parseInt(o2)       : undefined,
      respRate:     rr     ? parseInt(rr)       : undefined,
      weightKg:     weight ? parseFloat(weight) : undefined,
      heightCm:     height ? parseFloat(height) : undefined,
    });

    setSaving(false);
    if (!result.success) { setError(result.error ?? "Could not save."); return; }
    setSaved(true);
    router.refresh();
  }

  const prevSaved = !!item.vitals_recorded_at;

  return (
    <form onSubmit={handleSave} className="mt-3 rounded-md border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-900">Vitals & Notes</p>
        {prevSaved && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            ✓ Previously saved
          </span>
        )}
      </div>

      {saved && (
        <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          ✓ Saved successfully
        </div>
      )}
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {/* Vitals grid */}
      <div className="mb-3 grid grid-cols-5 gap-2">
        {[
          { label:"HR (bpm)",   val:hr,     set:setHr,     type:"number", ph:"72"    },
          { label:"BP",         val:bp,     set:setBp,     type:"text",   ph:"120/80"},
          { label:"Temp (°C)",  val:temp,   set:setTemp,   type:"number", ph:"36.5", step:"0.1" },
          { label:"O2 (%)",     val:o2,     set:setO2,     type:"number", ph:"98"    },
          { label:"RR (/min)",  val:rr,     set:setRr,     type:"number", ph:"16"    },
        ].map(f => (
          <div key={f.label}>
            <label className="mb-1 block text-[10px] font-medium text-neutral-500">{f.label}</label>
            <input type={f.type} placeholder={f.ph} value={f.val}
              onChange={e => f.set(e.target.value)}
              step={(f as {step?:string}).step}
              className={`w-full rounded border px-2 py-1 text-sm outline-none focus:border-neutral-500 ${f.val ? "border-emerald-400 bg-emerald-50/30" : "border-neutral-300"}`} />
          </div>
        ))}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {[
          { label:"Weight (kg)", val:weight, set:setWeight, step:"0.1", ph:"70" },
          { label:"Height (cm)", val:height, set:setHeight, ph:"170"           },
        ].map(f => (
          <div key={f.label}>
            <label className="mb-1 block text-[10px] font-medium text-neutral-500">{f.label}</label>
            <input type="number" placeholder={f.ph} value={f.val}
              onChange={e => f.set(e.target.value)}
              step={(f as {step?:string}).step}
              className={`w-full rounded border px-2 py-1 text-sm outline-none focus:border-neutral-500 ${f.val ? "border-emerald-400 bg-emerald-50/30" : "border-neutral-300"}`} />
          </div>
        ))}
      </div>

      {/* Basic symptoms */}
      {basicSymptoms.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-neutral-700">
            Symptoms at Arrival
            <span className="ml-1 font-normal text-neutral-400">(check what patient reports now)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {basicSymptoms.map(s => (
              <button key={s.id} type="button" onClick={() => toggleSym(s.id)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  checkedSymptoms.has(s.id)
                    ? "border-indigo-500 bg-indigo-50 font-semibold text-indigo-700"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                }`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Note to Doctor */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-semibold text-neutral-700">
          📝 Note to Doctor
        </label>
        <textarea value={arrivalNote} onChange={e => setArrivalNote(e.target.value)} rows={2}
          placeholder="e.g. Patient reports worsening pain, brought old reports..."
          className="w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        {item.secretary_arrival_note && arrivalNote === item.secretary_arrival_note && (
          <p className="mt-0.5 text-[10px] text-emerald-600">✓ Note saved previously</p>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {saving ? "Saving..." : saved ? "✓ Saved — Save Again" : "Save Vitals & Note"}
        </button>
        <button type="button" onClick={onClose}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50">
          Close
        </button>
      </div>
    </form>
  );
}

// ── Done/Payment Panel ───────────────────────────────────────────────────────
function DonePanel({ item, patientId, currency }: { item: QueueItem; patientId: string; currency: string }) {
  const router = useRouter();
  const [showPanel, setShowPanel] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash"|"insurance"|"card"|"other">("cash");
  const [paymentAmount, setPaymentAmount] = useState("0.00");
  const [paymentDone, setPaymentDone] = useState(item.payment_confirmed ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePayment() {
    setLoading(true); setError(null);
    const amount = parseFloat(paymentAmount) || 0;
    const result = await confirmPayment(item.id, paymentMethod, amount);
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Error"); return; }
    setPaymentDone(true);
    router.refresh();
  }

  async function handleFinalize() {
    setLoading(true);
    await markFinalized(item.id);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {!paymentDone && (
        <>
          <button onClick={() => setShowPanel(!showPanel)}
            className="rounded-md border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100">
            💳 Payment
          </button>
          {showPanel && (
            <div className="mt-2 w-full rounded-md border border-neutral-200 bg-white p-3">
              {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
              <div className="mb-2 flex gap-2">
                {(["cash","card","insurance","other"] as const).map(m => (
                  <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                    className={`rounded px-2 py-1 text-xs capitalize ${paymentMethod===m?"bg-neutral-900 text-white":"border border-neutral-300 text-neutral-600"}`}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="number" step="0.01" min="0" value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-28 rounded border border-neutral-300 px-2 py-1 text-sm" />
                <span className="self-center text-xs text-neutral-500">{currency}</span>
                <button onClick={handlePayment} disabled={loading}
                  className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-white disabled:opacity-50">
                  {loading ? "..." : "Confirm"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {paymentDone && (
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">✓ Payment confirmed</span>
      )}
      <button onClick={handleFinalize} disabled={loading}
        className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
        Finalize Visit
      </button>
    </div>
  );
}

// ── Main Queue ───────────────────────────────────────────────────────────────
export function TodayQueue({
  items: initialItems, currency = "JOD", symptomsCatalog = [], clinicId = "",
}: {
  items: QueueItem[];
  currency?: string;
  symptomsCatalog?: Symptom[];
  clinicId?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openVitals, setOpenVitals] = useState<string | null>(null);
  const [items, setItems] = useState<QueueItem[]>(initialItems);
  const [realtimeNote, setRealtimeNote] = useState<string | null>(null);

  // Sync when server re-renders
  useEffect(() => { setItems(initialItems); }, [initialItems]);

  // Realtime: watch for status changes triggered by doctor
  useEffect(() => {
    if (!clinicId) return;
    import("@/lib/supabase/client").then(({ createClient }) => {
      const sb = createClient();
      const channel = sb.channel("secretary-queue-" + clinicId)
        .on("postgres_changes", {
          event: "UPDATE", schema: "public", table: "appointments",
        }, (payload: {new: Record<string, unknown>}) => {
          const updated = payload.new;
          const newStatus = updated.status as string;

          // Update item status in state
          setItems(prev => prev.map(i =>
            i.id === updated.id ? { ...i, status: newStatus } : i
          ));

          // Notify secretary when doctor marks done
          if (newStatus === "done") {
            const patient = items.find(i => i.id === updated.id);
            const name = patient?.patientName ?? "Patient";
            setRealtimeNote(`✓ ${name} — visit done. Ready to finalize.`);

            // Play two-tone sound (lower tone = done, not urgent)
            try {
              const ctx = new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.frequency.setValueAtTime(660, ctx.currentTime);
              osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
              gain.gain.setValueAtTime(0.25, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
              osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
            } catch {}

            // Keep notification for 15 seconds
            const t = setTimeout(() => setRealtimeNote(null), 15000);
            return () => clearTimeout(t);
          }
        })
        .subscribe();
      return () => { sb.removeChannel(channel); };
    });
  }, [clinicId]);

  const basicSymptoms = symptomsCatalog.filter(s => !s.category || s.category === "basic");

  function runAction(id: string, action: (id: string) => Promise<unknown>) {
    setLoadingId(id);
    startTransition(async () => {
      await action(id);
      setLoadingId(null);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">No appointments scheduled for today.</p>;
  }

  // Show ALL items — no_show goes to a separate "Did Not Show" section but stays visible
  const active   = items.filter(i => !["finalized","cancelled","no_show"].includes(i.status));
  const noShows  = items.filter(i => i.status === "no_show");
  const terminal = items.filter(i => ["finalized","cancelled"].includes(i.status));

  const renderItem = (item: QueueItem) => {
    const isLoading   = loadingId === item.id;
    const border      = STATUS_BORDER[item.status] ?? "border-l-neutral-200";
    const badge       = STATUS_BADGE[item.status]  ?? "";
    const isVitalsOpen = openVitals === item.id;
    const hasVitals   = !!item.vitals_recorded_at;

    return (
      <div key={item.id} className={`rounded-md border-l-4 bg-white p-3 shadow-sm ${border}`}>
        <div className="flex items-start justify-between gap-3">
          {/* Left */}
          <div className="flex items-start gap-3">
            <span className="mt-0.5 w-12 flex-shrink-0 font-mono text-xs text-neutral-500">
              {to12h(item.start_time) || "-"}
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-900">
                {item.patientName}
                {item.is_overbooked && (
                  <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Overbooked</span>
                )}
                {item.no_answer_flag && (
                  <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">🚩 No Answer</span>
                )}
              </p>
              {item.patientNameAr && (
                <p className="text-xs text-neutral-400" dir="rtl">{item.patientNameAr} · {item.visit_type}</p>
              )}
              {!item.patientNameAr && <p className="text-xs text-neutral-400">{item.visit_type}</p>}
              {item.phone && <p className="font-mono text-xs text-neutral-400">{item.phone}</p>}
              {/* Show saved arrival note preview */}
              {item.secretary_arrival_note && (
                <p className="mt-0.5 text-[10px] text-amber-600 italic">📝 {item.secretary_arrival_note}</p>
              )}
            </div>
          </div>

          {/* Right: status + actions */}
          <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
              {item.status === "with_doctor" ? "With doctor"
                : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </span>

            {/* Arrived button */}
            {(item.status === "booked" || item.status === "confirmed") && (
              <>
                <button disabled={isLoading} onClick={() => runAction(item.id, markArrived)}
                  className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  ✓ Arrived
                </button>
                <button disabled={isLoading} onClick={() => runAction(item.id, markNoShow)}
                  className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
                  No-show
                </button>
                <button disabled={isLoading} onClick={() => { if (confirm("Cancel appointment?")) runAction(item.id, (id) => cancelAppointment(id)); }}
                  className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
                  Cancel
                </button>
              </>
            )}

            {/* Arrived status actions */}
            {item.status === "arrived" && (
              <>
                <button disabled={isLoading} onClick={() => runAction(item.id, markWithDoctor)}
                  className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                  → Doctor
                </button>
                <button disabled={isLoading} onClick={() => runAction(item.id, markNoShow)}
                  className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
                  No-show
                </button>
              </>
            )}

            {item.status === "with_doctor" && (
              <span className="text-xs italic text-neutral-400">With doctor</span>
            )}
          </div>
        </div>

        {/* Vitals button — show for arrived AND with_doctor (can update after) */}
        {(item.status === "arrived" || item.status === "with_doctor") && (
          <div className="mt-2">
            <button onClick={() => setOpenVitals(isVitalsOpen ? null : item.id)}
              className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                hasVitals
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
              }`}>
              {hasVitals ? "✓ Vitals saved — Update" : "📋 Enter Vitals & Note"}
            </button>
            {isVitalsOpen && (
              <VitalsForm item={item} onClose={() => setOpenVitals(null)} basicSymptoms={basicSymptoms} />
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
      {/* Realtime notification — doctor marked done */}
      {realtimeNote && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-400 bg-emerald-600 px-3 py-2.5 shadow-md">
          <div>
            <p className="text-xs font-bold text-white">{realtimeNote}</p>
            <p className="text-[10px] text-emerald-200 mt-0.5">Scroll down to find the patient and finalize</p>
          </div>
          <button onClick={() => setRealtimeNote(null)}
            className="ml-3 flex-shrink-0 text-emerald-200 hover:text-white text-sm">✕</button>
        </div>
      )}
      {/* Active queue */}
      {active.map(renderItem)}

      {/* No-shows — kept visible with "Return to queue" */}
      {noShows.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Did Not Show ({noShows.length})
          </p>
          {noShows.map(item => {
            const isLoading = loadingId === item.id;
            return (
              <div key={item.id} className="rounded-md border-l-4 border-l-red-300 bg-red-50/50 p-3 shadow-sm opacity-80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-12 font-mono text-xs text-neutral-400">{to12h(item.start_time) || "-"}</span>
                    <div>
                      <p className="text-sm font-medium text-neutral-700">{item.patientName}</p>
                      <p className="text-xs text-neutral-400">{item.visit_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">No-show</span>
                    <button disabled={isLoading} onClick={() => runAction(item.id, markArrived)}
                      className="rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                      ↩ Patient arrived late
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Finalized / cancelled — collapsed */}
      {terminal.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Completed / Cancelled ({terminal.length})
          </p>
          {terminal.map(item => (
            <div key={item.id} className="flex items-center gap-3 rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2 opacity-60">
              <span className="w-12 font-mono text-xs text-neutral-400">{to12h(item.start_time) || "-"}</span>
              <p className="flex-1 text-sm text-neutral-500">{item.patientName}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[item.status] ?? ""}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
