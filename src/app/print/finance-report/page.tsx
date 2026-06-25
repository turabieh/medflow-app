"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function FinanceReportPrintPage() {
  const searchParams = useSearchParams();
  const fromDate = searchParams.get("from") ?? "";
  const toDate   = searchParams.get("to")   ?? "";
  const currency = searchParams.get("currency") ?? "JOD";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prev = document.title; document.title = " ";
    return () => { document.title = prev; };
  }, []);

  useEffect(() => {
    if (!fromDate || !toDate) { setLoading(false); return; }
    async function load() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setData({ error: "Not authenticated." }); setLoading(false); return; }

      const clinicId = session.user.user_metadata?.clinic_id;

      // Clinic info
      const { data: clinic } = await supabase.from("clinics")
        .select("name, name_ar, logo_url, address, phone, email, tagline").limit(1).single();

      // Cash payments
      const { data: cashPayments } = await supabase.from("appointments")
        .select("payment_amount, payment_method")
        .eq("payment_confirmed", true)
        .gte("appt_date", fromDate).lte("appt_date", toDate);

      const cashTotal = (cashPayments ?? []).reduce((s, p) => s + (p.payment_amount ?? 0), 0);
      const byMethod: Record<string, number> = {};
      for (const p of cashPayments ?? []) {
        const m = p.payment_method ?? "cash";
        byMethod[m] = (byMethod[m] ?? 0) + (p.payment_amount ?? 0);
      }

      // Hospital claims paid in period
      const { data: hospClaims } = await supabase.from("hospital_claims")
        .select("total_claimed, total_paid, status, is_followup, parent_claim_id, id, hospitals(name)")
        .eq("clinic_id", clinicId ?? "").in("status", ["paid","partial"]);

      // Insurance claims paid in period
      const { data: insClaims } = await supabase.from("insurance_claims")
        .select("total_claimed, total_paid, status, is_followup, parent_claim_id, id, insurance_companies(name)")
        .eq("clinic_id", clinicId ?? "").in("status", ["paid","partial"]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hospPaid = (hospClaims ?? []).reduce((s: number, c: any) => s + (c.total_paid ?? 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insPaid  = (insClaims  ?? []).reduce((s: number, c: any) => s + (c.total_paid ?? 0), 0);

      // Outstanding
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function calcOutstanding(claims: any[]) {
        const originals = claims.filter((c: any) => !c.is_followup);
        const followUps = claims.filter((c: any) => c.is_followup);
        return originals.reduce((sum: number, orig: any) => {
          const origPaid = orig.total_paid ?? 0;
          const fuPaid   = followUps.filter((fu: any) => fu.parent_claim_id === orig.id).reduce((s: number, fu: any) => s + (fu.total_paid ?? 0), 0);
          const totalCovered = origPaid + fuPaid;
          if (totalCovered >= orig.total_claimed) {
            // check open follow-ups
            const fuOs = followUps.filter((fu: any) => fu.parent_claim_id === orig.id && fu.status !== "paid")
              .reduce((s: number, fu: any) => s + Math.max(0, (fu.total_claimed ?? 0) - (fu.total_paid ?? 0)), 0);
            return sum + fuOs;
          }
          return sum + Math.max(0, orig.total_claimed - totalCovered);
        }, 0);
      }

      const hospOutstanding = calcOutstanding(hospClaims ?? []);
      const insOutstanding  = calcOutstanding(insClaims  ?? []);

      // Expenses
      const { data: expenses } = await supabase.from("expenses")
        .select("category, amount, expense_date, description")
        .gte("expense_date", fromDate).lte("expense_date", toDate)
        .order("expense_date");

      const totalExpenses = (expenses ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
      const byCategory: Record<string, number> = {};
      for (const e of expenses ?? []) {
        byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
      }

      // Salaries
      const { data: salaries } = await supabase.from("staff_salaries")
        .select("monthly_salary, user_id, users(full_name, role)")
        .lte("effective_from", toDate).order("effective_from", { ascending: false });

      const latestSal = new Map<string, { name: string; role: string; salary: number }>();
      for (const s of salaries ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = Array.isArray(s.users) ? s.users[0] : s.users as any;
        if (!u || latestSal.has(s.user_id)) continue;
        latestSal.set(s.user_id, { name: u.full_name, role: u.role, salary: s.monthly_salary });
      }

      const from = new Date(fromDate); const to = new Date(toDate);
      const months = Math.max(1, Math.round((to.getTime() - from.getTime()) / (30 * 86400000)));
      const salaryEntries = Array.from(latestSal.values());
      const totalSalaries = salaryEntries.reduce((s, v) => s + v.salary * months, 0);

      const totalRevenue = cashTotal + hospPaid + insPaid;
      const totalCosts   = totalExpenses + totalSalaries;
      const netProfit    = totalRevenue - totalCosts;

      setData({ clinic, cashTotal, hospPaid, insPaid, totalRevenue, hospOutstanding, insOutstanding, byMethod,
        expenses: expenses ?? [], totalExpenses, byCategory, salaryEntries, totalSalaries, totalCosts, netProfit });
      setLoading(false);
    }
    load();
  }, [fromDate, toDate]);

  const printDate = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  const fmt = (n: number) => `${n.toFixed(2)} ${currency}`;

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#666" }}>Generating report...</div>;
  if (data?.error) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#c00" }}>{data.error}</div>;
  if (!data) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#c00" }}>No data.</div>;

  const { clinic, cashTotal, hospPaid, insPaid, totalRevenue, hospOutstanding, insOutstanding, byMethod,
    expenses, totalExpenses, byCategory, salaryEntries, totalSalaries, totalCosts, netProfit } = data;

  const s = {
    page:   { maxWidth:"760px", margin:"0 auto", padding:"14mm 14mm 8mm 14mm", fontFamily:"Arial, sans-serif", fontSize:"11px", color:"#111" } as React.CSSProperties,
    th:     { background:"#1a1a1a", color:"#fff", fontSize:"9px", textTransform:"uppercase" as const, padding:"6px 8px", textAlign:"left" as const, letterSpacing:"0.5px" },
    thR:    { background:"#1a1a1a", color:"#fff", fontSize:"9px", textTransform:"uppercase" as const, padding:"6px 8px", textAlign:"right" as const },
    td:     { padding:"5px 8px", fontSize:"10px", borderBottom:"1px solid #f0f0f0" },
    tdR:    { padding:"5px 8px", fontSize:"10px", borderBottom:"1px solid #f0f0f0", textAlign:"right" as const, fontFamily:"monospace" },
    tbl:    { width:"100%", borderCollapse:"collapse" as const, marginBottom:"14px", border:"1px solid #ddd" },
    secHd:  { fontSize:"9px", fontWeight:"700" as const, textTransform:"uppercase" as const, letterSpacing:"1.5px", color:"#888", padding:"8px 0 5px 0", borderBottom:"2px solid #1a1a1a", marginBottom:"8px" },
  };

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
        body { margin: 0; background: #fff; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      <div className="no-print" style={{ position:"fixed", top:"12px", right:"12px", zIndex:100, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"6px" }}>
        <button onClick={() => window.print()} style={{ background:"#1a1a1a", color:"#fff", border:"none", padding:"10px 20px", borderRadius:"6px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }}>
          Print / Save PDF
        </button>
        <span style={{ fontSize:"10px", color:"#555", background:"rgba(255,255,255,0.95)", padding:"3px 8px", borderRadius:"4px", border:"1px solid #ddd" }}>
          Enable &quot;Background graphics&quot; in print settings
        </span>
      </div>

      <div style={s.page}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" }}>
          <div style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
            {clinic?.logo_url && <img src={clinic.logo_url} alt="logo" style={{ height:"52px", width:"52px", objectFit:"contain", borderRadius:"6px" }} />}
            <div>
              <div style={{ fontSize:"15px", fontWeight:"700" }}>{clinic?.name}</div>
              {clinic?.tagline && <div style={{ fontSize:"9px", color:"#888", marginTop:"2px" }}>{clinic.tagline}</div>}
              <div style={{ fontSize:"9px", color:"#555", marginTop:"4px", lineHeight:"1.6" }}>
                {clinic?.address && <div>{clinic.address}</div>}
                {clinic?.phone   && <div>T: {clinic.phone}</div>}
              </div>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:"14px", fontWeight:"700", color:"#111" }}>FINANCIAL REPORT</div>
            <div style={{ fontSize:"10px", color:"#888", marginTop:"4px" }}>Period: {fromDate} — {toDate}</div>
            <div style={{ fontSize:"9px", color:"#aaa", marginTop:"2px" }}>Generated: {printDate}</div>
          </div>
        </div>

        {/* Dark bar */}
        <div style={{ background:"#1a1a1a", color:"#fff", padding:"5px 12px", display:"flex", justifyContent:"space-between", marginBottom:"16px", borderRadius:"2px" }}>
          <span style={{ fontSize:"10px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"2px" }}>Profit &amp; Loss Statement</span>
          <span style={{ fontSize:"10px", color:"#ccc" }}>{fromDate} → {toDate}</span>
        </div>

        {/* P&L Table */}
        <table style={s.tbl} className="data-table">
          <tbody>
            {/* INCOME */}
            <tr style={{ background:"#f8f8f8" }}>
              <td colSpan={2} style={{ ...s.td, fontWeight:"700", fontSize:"9px", textTransform:"uppercase", letterSpacing:"1px", color:"#555" }}>INCOME</td>
            </tr>
            <tr><td style={s.td}>Cash &amp; Card Payments</td><td style={{ ...s.tdR, color:"#15803d" }}>{fmt(cashTotal)}</td></tr>
            {Object.entries(byMethod).length > 1 && Object.entries(byMethod).map(([m, v]) => (
              <tr key={m} style={{ background:"#fafafa" }}>
                <td style={{ ...s.td, paddingLeft:"20px", color:"#888", fontSize:"9px" }}>↳ {m}</td>
                <td style={{ ...s.tdR, color:"#888", fontSize:"9px" }}>{fmt(v as number)}</td>
              </tr>
            ))}
            <tr><td style={s.td}>Hospital Claims Received</td><td style={{ ...s.tdR, color:"#15803d" }}>{fmt(hospPaid)}</td></tr>
            <tr><td style={s.td}>Insurance Claims Received</td><td style={{ ...s.tdR, color:"#15803d" }}>{fmt(insPaid)}</td></tr>
            <tr style={{ background:"#f0fdf4" }}>
              <td style={{ ...s.td, fontWeight:"700", fontSize:"12px" }}>Total Revenue</td>
              <td style={{ ...s.tdR, fontWeight:"800", fontSize:"13px", color:"#15803d" }}>{fmt(totalRevenue)}</td>
            </tr>

            {/* EXPENSES */}
            <tr style={{ background:"#f8f8f8" }}>
              <td colSpan={2} style={{ ...s.td, fontWeight:"700", fontSize:"9px", textTransform:"uppercase", letterSpacing:"1px", color:"#555", paddingTop:"12px" }}>EXPENSES</td>
            </tr>
            {Object.entries(byCategory).sort(([,a],[,b]) => (b as number)-(a as number)).map(([cat, amt]) => (
              <tr key={cat}><td style={s.td}>{cat}</td><td style={{ ...s.tdR, color:"#dc2626" }}>{fmt(amt as number)}</td></tr>
            ))}
            <tr style={{ background:"#fafafa" }}>
              <td style={s.td}>Staff Salaries</td><td style={{ ...s.tdR, color:"#dc2626" }}>{fmt(totalSalaries)}</td>
            </tr>
            <tr style={{ background:"#fef2f2" }}>
              <td style={{ ...s.td, fontWeight:"700", fontSize:"12px" }}>Total Costs</td>
              <td style={{ ...s.tdR, fontWeight:"800", fontSize:"13px", color:"#dc2626" }}>{fmt(totalCosts)}</td>
            </tr>

            {/* NET */}
            <tr style={{ background: netProfit >= 0 ? "#f0fdf4" : "#fef2f2" }}>
              <td style={{ ...s.td, fontWeight:"800", fontSize:"14px" }}>Net {netProfit >= 0 ? "Profit" : "Loss"}</td>
              <td style={{ ...s.tdR, fontWeight:"800", fontSize:"16px", color: netProfit >= 0 ? "#15803d" : "#dc2626" }}>
                {netProfit >= 0 ? "+" : ""}{fmt(netProfit)}
              </td>
            </tr>
            <tr>
              <td style={{ ...s.td, color:"#888", fontSize:"9px" }}>Outstanding (uncollected claims)</td>
              <td style={{ ...s.tdR, color:"#d97706", fontSize:"9px" }}>{fmt(hospOutstanding + insOutstanding)}</td>
            </tr>
          </tbody>
        </table>

        {/* Salary breakdown */}
        {salaryEntries.length > 0 && (
          <>
            <div style={s.secHd}>Staff Salaries</div>
            <table style={s.tbl} className="data-table">
              <thead><tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>Role</th>
                <th style={s.thR}>Monthly Salary</th>
              </tr></thead>
              <tbody>
                {salaryEntries.map((e: { name: string; role: string; salary: number }) => (
                  <tr key={e.name}>
                    <td style={s.td}>{e.name}</td>
                    <td style={{ ...s.td, textTransform:"capitalize" }}>{e.role}</td>
                    <td style={s.tdR}>{fmt(e.salary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Expense detail */}
        {expenses.length > 0 && (
          <>
            <div style={s.secHd}>Expense Detail</div>
            <table style={s.tbl} className="data-table">
              <thead><tr>
                <th style={s.th}>Date</th>
                <th style={s.th}>Category</th>
                <th style={s.th}>Description</th>
                <th style={s.thR}>Amount</th>
              </tr></thead>
              <tbody>
                {expenses.map((e: { expense_date: string; category: string; description: string | null; amount: number }, i: number) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={s.td}>{e.expense_date}</td>
                    <td style={s.td}>{e.category}</td>
                    <td style={{ ...s.td, color:"#666" }}>{e.description ?? "—"}</td>
                    <td style={{ ...s.tdR, color:"#dc2626" }}>{e.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop:"24px", borderTop:"1px solid #ddd", paddingTop:"10px", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div style={{ fontSize:"9px", color:"#888", lineHeight:"1.7" }}>
            <div style={{ fontWeight:"600" }}>{clinic?.name}</div>
            {clinic?.address && <div>{clinic.address}</div>}
            <div style={{ color:"#bbb", marginTop:"3px" }}>Generated: {printDate}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ width:"200px", borderTop:"1px solid #222", paddingTop:"4px", marginTop:"36px" }}>
              <div style={{ fontWeight:"700", fontSize:"10px" }}>Authorized Signature</div>
              <div style={{ fontSize:"9px", color:"#888", marginTop:"1px" }}>{clinic?.name}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
