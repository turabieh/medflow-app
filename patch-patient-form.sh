#!/bin/bash
# Patch patient-edit-form.tsx to add insurance_coverage_pct field
# Run from project root: bash patch-patient-form.sh

FILE="src/components/secretary/patient-edit-form.tsx"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. Run from project root."
  exit 1
fi

# 1. Add coverage_pct to Patient type interface
python3 << 'PYEOF'
import re

with open("src/components/secretary/patient-edit-form.tsx") as f:
    content = f.read()

# Add field to Patient type (after insurance_expiry_date or insurance_policy_number)
for old, new in [
    # Add to patient type
    ("insurance_company_id: string | null;",
     "insurance_company_id: string | null;\n  insurance_coverage_pct?: number | null;"),
    # Add state variable
    ("const [insuranceCompanyId, setInsuranceCompanyId] = useState",
     "const [coveragePct, setCoveragePct] = useState<number>(patient.insurance_coverage_pct ?? 100);\n  const [insuranceCompanyId, setInsuranceCompanyId] = useState"),
    # Add to save payload
    ("insurance_company_id: insuranceCompanyId || null,",
     "insurance_company_id: insuranceCompanyId || null,\n      insurance_coverage_pct: coveragePct,"),
]:
    if old in content:
        content = content.replace(old, new)
        print(f"Patched: {old[:50]}...")
    else:
        print(f"WARNING: Could not find: {old[:50]}...")

# Add coverage field UI after insurance company selector
# Find the insurance section and add the field
coverage_ui = '''
      {/* Insurance Coverage % */}
      {!!insuranceCompanyId && (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Insurance Coverage %
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number" min={0} max={100} step={5}
              value={coveragePct}
              onChange={e => setCoveragePct(Math.min(100, Math.max(0, Number(e.target.value))))}
              className="w-24 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold outline-none focus:border-neutral-500"
            />
            <span className="text-sm text-neutral-500">%</span>
            <div className="flex gap-1.5 flex-wrap">
              {[70, 75, 80, 85, 90, 100].map(p => (
                <button key={p} type="button" onClick={() => setCoveragePct(p)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${coveragePct === p ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-500 hover:border-neutral-500"}`}>
                  {p}%
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-neutral-400">
            {coveragePct === 100
              ? "Insurance covers 100% — patient pays nothing in cash."
              : `Insurance covers ${coveragePct}%, patient pays ${100 - coveragePct}% in cash.`}
          </p>
        </div>
      )}
'''

# Try to insert after insurance company selector
markers = [
    'setInsuranceCompanyId(e.target.value)}\n',
    'onChange={e => setInsuranceCompanyId(',
]
for marker in markers:
    idx = content.find(marker)
    if idx > -1:
        # Find the closing </div> of that section
        close_div_idx = content.find('</div>', idx)
        if close_div_idx > -1:
            # Find next field section start
            next_section = content.find('{/*', close_div_idx)
            insert_at = close_div_idx + len('</div>')
            content = content[:insert_at] + '\n' + coverage_ui + content[insert_at:]
            print("Added coverage % UI after insurance selector")
            break
    
with open("src/components/secretary/patient-edit-form.tsx", "w") as f:
    f.write(content)
print("Done patching patient-edit-form.tsx")
PYEOF
