"use client";

/**
 * InsuranceCoverageField
 * Shows the coverage % breakdown: insurance pays X%, patient pays Y% in cash.
 * Used in patient edit form and appointment form.
 */
interface Props {
  totalFee?: number;
  coveragePct: number;
  onChangePct: (pct: number) => void;
  currency?: string;
  compact?: boolean;
}

export function InsuranceCoverageField({
  totalFee,
  coveragePct,
  onChangePct,
  currency = "JOD",
  compact = false,
}: Props) {
  const pct      = Math.min(100, Math.max(0, coveragePct));
  const insAmt   = totalFee != null ? (totalFee * pct) / 100 : null;
  const cashAmt  = totalFee != null ? totalFee - (totalFee * pct) / 100 : null;

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Insurance Coverage %
      </label>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={0}
          max={100}
          step={5}
          value={pct}
          onChange={e => onChangePct(Math.min(100, Math.max(0, Number(e.target.value))))}
          className="w-24 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold outline-none focus:border-neutral-500"
          placeholder="80"
        />
        <span className="text-sm text-neutral-500">%</span>
        {/* Quick preset buttons */}
        {!compact && (
          <div className="flex gap-1.5 flex-wrap">
            {[70, 75, 80, 85, 90, 100].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => onChangePct(p)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                  pct === p
                    ? "bg-neutral-900 text-white"
                    : "border border-neutral-300 text-neutral-500 hover:border-neutral-500"
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Breakdown */}
      {totalFee != null && totalFee > 0 ? (
        <div className="mt-2.5 flex gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div className="flex-1 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Insurance Claims</p>
            <p className="mt-0.5 text-lg font-bold text-blue-700">
              {insAmt?.toFixed(2)} {currency}
            </p>
            <p className="text-[10px] text-neutral-400">{pct}% of {totalFee} {currency}</p>
          </div>
          <div className="w-px bg-neutral-200" />
          <div className="flex-1 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Patient Pays Cash</p>
            <p className="mt-0.5 text-lg font-bold text-green-700">
              {cashAmt?.toFixed(2)} {currency}
            </p>
            <p className="text-[10px] text-neutral-400">{100 - pct}% of {totalFee} {currency}</p>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-[11px] text-neutral-400">
          {pct === 100
            ? "Insurance covers 100% — patient pays nothing in cash."
            : pct === 0
            ? "No insurance coverage — patient pays full amount in cash."
            : `Insurance covers ${pct}%, patient pays ${100 - pct}% in cash.`}
        </p>
      )}
    </div>
  );
}
