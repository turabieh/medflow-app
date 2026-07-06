"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { InsuranceCoverageField } from "./insurance-coverage-field";

interface Props {
  patientId: string;
  totalFee: number;
  currency?: string;
  onSplit: (data: {
    coveragePct: number;
    patientCashAmount: number;
    insuranceClaimAmount: number;
    insuranceFee: number;
    paymentAmount: number;
  }) => void;
}

/**
 * Fetches patient's coverage % and auto-calculates the split.
 * Call onSplit whenever values change so the parent form can save them.
 */
export function InsuranceSplitCalculator({ patientId, totalFee, currency = "JOD", onSplit }: Props) {
  const [coveragePct, setCoveragePct] = useState<number>(80);
  const [loading, setLoading]         = useState(true);

  // Fetch patient's coverage pct on mount
  useEffect(() => {
    if (!patientId) return;
    const supabase = createClient();
    supabase
      .from("patients")
      .select("insurance_coverage_pct")
      .eq("id", patientId)
      .single()
      .then(({ data }) => {
        if (data?.insurance_coverage_pct != null) {
          setCoveragePct(Number(data.insurance_coverage_pct));
        }
        setLoading(false);
      });
  }, [patientId]);

  // Recalculate whenever fee or pct changes
  useEffect(() => {
    const insuranceAmt = Math.round((totalFee * coveragePct / 100) * 100) / 100;
    const cashAmt      = Math.round((totalFee - insuranceAmt) * 100) / 100;
    onSplit({
      coveragePct,
      patientCashAmount:    cashAmt,
      insuranceClaimAmount: insuranceAmt,
      insuranceFee:         insuranceAmt,  // backwards compat
      paymentAmount:        cashAmt,        // backwards compat
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coveragePct, totalFee]);

  if (loading) return <p className="text-xs text-neutral-400">Loading coverage %...</p>;

  return (
    <InsuranceCoverageField
      totalFee={totalFee}
      coveragePct={coveragePct}
      onChangePct={setCoveragePct}
      currency={currency}
    />
  );
}
