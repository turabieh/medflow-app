"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
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
  payment_confirmed?:     boolean | null;
  payment_method?:        string | null;
  visit_fee?:             number | null;
  patient_cash_amount?:   number | null;
  insurance_claim_amount?:number | null;
  insuranceCompanyId?:    string | null;
  insuranceCompanyName?:  string | null;
  insuranceCoveragePct?:  number | null;
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

// ── Print Buttons ─────────────────────────────────────────────────────────────
function PrintButtons({ appointmentId, patientId, item, currency }: {
  appointmentId: string; patientId: string; item: QueueItem; currency: string;
}) {
  const [visitId, setVisitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchVisitId() {
      setLoading(true);
      const { createClient } = await import("@/lib/supabase/client");
      const sb = createClient();
      const { data } = await sb.from("visits").select("id")
        .eq("appointment_id", appointmentId).maybeSingle();
      setVisitId(data?.id ?? null);
      setLoading(false);
    }
    fetchVisitId();
  }, [appointmentId]);

  const payParams = `&pm=${item.payment_method ?? ""}&pamt=${item.patient_cash_amount ?? item.visit_fee ?? 0}&vfee=${item.visit_fee ?? 0}&cash=${item.patient_cash_amount ?? 0}&ins=${item.insurance_claim_amount ?? 0}&paid=1&apptId=${appointmentId}`;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {loading && <span className="text-xs text-neutral-400">Loading...</span>}
      {!loading && [
        { type: "invoice",      label: "🧾 Invoice" },
        { type: "prescription", label: "💊 Prescription" },
        { type: "note",         label: "📋 Clinical Note" },
        { type: "summary",      label: "📄 Summary" },
      ].map(({ type, label }) => {
        const url = visitId
          ? `/print/report?type=${type}&visitId=${visitId}&patientId=${patientId}${payParams}`
          : `/print/report?type=${type}&patientId=${patientId}${payParams}`;
        return (
          <a key={type} href={url} target="_blank" rel="noreferrer"
            className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 shadow-sm">
            {label}
          </a>
        );
      })}
    </div>
  );
}

function DonePanel({ item, patientId, currency }: { item: QueueItem; patientId: string; currency: string }) {
  const router = useRouter();
  const [showPanel, setShowPanel] = useState(false);
  const [paymentDone, setPaymentDone] = useState(item.payment_confirmed ?? false);
  const [editingPayment, setEditingPayment] = useState(false);
  const isToday = item.appt_date === new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  // Payment fields
  const [method, setMethod] = useState<"cash"|"card"|"insurance"|"other">("cash");
  const [visitFee, setVisitFee] = useState("");
  // Insurance split
  const hasInsurance = !!(item.insuranceCompanyId);
  const [coveragePct, setCoveragePct] = useState(String(item.insuranceCoveragePct ?? 80));
  const [patientPays, setPatientPays] = useState("");
  const [insurancePays, setInsurancePays] = useState("");
  const [patientPayMethod, setPatientPayMethod] = useState<"cash"|"card"|"other">("cash");
  // Insurance not covering
  const [insuranceCoversVisit, setInsuranceCoversVisit] = useState(true);

  // Auto-calculate split when fee or coverage changes
  function recalcSplit(fee: string, pct: string) {
    const f = parseFloat(fee) || 0;
    const p = parseFloat(pct) || 0;
    const insPays = +(f * p / 100).toFixed(2);
    const patPays = +(f - insPays).toFixed(2);
    setInsurancePays(String(insPays));
    setPatientPays(String(patPays));
  }

  function onFeeChange(v: string) {
    setVisitFee(v);
    if (method === "insurance" && insuranceCoversVisit) recalcSplit(v, coveragePct);
  }

  function onCoveragePctChange(v: string) {
    setCoveragePct(v);
    recalcSplit(visitFee, v);
  }

  function onPatientPaysChange(v: string) {
    setPatientPays(v);
    const f = parseFloat(visitFee) || 0;
    const pat = parseFloat(v) || 0;
    setInsurancePays(String(+(f - pat).toFixed(2)));
  }

  function onInsurancePaysChange(v: string) {
    setInsurancePays(v);
    const f = parseFloat(visitFee) || 0;
    const ins = parseFloat(v) || 0;
    setPatientPays(String(+(f - ins).toFixed(2)));
  }

  async function handlePayment() {
    setLoading(true); setError(null);
    const fee = parseFloat(visitFee) || 0;
    let patCash = 0, insClaim = 0;

    if (method === "insurance" && insuranceCoversVisit) {
      patCash  = parseFloat(patientPays)   || 0;
      insClaim = parseFloat(insurancePays) || 0;
    } else {
      // cash, card, other — or insurance not covering → patient pays all
      patCash  = fee;
      insClaim = 0;
    }

    const result = await confirmPayment(item.id, {
      paymentMethod:        method,
      visitFee:             fee,
      patientCashAmount:    patCash,
      insuranceClaimAmount: insClaim,
      patientPaymentMethod: method === "insurance" ? patientPayMethod : undefined,
    });
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Error"); return; }
    setPaymentDone(true);
    setEditingPayment(false);
    router.refresh();
  }

  async function handleFinalize() {
    setLoading(true);
    await markFinalized(item.id);
    setLoading(false);
    router.refresh();
  }

  const inp = "rounded border border-neutral-300 px-2 py-1 text-sm w-full outline-none focus:border-neutral-500";
  const methodBtn = (m: string, label: string, active: boolean) => (
    <button key={m} type="button" onClick={() => { setMethod(m as typeof method); if (m !== "insurance") { setPatientPays(""); setInsurancePays(""); } else if (visitFee) recalcSplit(visitFee, coveragePct); }}
      className={`rounded px-2 py-1 text-xs font-medium ${active ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"}`}>
      {label}
    </button>
  );

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {(!paymentDone || editingPayment) && (
        <>
          <button onClick={() => setShowPanel(!showPanel)}
            className="rounded-md border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100">
            💳 Collect Payment
          </button>

          {showPanel && (
            <div className="mt-2 w-full rounded-lg border border-neutral-200 bg-white p-4 space-y-3 shadow-sm">
              {error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>}

              {/* Visit total fee */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-neutral-600 w-28 shrink-0">Visit Total ({currency})</label>
                <input type="number" step="0.01" min="0" value={visitFee}
                  onChange={e => onFeeChange(e.target.value)} placeholder="0.00"
                  className={inp + " w-28"} />
              </div>

              {/* Payment method */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-neutral-600 w-28 shrink-0">Method</span>
                <div className="flex gap-1.5">
                  {methodBtn("cash",      "Cash",      method==="cash")}
                  {methodBtn("card",      "Card",      method==="card")}
                  {methodBtn("insurance", "Insurance", method==="insurance")}
                  {methodBtn("other",     "Other",     method==="other")}
                </div>
              </div>

              {/* Insurance split section */}
              {method === "insurance" && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-3">
                  {/* Company */}
                  {item.insuranceCompanyName && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-700 font-medium">🏥 {item.insuranceCompanyName}</span>
                    </div>
                  )}

                  {/* Does insurance cover this visit? */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-neutral-700">Insurance covers this visit?</span>
                    <button type="button" onClick={() => { setInsuranceCoversVisit(true); if (visitFee) recalcSplit(visitFee, coveragePct); }}
                      className={`rounded px-2 py-0.5 text-xs font-medium ${insuranceCoversVisit ? "bg-blue-600 text-white" : "border border-neutral-300 text-neutral-600"}`}>Yes</button>
                    <button type="button" onClick={() => { setInsuranceCoversVisit(false); setInsurancePays("0"); setPatientPays(visitFee); }}
                      className={`rounded px-2 py-0.5 text-xs font-medium ${!insuranceCoversVisit ? "bg-red-600 text-white" : "border border-neutral-300 text-neutral-600"}`}>No — Patient pays all</button>
                  </div>

                  {insuranceCoversVisit && (
                    <>
                      {/* Coverage % */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-neutral-700 w-28 shrink-0">Coverage %</label>
                        <input type="number" min="0" max="100" step="1" value={coveragePct}
                          onChange={e => onCoveragePctChange(e.target.value)}
                          className={inp + " w-20"} />
                        <span className="text-xs text-neutral-500">% covered by insurance</span>
                      </div>

                      {/* Split breakdown */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-neutral-700 block mb-1">Patient pays ({currency})</label>
                          <input type="number" step="0.01" min="0" value={patientPays}
                            onChange={e => onPatientPaysChange(e.target.value)}
                            className={inp} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-neutral-700 block mb-1">Insurance claim ({currency})</label>
                          <input type="number" step="0.01" min="0" value={insurancePays}
                            onChange={e => onInsurancePaysChange(e.target.value)}
                            className={inp} />
                        </div>
                      </div>

                      {/* How patient pays their portion */}
                      {parseFloat(patientPays) > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-700 w-28 shrink-0">Patient pays by</span>
                          <div className="flex gap-1.5">
                            {(["cash","card","other"] as const).map(m => (
                              <button key={m} type="button" onClick={() => setPatientPayMethod(m)}
                                className={`rounded px-2 py-0.5 text-xs capitalize ${patientPayMethod===m?"bg-neutral-900 text-white":"border border-neutral-300 text-neutral-600"}`}>
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Summary */}
                  {visitFee && (
                    <div className="rounded bg-white border border-blue-200 px-3 py-2 text-xs space-y-0.5">
                      <div className="flex justify-between"><span className="text-neutral-600">Total visit fee:</span><span className="font-semibold">{parseFloat(visitFee).toFixed(2)} {currency}</span></div>
                      {insuranceCoversVisit && <>
                        <div className="flex justify-between text-green-700"><span>Patient pays now:</span><span className="font-semibold">{(parseFloat(patientPays)||0).toFixed(2)} {currency}</span></div>
                        <div className="flex justify-between text-blue-700"><span>Insurance claim later:</span><span className="font-semibold">{(parseFloat(insurancePays)||0).toFixed(2)} {currency}</span></div>
                      </>}
                      {!insuranceCoversVisit && <div className="flex justify-between text-orange-700"><span>Patient pays all:</span><span className="font-semibold">{parseFloat(visitFee).toFixed(2)} {currency}</span></div>}
                    </div>
                  )}
                </div>
              )}

              <button onClick={handlePayment} disabled={loading || !visitFee}
                className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-neutral-700">
                {loading ? "Saving..." : "✓ Confirm Payment"}
              </button>
            </div>
          )}
        </>
      )}

      {paymentDone && !editingPayment && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">✓ Payment confirmed</span>
          {isToday && (
            <button onClick={() => setEditingPayment(true)}
              className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-500 hover:bg-neutral-50">
              ✏ Edit
            </button>
          )}
          {item.payment_method === "insurance" && item.insurance_claim_amount && item.insurance_claim_amount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              🏥 {item.insurance_claim_amount.toFixed(2)} {currency} to claim
            </span>
          )}
        </div>
      )}

      {/* Quick print buttons — available after payment */}
      {paymentDone && !editingPayment && (
        <PrintButtons appointmentId={item.id} patientId={patientId} item={item} currency={currency} />
      )}

      {/* Quick action buttons */}
      {!editingPayment && <div className="mt-2 flex flex-wrap gap-1.5">
        <a href={`/secretary/patients/${patientId}`}
          className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 shadow-sm">
          👤 Patient Info
        </a>
        <a href={`/secretary/appointments/new?patientId=${patientId}`}
          className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 shadow-sm">
          📅 Book Appointment
        </a>
      </div>}

      {!editingPayment && <div className="mt-3 flex justify-end">
        {!confirmFinalize ? (
          <button onClick={() => setConfirmFinalize(true)} disabled={loading}
            className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm">
            ✓ Finalize Visit
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2">
            <span className="text-xs font-medium text-emerald-800">Finalize this visit?</span>
            <button onClick={async () => { setConfirmFinalize(false); await handleFinalize(); }} disabled={loading}
              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {loading ? "..." : "Yes, finalize"}
            </button>
            <button onClick={() => setConfirmFinalize(false)}
              className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-50">
              Cancel
            </button>
          </div>
        )}
      </div>}
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
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Pre-warm audio on first click
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

  // Sync when server re-renders
  useEffect(() => { setItems(initialItems); }, [initialItems]);

  // Realtime: watch for status changes triggered by doctor
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    if (!clinicId) return;
    const sb = createClient();
    const channel = sb
      .channel("secretary-queue-" + clinicId)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "appointments" },
        (payload: { new: Record<string, unknown> }) => {
          const updated = payload.new;
          const newStatus = updated.status as string;

          setItems(prev => prev.map(i =>
            i.id === updated.id ? { ...i, status: newStatus } : i
          ));

          if (newStatus === "done") {
            const patient = itemsRef.current.find(i => i.id === updated.id);
            const name = patient?.patientName ?? "Patient";
            setRealtimeNote(`✓ ${name} — visit done. Ready to finalize.`);

            try {
              const ctx = audioCtxRef.current ?? new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext)();
              const playSound = () => {
                const osc = ctx.createOscillator(); const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(660, ctx.currentTime);
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.25, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
              };
              if (ctx.state === "suspended") { ctx.resume().then(playSound).catch(() => {}); } else { playSound(); }
            } catch {}

            setTimeout(() => setRealtimeNote(null), 15000);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") console.log("[Realtime] Secretary queue connected");
      });

    return () => { sb.removeChannel(channel); };
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
