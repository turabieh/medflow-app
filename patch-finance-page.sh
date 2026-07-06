#!/bin/bash
# Update finance page to show patient_cash_amount vs insurance_claim_amount correctly
# Run from project root: bash patch-finance-page.sh

python3 << 'PYEOF'
import re

filepath = "src/app/admin/finance/page.tsx"
if not os.path.exists(filepath):
    import os
    print(f"ERROR: {filepath} not found")
    exit(1)

import os
with open(filepath) as f:
    content = f.read()

# Update appointments query to include new fields
content = content.replace(
    '.select("id, appt_date, insurance_fee, payment_amount, patient_id',
    '.select("id, appt_date, insurance_fee, payment_amount, patient_cash_amount, insurance_claim_amount, patient_id'
)

# Update fee calculation to use new fields when available
content = content.replace(
    "const fee = ((a.insurance_fee ?? 0) > 0 ? a.insurance_fee : a.payment_amount) ?? 0;",
    """// Use new split fields if available, fallback to old fields
    const cashAmt = a.patient_cash_amount ?? a.payment_amount ?? 0;
    const insAmt  = a.insurance_claim_amount ?? a.insurance_fee ?? 0;
    const fee = insAmt > 0 ? insAmt : cashAmt;"""
)

# Also fix the visitFee calculation in unclaimed section
content = content.replace(
    "const visitFee = a.insurance_fee ?? a.payment_amount ?? 0;",
    """const cashAmt = a.patient_cash_amount ?? 0;
        const insAmt  = a.insurance_claim_amount ?? a.insurance_fee ?? 0;
        const visitFee = insAmt > 0 ? insAmt : (a.payment_amount ?? 0);"""
)

with open(filepath, "w") as f:
    f.write(content)
print("Patched finance page")
PYEOF
