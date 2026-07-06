#!/bin/bash
# Patch appointment forms to add insurance split calculation
# Run from project root: bash patch-appointment-form.sh

python3 << 'PYEOF'
import os, glob

# Find appointment forms
forms = glob.glob("src/components/secretary/*appointment*.tsx") + \
        glob.glob("src/components/secretary/*booking*.tsx")

print("Found forms:", forms)

for filepath in forms:
    with open(filepath) as f:
        content = f.read()

    changed = False

    # 1. Add coverage_pct state if not present
    if "coveragePct" not in content and "insurance" in content.lower():
        content = content.replace(
            "const [paymentMethod, setPaymentMethod]",
            "const [coveragePct, setCoveragePct] = useState<number>(100);\n  const [insuranceClaimAmount, setInsuranceClaimAmount] = useState<number>(0);\n  const [patientCashAmount, setPatientCashAmount] = useState<number>(0);\n  const [paymentMethod, setPaymentMethod]"
        )
        changed = True

    # 2. When patient changes, fetch coverage pct
    if "insurance_coverage_pct" not in content and "setSelectedPatient" in content:
        # After patient selection, recalculate
        content = content.replace(
            "setSelectedPatient(patient);",
            """setSelectedPatient(patient);
      // Auto-load patient's coverage percentage
      const pct = (patient as {insurance_coverage_pct?: number}).insurance_coverage_pct ?? 100;
      setCoveragePct(pct);
      const fee = visitFee || insuranceFee || 0;
      if (fee > 0) {
        const insAmt = Math.round(fee * pct / 100 * 100) / 100;
        setInsuranceClaimAmount(insAmt);
        setPatientCashAmount(Math.round((fee - insAmt) * 100) / 100);
      }"""
        )
        changed = True

    if changed:
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Patched: {filepath}")
    else:
        print(f"Skipped (no match): {filepath}")

PYEOF
