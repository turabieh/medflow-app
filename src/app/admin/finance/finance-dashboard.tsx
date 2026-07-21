"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InsuranceClaimsManager } from "@/app/secretary/insurance-claims/insurance-claims-manager";
import { addExpense, deleteExpense, upsertStaffSalary } from "@/lib/actions/finance";

const EXPENSE_CATEGORIES = [
  "Electricity","Water","Rent","Salaries","Medical Supplies","Medications Stock",
  "Equipment Maintenance","Cleaning Services","Stationery & Office","Internet & Phone",
  "Insurance","Marketing","Software & IT","Lab & Tests","Other",
];

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Expense = { id: string; expense_date: string; category: string; description: string | null; amount: number; notes: string | null };
type StaffMember = { id: string; full_name: string; role: string };
type SalaryEntry = { name: string; role: string; salary: number };
type MonthlyPoint = { month: string; revenue: number; expenses: number; profit: number };
type UnclaimedEntry = { id: string; name: string; amount: number; count: number; earliestDate: string; latestDate: string };
type DailyPoint = { date: string; outpatient: number; inpatient: number; total: number; visits: number };
type DoctorPoint = { name: string; outpatient: number; inpatient: number; total: number; visits: number };

function fmt(n: number, currency: string) { return `${n.toFixed(2)} ${currency}`; }

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return <div className="h-2 rounded-full bg-neutral-100 mt-1"><div className={`h-2 rounded-full ${color}`} style={{ width:`${pct}%` }} /></div>;
}

function StatCard({ label, value, sub, color="text-neutral-900", highlight }: { label: string; value: string; sub?: string; color?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${highlight ? "border-red-200 bg-red-50" : "border-neutral-200 bg-white"}`}>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs font-medium text-neutral-600 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function CustomRangePicker({ fromDate, toDate, activeTab }: { fromDate: string; toDate: string; activeTab: string }) {
  const router = useRouter();
  const [from, setFrom] = useState(fromDate);
  const [to, setTo]     = useState(toDate);
  const [open, setOpen] = useState(false);
  function apply() {
    if (!from || !to) return;
    router.push(`/admin/finance?tab=${activeTab}&from=${from}&to=${to}`);
    setOpen(false);
  }
  return (
    <div className="relative flex items-center gap-2">
      <span className="text-xs text-neutral-500 font-medium">{fromDate} → {toDate}</span>
      <button onClick={() => setOpen(o => !o)}
        className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50">
        Custom range
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg space-y-3 w-64">
          <p className="text-xs font-semibold text-neutral-700">Select date range</p>
          <div className="space-y-2">
            <div><label className="mb-1 block text-[10px] text-neutral-500">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs" /></div>
            <div><label className="mb-1 block text-[10px] text-neutral-500">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={apply} className="flex-1 rounded-md bg-neutral-900 py-1.5 text-xs font-medium text-white hover:bg-neutral-800">Apply</button>
            <button onClick={() => setOpen(false)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClaimsTabContent({ companies, claims, currency, clinicId, onRefresh }: {
  companies: { id: string; name: string; name_ar: string | null; phone: string | null; email: string | null; portal_url: string | null }[];
  claims: { id: string; claim_number: string; from_date: string; to_date: string; total_claimed: number; total_paid: number | null; paid_date: string | null; status: string; notes: string | null; created_at: string; insuranceName: string; is_followup: boolean; parent_claim_id: string | null }[];
  currency: string; clinicId: string; onRefresh: () => Promise<void>;
}) {
  return <InsuranceClaimsManager insuranceCompanies={companies} claims={claims} currency={currency} clinicId={clinicId} />;
}


function PrintBtn({ report, from, to }: { report:string; from:string; to:string }) {
  return (
    <button onClick={()=>window.open(`/print/finance-intelligence?report=${report}&from=${from}&to=${to}`,"_blank")}
      className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">
      🖨 Print Report
    </button>
  );
}

// ── Finance Intelligence Center (Reports Tab) ─────────────────────────────────
function ReportsHub({ fromDate, toDate, currency, cashTotal, hospitalPaid, insurancePaid,
  totalRevenue, totalCosts, totalSalaries, netProfit, expByCategory,
  hospOutstanding, insOutstanding, monthlyTrend,
  dailyRevenue, doctorRevenue, visitTypeRevenue, monthlyRevenueTarget, inpatientRevenue,
}: {
  fromDate:string; toDate:string; currency:string;
  cashTotal:number; hospitalPaid:number; insurancePaid:number;
  totalRevenue:number; totalCosts:number; totalSalaries:number;
  netProfit:number; expByCategory:Record<string,number>;
  hospOutstanding:number; insOutstanding:number;
  monthlyTrend:MonthlyPoint[];
  dailyRevenue:DailyPoint[];
  doctorRevenue:DoctorPoint[];
  visitTypeRevenue:Record<string,number>;
  monthlyRevenueTarget:number|null;
  inpatientRevenue:number;
}) {
  const [report, setReport] = useState("daily");
  const [visitFilter, setVisitFilter] = useState<"all"|"outpatient"|"inpatient">("all");
  const [jumpDate, setJumpDate] = useState(toDate);
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const REPORTS = [
    { id:"daily",   icon:"📅", label:"Daily Pulse",       desc:"Day-by-day income" },
    { id:"compare", icon:"📊", label:"Period Comparison", desc:"Revenue vs expenses" },
    { id:"income",  icon:"💰", label:"Income Breakdown",  desc:"By source & doctor" },
    { id:"pl",      icon:"📋", label:"P&L Summary",       desc:"Profit & loss" },
    { id:"tax",     icon:"🧾", label:"Tax Estimate",      desc:"For accountant" },
  ];

  const filteredDaily = dailyRevenue.map(d => ({
    ...d,
    displayTotal: visitFilter==="outpatient" ? d.outpatient : visitFilter==="inpatient" ? d.inpatient : d.total,
  }));
  const maxDaily = Math.max(...filteredDaily.map(d=>d.displayTotal), 1);
  const jumpedDay = dailyRevenue.find(d=>d.date===jumpDate);

  const dowMap: Record<string,{total:number;count:number}> = {};
  for (const d of dailyRevenue) {
    const dow = DAYS[new Date(d.date+"T12:00:00").getDay()];
    if (!dowMap[dow]) dowMap[dow]={total:0,count:0};
    dowMap[dow].total+=d.total; dowMap[dow].count++;
  }
  const dowAvg = DAYS.map(d=>({ day:d, avg:dowMap[d]?dowMap[d].total/dowMap[d].count:0 }));
  const maxDow = Math.max(...dowAvg.map(d=>d.avg),1);

  const thisMonth = new Date().toISOString().slice(0,7);
  const thisMonthRev = monthlyTrend.find(m=>m.month===thisMonth)?.revenue??0;
  const targetPct = monthlyRevenueTarget?Math.min(Math.round(thisMonthRev/monthlyRevenueTarget*100),100):null;

  return (
    <div className="space-y-4">
      {/* Report type selector */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {REPORTS.map(r=>(
          <button key={r.id} onClick={()=>setReport(r.id)}
            className={`rounded-xl border p-3 text-left transition-all ${report===r.id?"border-neutral-900 bg-neutral-900":"border-neutral-200 bg-white hover:border-neutral-400"}`}>
            <div className="text-lg mb-1">{r.icon}</div>
            <p className={`text-xs font-semibold ${report===r.id?"text-white":"text-neutral-900"}`}>{r.label}</p>
            <p className={`text-[10px] mt-0.5 ${report===r.id?"text-neutral-300":"text-neutral-500"}`}>{r.desc}</p>
          </button>
        ))}
      </div>

      {/* ── DAILY PULSE ── */}
      {report==="daily" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-neutral-500">Show:</span>
            {(["all","outpatient","inpatient"] as const).map(f=>(
              <button key={f} onClick={()=>setVisitFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${visitFilter===f?"bg-neutral-900 text-white":"border border-neutral-300 text-neutral-600 hover:bg-neutral-50"}`}>
                {f==="all"?"All visits":f==="outpatient"?"Outpatient only":"Inpatient only"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold text-neutral-600 mb-1">Jump to date</p>
              <input type="date" value={jumpDate} onChange={e=>setJumpDate(e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"/>
            </div>
            {jumpedDay ? (
              <div className="flex gap-5 ml-2 flex-wrap">
                <div className="text-center"><p className="text-2xl font-black text-emerald-700">{fmt(jumpedDay.total,currency)}</p><p className="text-xs text-neutral-500">Total</p></div>
                <div className="text-center"><p className="text-xl font-bold text-neutral-800">{jumpedDay.visits}</p><p className="text-xs text-neutral-500">Visits</p></div>
                <div className="text-center"><p className="text-xl font-bold text-blue-700">{jumpedDay.visits>0?fmt(jumpedDay.total/jumpedDay.visits,currency):"—"}</p><p className="text-xs text-neutral-500">Avg/visit</p></div>
                <div className="text-center"><p className="text-xl font-bold text-sky-700">{fmt(jumpedDay.outpatient,currency)}</p><p className="text-xs text-neutral-500">Outpatient</p></div>
                <div className="text-center"><p className="text-xl font-bold text-violet-700">{fmt(jumpedDay.inpatient,currency)}</p><p className="text-xs text-neutral-500">Inpatient</p></div>
              </div>
            ) : <p className="text-sm text-neutral-400 ml-4">No data for this date</p>}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-sm font-semibold text-neutral-800 mb-4">Daily Revenue — {fromDate} to {toDate}</p>
            {filteredDaily.length===0 ? <p className="text-sm text-neutral-400 py-8 text-center">No data for this period</p> : (
              <div className="overflow-x-auto">
                <svg width="100%" height="220" style={{display:"block",overflow:"visible"}}>
                  {(()=>{
                    const PL=8,PR=8,PT=24,PB=30;
                    const n=filteredDaily.length;
                    const bw=Math.max(8,Math.min(40,Math.floor((800-PL-PR)/(n||1)*0.7)));
                    const slot=(800-PL-PR)/(n||1);
                    const ph=220-PT-PB;
                    return (<>
                      {[0,0.25,0.5,0.75,1].map(p=>{
                        const y=PT+ph*(1-p);
                        return <g key={p}>
                          <line x1={PL} y1={y} x2={800-PR} y2={y} stroke="#e2e8f0" strokeWidth={1}/>
                          <text x={PL-4} y={y+4} textAnchor="end" fontSize={11} fontWeight={500} fill="#64748b">{(maxDaily*p).toFixed(0)}</text>
                        </g>;
                      })}
                      {filteredDaily.map((d,i)=>{
                        const cx=PL+slot*i+slot/2;
                        const bh=d.displayTotal>0?Math.max(d.displayTotal/maxDaily*ph,4):0;
                        const by=PT+ph-bh;
                        const isJ=d.date===jumpDate;
                        const isWe=[0,6].includes(new Date(d.date+"T12:00:00").getDay());
                        return <g key={i} style={{cursor:"pointer"}} onClick={()=>setJumpDate(d.date)}>
                          {bh>0&&<rect x={cx-bw/2} y={by} width={bw} height={bh} fill={isJ?"#059669":"#34d399"} rx={3}/>}
                          {isJ&&bh>0&&<rect x={cx-bw/2-1} y={by-1} width={bw+2} height={bh+2} fill="none" stroke="#059669" strokeWidth={2} rx={4}/>}
                          {isJ&&d.displayTotal>0&&<text x={cx} y={by-6} textAnchor="middle" fontSize={13} fontWeight={700} fill="#059669">{d.displayTotal.toFixed(0)}</text>}
                          <text x={cx} y={220-6} textAnchor="middle" fontSize={11} fontWeight={isJ?700:500} fill={isJ?"#059669":isWe?"#d97706":"#64748b"}>{d.date.slice(5)}</text>
                        </g>;
                      })}
                    </>);
                  })()}
                </svg>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-sm font-semibold text-neutral-800 mb-3">📈 Best Days of Week (avg revenue)</p>
            <svg width="100%" height="180" viewBox="0 0 600 180" preserveAspectRatio="xMinYMid meet" style={{display:"block"}}>
              {(()=>{
                const PL=44,PR=8,PT=20,PB=36;
                const ph=180-PT-PB; const pw=600-PL-PR;
                const slot=pw/7; const bw=slot*0.55;
                const topVal=Math.max(...dowAvg.map(d=>d.avg));
                return (<>
                  {[0,0.5,1].map(p=>{
                    const y=PT+ph*(1-p);
                    return <g key={p}>
                      <line x1={PL} y1={y} x2={600-PR} y2={y} stroke="#f1f5f9" strokeWidth={1}/>
                      <text x={PL-4} y={y+4} textAnchor="end" fontSize={11} fontWeight={500} fill="#64748b">{(maxDow*p).toFixed(0)}</text>
                    </g>;
                  })}
                  <line x1={PL} y1={PT+ph} x2={600-PR} y2={PT+ph} stroke="#e2e8f0" strokeWidth={1.5}/>
                  {dowAvg.map((d,i)=>{
                    const cx=PL+slot*i+slot/2;
                    const bh=maxDow>0&&d.avg>0?Math.max(d.avg/maxDow*ph,4):0;
                    const by=PT+ph-bh;
                    const isTop=d.avg>0&&d.avg===topVal;
                    const isWe=i===0||i===6;
                    const fill=isTop?"#10b981":isWe?"#f59e0b":"#818cf8";
                    return <g key={i}>
                      {bh>0&&<rect x={cx-bw/2} y={by} width={bw} height={bh} fill={fill} rx={4}/>}
                      {d.avg>0&&<text x={cx} y={bh>0?by-6:PT+ph-6} textAnchor="middle" fontSize={12} fontWeight={isTop?700:500} fill={isTop?"#059669":"#475569"}>{d.avg.toFixed(0)}</text>}
                      {isTop&&<><rect x={cx-14} y={PT-16} width={28} height={12} rx={6} fill="#d1fae5"/><text x={cx} y={PT-7} textAnchor="middle" fontSize={7} fontWeight={700} fill="#059669">BEST</text></>}
                      <text x={cx} y={180-PB+14} textAnchor="middle" fontSize={13} fontWeight={isTop?700:600} fill={isTop?"#059669":isWe?"#d97706":"#374151"}>{d.day}</text>
                    </g>;
                  })}
                </>);
              })()}
            </svg>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="border-b border-neutral-100 px-4 py-3 flex justify-between">
              <p className="text-sm font-semibold text-neutral-800">Daily Detail</p>
              <span className="text-xs text-neutral-400">{filteredDaily.length} days</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-600">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-600">Day</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Outpatient</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Inpatient</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Total</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Visits</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Avg/visit</th>
                </tr></thead>
                <tbody>
                  {[...filteredDaily].reverse().map((d,i)=>(
                    <tr key={i} onClick={()=>setJumpDate(d.date)}
                      className={`border-b border-neutral-50 cursor-pointer hover:bg-neutral-50 ${d.date===jumpDate?"bg-emerald-50":""}`}>
                      <td className="px-4 py-2 font-medium text-neutral-800">{d.date}</td>
                      <td className="px-4 py-2 text-neutral-500 text-xs">{DAYS[new Date(d.date+"T12:00:00").getDay()]}</td>
                      <td className="px-4 py-2 text-right font-mono text-sky-600">{d.outpatient>0?d.outpatient.toFixed(2):"—"}</td>
                      <td className="px-4 py-2 text-right font-mono text-violet-600">{d.inpatient>0?d.inpatient.toFixed(2):"—"}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-emerald-700">{d.total.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-neutral-600">{d.visits}</td>
                      <td className="px-4 py-2 text-right text-neutral-500 text-xs">{d.visits>0?(d.total/d.visits).toFixed(2):"—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="bg-neutral-50 font-bold border-t border-neutral-200">
                  <td colSpan={2} className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right font-mono text-sky-700">{filteredDaily.reduce((s,d)=>s+d.outpatient,0).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono text-violet-700">{filteredDaily.reduce((s,d)=>s+d.inpatient,0).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono text-emerald-800">{fmt(filteredDaily.reduce((s,d)=>s+d.total,0),currency)}</td>
                  <td className="px-4 py-2 text-right">{filteredDaily.reduce((s,d)=>s+d.visits,0)}</td>
                  <td/>
                </tr></tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PERIOD COMPARISON ── */}
      {report==="compare" && (
        <div className="space-y-4">
          <div className="flex justify-end"><PrintBtn report="compare" from={fromDate} to={toDate}/></div>
          {monthlyRevenueTarget&&targetPct!==null&&(
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-neutral-800">Monthly Revenue Target</p>
                <span className="text-xs font-bold text-neutral-600">{thisMonthRev.toFixed(0)} / {monthlyRevenueTarget.toFixed(0)} {currency}</span>
              </div>
              <div className="h-4 bg-neutral-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${targetPct>=100?"bg-emerald-500":targetPct>=70?"bg-blue-500":"bg-amber-400"}`} style={{width:`${targetPct}%`}}/>
              </div>
              <p className={`text-xs mt-1 font-medium ${targetPct>=100?"text-emerald-600":targetPct>=70?"text-blue-600":"text-amber-600"}`}>{targetPct}% of monthly target</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {l:"Total Revenue", v:totalRevenue, color:"text-emerald-700",bg:"bg-emerald-50",border:"border-emerald-200"},
              {l:"Total Expenses",v:totalCosts,   color:"text-red-700",   bg:"bg-red-50",   border:"border-red-200"},
              {l:"Net Profit",    v:netProfit,    color:netProfit>=0?"text-blue-700":"text-orange-700",bg:netProfit>=0?"bg-blue-50":"bg-orange-50",border:netProfit>=0?"border-blue-200":"border-orange-200"},
              {l:"Profit Margin", v:totalRevenue>0?Math.round(netProfit/totalRevenue*100):0,color:"text-indigo-700",bg:"bg-indigo-50",border:"border-indigo-200",pct:true},
            ].map(x=>(
              <div key={x.l} className={`rounded-xl border-2 ${x.border} ${x.bg} p-4`}>
                <p className={`text-2xl font-black ${x.color}`}>{"pct" in x&&x.pct?`${x.v}%`:fmt(x.v as number,currency)}</p>
                <p className="text-xs font-medium text-neutral-600 mt-1">{x.l}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              <p className="text-sm font-semibold text-neutral-800">Monthly Revenue vs Expenses</p>
              <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500"/><span className="text-xs text-neutral-500">Revenue</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-400"/><span className="text-xs text-neutral-500">Expenses</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-400"/><span className="text-xs text-neutral-500">Net</span></div>
              </div>
            </div>
            {monthlyTrend.length===0?<p className="text-sm text-neutral-400 py-8 text-center">No data</p>:(
              <svg width="100%" height="220" viewBox="0 0 800 220" preserveAspectRatio="xMinYMid meet" style={{display:"block"}}>
                {(()=>{
                  const PL=44,PR=8,PT=20,PB=32;
                  const ph=220-PT-PB; const pw=800-PL-PR;
                  const n=monthlyTrend.length;
                  const slot=pw/n;
                  const bw=Math.max(6,Math.min(24,slot*0.28));
                  const maxVal=Math.max(...monthlyTrend.map(x=>Math.max(x.revenue,x.expenses)),1);
                  return (<>
                    {[0,0.25,0.5,0.75,1].map(p=>{
                      const y=PT+ph*(1-p);
                      return <g key={p}>
                        <line x1={PL} y1={y} x2={800-PR} y2={y} stroke="#f1f5f9" strokeWidth={1}/>
                        <text x={PL-4} y={y+4} textAnchor="end" fontSize={11} fontWeight={500} fill="#64748b">{(maxVal*p).toFixed(0)}</text>
                      </g>;
                    })}
                    <line x1={PL} y1={PT+ph} x2={800-PR} y2={PT+ph} stroke="#e2e8f0" strokeWidth={1.5}/>
                    {monthlyTrend.map((m,i)=>{
                      const cx=PL+slot*i+slot/2;
                      const rh=m.revenue>0?Math.max(m.revenue/maxVal*ph,3):0;
                      const eh=m.expenses>0?Math.max(m.expenses/maxVal*ph,3):0;
                      const profit=m.revenue-m.expenses;
                      const prh=profit!==0?Math.max(Math.abs(profit)/maxVal*ph,3):0;
                      return <g key={i}>
                        <rect x={cx-bw*1.6} y={PT+ph-rh} width={bw} height={rh} fill="#10b981" rx={2}/>
                        <rect x={cx-bw*0.5} y={PT+ph-eh} width={bw} height={eh} fill="#f87171" rx={2}/>
                        <rect x={cx+bw*0.6} y={PT+ph-prh} width={bw} height={prh} fill={profit>=0?"#60a5fa":"#fb923c"} rx={2}/>
                        <text x={cx} y={220-PB+14} textAnchor="middle" fontSize={11} fontWeight={500} fill="#475569">{m.month.slice(2)}</text>
                      </g>;
                    })}
                  </>);
                })()}
              </svg>
            )}
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="border-b border-neutral-100 px-4 py-3"><p className="text-sm font-semibold text-neutral-800">Monthly Breakdown</p></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                <th className="px-4 py-2 text-xs font-semibold text-neutral-600">Month</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Revenue</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Expenses</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Net</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Margin</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">vs prev</th>
              </tr></thead>
              <tbody>
                {monthlyTrend.map((m,i)=>{
                  const net=m.revenue-m.expenses;
                  const margin=m.revenue>0?Math.round(net/m.revenue*100):0;
                  const prev=monthlyTrend[i-1];
                  const vsPrev=prev&&prev.revenue>0?Math.round((m.revenue-prev.revenue)/prev.revenue*100):null;
                  return (
                    <tr key={i} className="border-b border-neutral-50 hover:bg-neutral-50">
                      <td className="px-4 py-2 font-medium text-neutral-800">{m.month}</td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-700">{m.revenue.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-mono text-red-600">{m.expenses.toFixed(2)}</td>
                      <td className={`px-4 py-2 text-right font-mono font-semibold ${net>=0?"text-blue-700":"text-red-700"}`}>{net>=0?"+":""}{net.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-xs text-neutral-500">{margin}%</td>
                      <td className="px-4 py-2 text-right text-xs">
                        {vsPrev!==null&&<span className={vsPrev>=0?"text-emerald-600":"text-red-600"}>{vsPrev>=0?"↑":"↓"}{Math.abs(vsPrev)}%</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── INCOME BREAKDOWN ── */}
      {report==="income" && (
        <div className="space-y-4">
          <div className="flex justify-end"><PrintBtn report="income" from={fromDate} to={toDate}/></div>
          <div className="grid grid-cols-3 gap-3">
            {[
              {l:"Cash / Card",v:cashTotal,    color:"text-emerald-700",bg:"bg-emerald-50",border:"border-emerald-200"},
              {l:"Insurance",  v:insurancePaid, color:"text-blue-700",   bg:"bg-blue-50",   border:"border-blue-200"},
              {l:"Hospital",   v:hospitalPaid,  color:"text-purple-700", bg:"bg-purple-50", border:"border-purple-200"},
            ].map(x=>(
              <div key={x.l} className={`rounded-xl border-2 ${x.border} ${x.bg} p-4 text-center`}>
                <p className={`text-2xl font-black ${x.color}`}>{fmt(x.v,currency)}</p>
                <p className="text-xs font-medium text-neutral-600 mt-1">{x.l}</p>
                <p className="text-[10px] text-neutral-400">{totalRevenue>0?Math.round(x.v/totalRevenue*100):0}% of total</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-sm font-semibold text-neutral-800 mb-3">Outpatient vs Inpatient</p>
            <div className="space-y-3">
              {[
                {l:"Outpatient",v:cashTotal,       color:"bg-sky-500",    text:"text-sky-700"},
                {l:"Inpatient", v:inpatientRevenue, color:"bg-violet-500", text:"text-violet-700"},
              ].map(x=>{
                const pct=totalRevenue>0?Math.round(x.v/totalRevenue*100):0;
                return (
                  <div key={x.l}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-neutral-700">{x.l}</span>
                      <span className={`font-bold ${x.text}`}>{fmt(x.v,currency)} ({pct}%)</span>
                    </div>
                    <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${x.color}`} style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {doctorRevenue.length>0&&(
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div className="border-b border-neutral-100 px-4 py-3"><p className="text-sm font-semibold text-neutral-800">Revenue by Doctor</p></div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-600">Doctor</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Outpatient</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Inpatient</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Total</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Visits</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Avg/visit</th>
                </tr></thead>
                <tbody>
                  {doctorRevenue.map((d,i)=>(
                    <tr key={i} className="border-b border-neutral-50 hover:bg-neutral-50">
                      <td className="px-4 py-2 font-medium text-neutral-800">{d.name}</td>
                      <td className="px-4 py-2 text-right font-mono text-sky-600">{fmt(d.outpatient,currency)}</td>
                      <td className="px-4 py-2 text-right font-mono text-violet-600">{fmt(d.inpatient,currency)}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-emerald-700">{fmt(d.total,currency)}</td>
                      <td className="px-4 py-2 text-right text-neutral-600">{d.visits}</td>
                      <td className="px-4 py-2 text-right text-neutral-500 text-xs">{d.visits>0?fmt(d.total/d.visits,currency):"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {Object.keys(visitTypeRevenue).length>0&&(
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-sm font-semibold text-neutral-800 mb-3">Revenue by Visit Type</p>
              <div className="space-y-2">
                {Object.entries(visitTypeRevenue).sort(([,a],[,b])=>b-a).map(([type,amt],i)=>{
                  const cols=["bg-indigo-500","bg-sky-500","bg-emerald-500","bg-amber-500"];
                  const maxA=Math.max(...Object.values(visitTypeRevenue),1);
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <div className="w-24 text-xs font-medium text-neutral-700 capitalize">{type}</div>
                      <div className="flex-1 h-5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${cols[i%cols.length]}`} style={{width:`${Math.max(Math.round((amt as number)/maxA*100),2)}%`}}/>
                      </div>
                      <div className="text-xs font-mono text-neutral-600 w-24 text-right">{fmt(amt as number,currency)}</div>
                      <div className="text-xs text-neutral-400 w-8">{totalRevenue>0?Math.round((amt as number)/totalRevenue*100):0}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── P&L SUMMARY ── */}
      {report==="pl" && (
        <>
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3 flex justify-between items-center">
            <p className="text-sm font-semibold text-neutral-900">Profit & Loss — {fromDate} to {toDate}</p>
<PrintBtn report="pl" from={fromDate} to={toDate}/>
          </div>
          <div className="p-4">
            <table className="w-full text-sm">
              <tbody>
                <tr><td colSpan={2} className="py-2 text-xs font-bold uppercase tracking-wide text-neutral-500">INCOME</td></tr>
                {[["Cash & Card",cashTotal],["Hospital Claims",hospitalPaid],["Insurance Claims",insurancePaid]].map(([l,v])=>(
                  <tr key={l as string} className="border-b border-neutral-50">
                    <td className="py-2 pl-4 text-neutral-700">{l as string}</td>
                    <td className="py-2 text-right font-mono text-emerald-700 font-medium">{(v as number).toFixed(2)} {currency}</td>
                  </tr>
                ))}
                <tr className="bg-emerald-50 border-b border-neutral-200">
                  <td className="py-2 pl-2 font-bold text-neutral-900">Total Revenue</td>
                  <td className="py-2 text-right font-mono font-bold text-emerald-800">{fmt(totalRevenue,currency)}</td>
                </tr>
                <tr><td colSpan={2} className="py-2 text-xs font-bold uppercase tracking-wide text-neutral-500 pt-4">EXPENSES</td></tr>
                {Object.entries(expByCategory).sort(([,a],[,b])=>b-a).map(([cat,amt])=>(
                  <tr key={cat} className="border-b border-neutral-50">
                    <td className="py-2 pl-4 text-neutral-700">{cat}</td>
                    <td className="py-2 text-right font-mono text-red-600">{amt.toFixed(2)} {currency}</td>
                  </tr>
                ))}
                <tr className="border-b border-neutral-50">
                  <td className="py-2 pl-4 text-neutral-700">Staff Salaries</td>
                  <td className="py-2 text-right font-mono text-red-600">{totalSalaries.toFixed(2)} {currency}</td>
                </tr>
                <tr className="bg-red-50 border-b border-neutral-200">
                  <td className="py-2 pl-2 font-bold text-neutral-900">Total Costs</td>
                  <td className="py-2 text-right font-mono font-bold text-red-800">{fmt(totalCosts,currency)}</td>
                </tr>
                <tr className={netProfit>=0?"bg-emerald-50":"bg-red-50"}>
                  <td className="py-3 pl-2 text-base font-bold">Net {netProfit>=0?"Profit":"Loss"}</td>
                  <td className={`py-3 text-right font-mono text-lg font-bold ${netProfit>=0?"text-emerald-800":"text-red-800"}`}>
                    {netProfit>=0?"+":""}{fmt(netProfit,currency)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pl-2 text-xs text-neutral-500">Outstanding (uncollected)</td>
                  <td className="py-2 text-right font-mono text-xs text-amber-700">{fmt(hospOutstanding+insOutstanding,currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* ── TAX ESTIMATE ── */}
      {report==="tax" && (
        <div className="space-y-4">
          <div className="flex justify-end"><PrintBtn report="tax" from={fromDate} to={toDate}/></div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="mb-1 text-sm font-semibold">Tax Estimate — {fromDate} to {toDate}</p>
            <p className="text-xs text-neutral-500 mb-4">Consult your accountant for exact rates. Jordan income tax for professionals.</p>
            <table className="w-full text-sm mb-4">
              <tbody>
                <tr className="border-b border-neutral-100"><td className="py-2 text-neutral-600">Gross Revenue</td><td className="text-right font-mono text-emerald-700 font-medium">{fmt(totalRevenue,currency)}</td></tr>
                <tr className="border-b border-neutral-100"><td className="py-2 text-neutral-600">Deductible Expenses</td><td className="text-right font-mono text-red-600">−{fmt(totalCosts,currency)}</td></tr>
                <tr className="bg-neutral-50 font-bold border-b border-neutral-200"><td className="py-2">Taxable Net Income</td><td className={`text-right font-mono ${netProfit>=0?"text-emerald-700":"text-red-700"}`}>{fmt(netProfit,currency)}</td></tr>
              </tbody>
            </table>
            <div className="grid grid-cols-3 gap-3">
              {[14,20,28].map(rate=>(
                <div key={rate} className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-center">
                  <p className="text-xs text-neutral-500 mb-2">At {rate}% rate</p>
                  <p className="text-xl font-black text-neutral-800">{fmt(Math.max(netProfit*rate/100,0),currency)}</p>
                  <p className="text-[10px] text-neutral-400 mt-1">estimated tax</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-neutral-400">⚠ Estimate only. Please consult a licensed accountant in Jordan.</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="border-b border-neutral-100 px-4 py-3"><p className="text-sm font-semibold text-neutral-800">Deductible Expenses Breakdown</p></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-600">Category</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">Amount</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600">% of Revenue</th>
              </tr></thead>
              <tbody>
                {Object.entries(expByCategory).sort(([,a],[,b])=>b-a).map(([cat,amt])=>(
                  <tr key={cat} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-4 py-2 text-neutral-700">{cat}</td>
                    <td className="px-4 py-2 text-right font-mono text-red-600">{amt.toFixed(2)} {currency}</td>
                    <td className="px-4 py-2 text-right text-xs text-neutral-400">{totalRevenue>0?Math.round(amt/totalRevenue*100):0}%</td>
                  </tr>
                ))}
                <tr className="border-b border-neutral-50 hover:bg-neutral-50">
                  <td className="px-4 py-2 text-neutral-700">Staff Salaries</td>
                  <td className="px-4 py-2 text-right font-mono text-red-600">{totalSalaries.toFixed(2)} {currency}</td>
                  <td className="px-4 py-2 text-right text-xs text-neutral-400">{totalRevenue>0?Math.round(totalSalaries/totalRevenue*100):0}%</td>
                </tr>
                <tr className="bg-neutral-50 font-bold">
                  <td className="px-4 py-2">Total Deductible</td>
                  <td className="px-4 py-2 text-right font-mono text-red-700">{fmt(totalCosts,currency)}</td>
                  <td className="px-4 py-2 text-right text-xs text-neutral-400">{totalRevenue>0?Math.round(totalCosts/totalRevenue*100):0}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main FinanceDashboard Export ──────────────────────────────────────────────
export function FinanceDashboard({
  currency, fromDate, toDate, period, tab,
  cashTotal, hospitalPaid, insurancePaid, totalRevenue,
  hospOutstanding, insOutstanding, hospWrittenOff, insWrittenOff, methodBreakdown,
  expenses, totalExpenses, expByCategory, totalSalaries, totalCosts, netProfit,
  monthlyTrend,
  dailyRevenue = [], doctorRevenue = [], visitTypeRevenue = {},
  monthlyRevenueTarget = null, inpatientRevenue = 0,
  staff, latestSalaries, clinicId,
  unclaimedInsurance, unclaimedHospital, totalUnclaimed,
  insuranceCompanies = [], claimsForTab = [],
}: {
  currency: string; fromDate: string; toDate: string; period: string; tab: string;
  cashTotal: number; hospitalPaid: number; insurancePaid: number; totalRevenue: number;
  hospOutstanding: number; insOutstanding: number; hospWrittenOff: number; insWrittenOff: number; methodBreakdown: Record<string, number>;
  expenses: Expense[]; totalExpenses: number; expByCategory: Record<string, number>;
  totalSalaries: number; totalCosts: number; netProfit: number;
  monthlyTrend: MonthlyPoint[];
  dailyRevenue?: DailyPoint[];
  doctorRevenue?: DoctorPoint[];
  visitTypeRevenue?: Record<string,number>;
  monthlyRevenueTarget?: number|null;
  inpatientRevenue?: number;
  staff: StaffMember[]; latestSalaries: SalaryEntry[]; clinicId: string;
  unclaimedInsurance: UnclaimedEntry[]; unclaimedHospital: UnclaimedEntry[]; totalUnclaimed: number;
  insuranceCompanies?: { id: string; name: string; name_ar: string | null; phone: string | null; email: string | null; portal_url: string | null }[];
  claimsForTab?: { id: string; claim_number: string; from_date: string; to_date: string; total_claimed: number; total_paid: number | null; paid_date: string | null; status: string; notes: string | null; created_at: string; insuranceName: string; is_followup: boolean; parent_claim_id: string | null }[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(tab);
  const [error, setError] = useState<string | null>(null);

  const [expDate, setExpDate]     = useState(toDate);
  const [expCat, setExpCat]       = useState(EXPENSE_CATEGORIES[0]);
  const [expDesc, setExpDesc]     = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expNotes, setExpNotes]   = useState("");
  const [addingExp, setAddingExp] = useState(false);

  const [salUserId, setSalUserId] = useState(staff[0]?.id ?? "");
  const [salAmount, setSalAmount] = useState("");
  const [salFrom, setSalFrom]     = useState(`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-01`);
  const [savingSal, setSavingSal] = useState(false);

  const PERIODS = [{ key:"week",label:"7 days"},{ key:"month",label:"This month"},{ key:"year",label:"This year"}];
  const TABS = [
    { id:"overview",  label:"Overview" },
    { id:"revenue",   label:"Revenue" },
    { id:"expenses",  label:"Expenses" },
    { id:"salaries",  label:"Staff & Salaries" },
    { id:"reports",   label:"📊 Reports" },
    { id:"cash",      label:"💵 Cash" },
    { id:"unclaimed", label:"Unclaimed Revenue 🔴" },
  ];

  type IClaim = { id: string; claim_number: string; from_date: string; to_date: string; total_claimed: number; total_paid: number | null; paid_date: string | null; status: string; notes: string | null; created_at: string; insuranceName: string; is_followup: boolean; parent_claim_id: string | null };
  type ICompany = { id: string; name: string; name_ar: string | null; phone: string | null; email: string | null; portal_url: string | null };
  const [claimsData, setClaimsData]           = useState<IClaim[]>([]);
  const [claimsCompanies, setClaimsCompanies] = useState<ICompany[]>([]);
  const [claimsLoaded, setClaimsLoaded]       = useState(false);
  const [claimsLoading, setClaimsLoading]     = useState(false);

  async function loadClaims() {
    if (claimsLoaded) return;
    setClaimsLoading(true);
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    const [{ data: cos }, { data: cls }] = await Promise.all([
      sb.from("insurance_companies").select("id,name,name_ar,phone,email,portal_url").eq("clinic_id", clinicId).eq("is_active", true).order("name"),
      sb.from("insurance_claims").select("id,claim_number,claim_seq,from_date,to_date,total_claimed,total_paid,paid_date,status,notes,created_at,is_followup,parent_claim_id,insurance_companies(name)").eq("clinic_id", clinicId).order("claim_seq", { ascending: false }),
    ]);
    setClaimsCompanies(cos ?? []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setClaimsData((cls ?? []).map((cl: any) => ({ ...cl, insuranceName: (Array.isArray(cl.insurance_companies) ? cl.insurance_companies[0] : cl.insurance_companies)?.name ?? "—" })));
    setClaimsLoaded(true);
    setClaimsLoading(false);
  }

  type CRow = { id: string; appt_date: string; payment_amount: number | null; payment_method?: string; patientName: string; doctorName: string };
  const [cashRows, setCashRows]         = useState<CRow[]>([]);
  const [cashDateFrom, setCashDateFrom] = useState(fromDate);
  const [cashDateTo, setCashDateTo]     = useState(toDate);
  const [cashLoading, setCashLoading]   = useState(false);
  const [editCashId, setEditCashId]     = useState<string | null>(null);
  const [editCashAmt, setEditCashAmt]   = useState("");
  const [cashSaving, setCashSaving]     = useState(false);
  const [cashSaved, setCashSaved]       = useState<string | null>(null);

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expAmount || parseFloat(expAmount) <= 0) { setError("Enter a valid amount."); return; }
    setAddingExp(true); setError(null);
    const result = await addExpense({ expenseDate: expDate, category: expCat, description: expDesc || undefined, amount: parseFloat(expAmount), notes: expNotes || undefined });
    setAddingExp(false);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    setExpDesc(""); setExpAmount(""); setExpNotes("");
    router.refresh();
  }

  async function handleSaveSalary(e: React.FormEvent) {
    e.preventDefault();
    if (!salAmount || parseFloat(salAmount) <= 0) { setError("Enter a valid salary."); return; }
    setSavingSal(true); setError(null);
    const result = await upsertStaffSalary({ userId: salUserId, monthlySalary: parseFloat(salAmount), effectiveFrom: salFrom });
    setSavingSal(false);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    setSalAmount(""); router.refresh();
  }

  const maxBar = Math.max(...monthlyTrend.map(m => Math.max(m.revenue, m.expenses)), 1);

  return (
    <div className="space-y-5">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5">
          {PERIODS.map(p => (
            <Link key={p.key} href={`/admin/finance?tab=${activeTab}&period=${p.key}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${period === p.key ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"}`}>
              {p.label}
            </Link>
          ))}
        </div>
        <CustomRangePicker fromDate={fromDate} toDate={toDate} activeTab={activeTab} />
      </div>

      <div className="flex gap-0 border-b border-neutral-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); if (t.id==="claims") loadClaims(); }}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === t.id ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Cash Revenue" value={fmt(cashTotal, currency)} color="text-emerald-700" sub="Confirmed payments" />
            <StatCard label="Hospital Claims" value={fmt(hospitalPaid, currency)} color="text-blue-700" sub="Paid this period" />
            <StatCard label="Insurance Claims" value={fmt(insurancePaid, currency)} color="text-purple-700" sub="Paid this period" />
            <StatCard label="Total Revenue" value={fmt(totalRevenue, currency)} color="text-emerald-800" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Expenses" value={fmt(totalExpenses, currency)} color="text-red-700" />
            <StatCard label="Staff Salaries" value={fmt(totalSalaries, currency)} color="text-orange-700" />
            <StatCard label="Total Costs" value={fmt(totalCosts, currency)} color="text-red-800" />
            <StatCard label={netProfit >= 0 ? "Net Profit" : "Net Loss"} value={fmt(Math.abs(netProfit), currency)} color={netProfit >= 0 ? "text-emerald-700" : "text-red-700"} highlight={netProfit < 0} />
          </div>
          {(hospOutstanding + insOutstanding) > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900 mb-1">Outstanding (uncollected)</p>
              <p className="text-2xl font-bold text-amber-800">{fmt(hospOutstanding + insOutstanding, currency)}</p>
              <p className="text-xs text-amber-600 mt-1">Hospital: {fmt(hospOutstanding, currency)} · Insurance: {fmt(insOutstanding, currency)}</p>
            </div>
          )}
          {monthlyTrend.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-sm font-medium text-neutral-800 mb-3">Monthly Trend</p>
              <div className="flex items-end gap-1 h-24">
                {monthlyTrend.map((m, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 gap-1">
                    <div className="w-full flex flex-col-reverse gap-0.5" style={{height:"80px"}}>
                      <div className="w-full rounded-t-sm bg-emerald-400" style={{height:`${Math.max(m.revenue/maxBar*80,2)}px`}} title={`Rev: ${m.revenue.toFixed(0)}`}/>
                    </div>
                    <span className="text-[7px] text-neutral-400">{m.month.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REVENUE TAB ── */}
      {activeTab === "revenue" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Cash / Card" value={fmt(cashTotal, currency)} color="text-emerald-700" />
            <StatCard label="Hospital Claims" value={fmt(hospitalPaid, currency)} color="text-blue-700" />
            <StatCard label="Insurance Claims" value={fmt(insurancePaid, currency)} color="text-purple-700" />
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-sm font-medium text-neutral-800 mb-3">Revenue by source</p>
            {[["Cash/Card", cashTotal, "bg-emerald-500"], ["Hospital", hospitalPaid, "bg-blue-500"], ["Insurance", insurancePaid, "bg-purple-500"]].map(([l, v, c]) => (
              <div key={l as string} className="mb-2">
                <div className="flex justify-between text-xs mb-1"><span className="text-neutral-600">{l as string}</span><span className="font-medium">{fmt(v as number, currency)}</span></div>
                <MiniBar value={v as number} max={totalRevenue} color={c as string} />
              </div>
            ))}
          </div>
          {Object.keys(methodBreakdown).length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-sm font-medium text-neutral-800 mb-3">Payment methods</p>
              {Object.entries(methodBreakdown).sort(([,a],[,b]) => b - a).map(([m, v]) => (
                <div key={m} className="mb-2">
                  <div className="flex justify-between text-xs mb-1"><span className="capitalize text-neutral-600">{m}</span><span className="font-medium">{fmt(v, currency)}</span></div>
                  <MiniBar value={v} max={cashTotal} color="bg-neutral-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── EXPENSES TAB ── */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Expenses" value={fmt(totalExpenses, currency)} color="text-red-700" />
            <StatCard label="Total Costs (incl. salaries)" value={fmt(totalCosts, currency)} color="text-red-800" />
          </div>
          <form onSubmit={handleAddExpense} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-neutral-800">Add Expense</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs text-neutral-500">Date</label>
                <input type="date" value={expDate} onChange={e=>setExpDate(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
              <div><label className="mb-1 block text-xs text-neutral-500">Category</label>
                <select value={expCat} onChange={e=>setExpCat(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                  {EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className="mb-1 block text-xs text-neutral-500">Amount ({currency})</label>
                <input type="number" min="0" step="0.01" value={expAmount} onChange={e=>setExpAmount(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" placeholder="0.00"/></div>
              <div><label className="mb-1 block text-xs text-neutral-500">Description</label>
                <input value={expDesc} onChange={e=>setExpDesc(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" placeholder="Optional"/></div>
            </div>
            <button type="submit" disabled={addingExp} className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
              {addingExp?"Adding...":"Add Expense"}
            </button>
          </form>
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="border-b border-neutral-100 px-4 py-3"><p className="text-sm font-medium text-neutral-800">Expenses this period</p></div>
            {expenses.length === 0 ? <p className="px-4 py-6 text-sm text-neutral-400">No expenses recorded.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Description</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">Amount</th>
                  <th className="px-4 py-2"/>
                </tr></thead>
                <tbody>
                  {expenses.map(e=>(
                    <tr key={e.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                      <td className="px-4 py-2 text-neutral-600 text-xs">{e.expense_date}</td>
                      <td className="px-4 py-2 text-neutral-700 text-xs">{e.category}</td>
                      <td className="px-4 py-2 text-neutral-500 text-xs">{e.description ?? "—"}</td>
                      <td className="px-4 py-2 text-right font-mono text-red-600 text-sm font-medium">{fmt(e.amount, currency)}</td>
                      <td className="px-4 py-2">
                        <button onClick={async()=>{ await deleteExpense(e.id); router.refresh(); }}
                          className="text-xs text-red-500 hover:text-red-700">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── SALARIES TAB ── */}
      {activeTab === "salaries" && (
        <div className="space-y-4">
          <form onSubmit={handleSaveSalary} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-neutral-800">Set Monthly Salary</p>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="mb-1 block text-xs text-neutral-500">Staff Member</label>
                <select value={salUserId} onChange={e=>setSalUserId(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                  {staff.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
                </select></div>
              <div><label className="mb-1 block text-xs text-neutral-500">Monthly Salary ({currency})</label>
                <input type="number" min="0" step="0.01" value={salAmount} onChange={e=>setSalAmount(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" placeholder="0.00"/></div>
              <div><label className="mb-1 block text-xs text-neutral-500">Effective From</label>
                <input type="date" value={salFrom} onChange={e=>setSalFrom(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
            </div>
            <button type="submit" disabled={savingSal} className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
              {savingSal?"Saving...":"Save Salary"}
            </button>
          </form>
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="border-b border-neutral-100 px-4 py-3"><p className="text-sm font-medium text-neutral-800">Current Salaries</p></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Role</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">Monthly</th>
              </tr></thead>
              <tbody>
                {latestSalaries.map((s,i)=>(
                  <tr key={i} className="border-b border-neutral-50">
                    <td className="px-4 py-2 font-medium text-neutral-800">{s.name}</td>
                    <td className="px-4 py-2 text-neutral-500 capitalize text-xs">{s.role}</td>
                    <td className="px-4 py-2 text-right font-mono text-neutral-800">{fmt(s.salary, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-neutral-50 font-bold border-t border-neutral-200">
                <td colSpan={2} className="px-4 py-2">Total monthly</td>
                <td className="px-4 py-2 text-right font-mono">{fmt(latestSalaries.reduce((s,x)=>s+x.salary,0), currency)}</td>
              </tr></tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── REPORTS TAB ── */}
      {activeTab === "reports" && (
        <ReportsHub
          fromDate={fromDate} toDate={toDate} currency={currency}
          cashTotal={cashTotal} hospitalPaid={hospitalPaid} insurancePaid={insurancePaid}
          totalRevenue={totalRevenue} totalCosts={totalCosts} totalSalaries={totalSalaries}
          netProfit={netProfit} expByCategory={expByCategory}
          hospOutstanding={hospOutstanding} insOutstanding={insOutstanding}
          monthlyTrend={monthlyTrend}
          dailyRevenue={dailyRevenue} doctorRevenue={doctorRevenue}
          visitTypeRevenue={visitTypeRevenue} monthlyRevenueTarget={monthlyRevenueTarget}
          inpatientRevenue={inpatientRevenue}
        />
      )}

      {/* ── CASH TAB ── */}
      {activeTab === "cash" && (
        <div className="space-y-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">From</label>
              <input type="date" value={cashDateFrom} onChange={e=>setCashDateFrom(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none"/></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">To</label>
              <input type="date" value={cashDateTo} onChange={e=>setCashDateTo(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none"/></div>
            <button disabled={cashLoading} onClick={async()=>{
              setCashLoading(true);
              try {
                const { createClient } = await import("@/lib/supabase/client");
                const sb = createClient();
                const { data, error } = await sb.from("appointments")
                  .select("id, appt_date, payment_amount, payment_method, doctor_id, patients(full_name)")
                  .eq("clinic_id", clinicId).eq("payment_confirmed", true)
                  .gte("appt_date", cashDateFrom).lte("appt_date", cashDateTo)
                  .order("appt_date", {ascending:false});
                if (error) throw error;
                // Fetch doctor names separately
                const doctorIds = [...new Set((data??[]).map((r:any)=>r.doctor_id).filter(Boolean))];
                let doctorMap: Record<string,string> = {};
                if (doctorIds.length > 0) {
                  const { data: docs } = await sb.from("users").select("id, full_name").in("id", doctorIds);
                  doctorMap = Object.fromEntries((docs??[]).map((d:any)=>[d.id, d.full_name]));
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setCashRows((data??[]).map((r:any)=>({
                  id:r.id, appt_date:r.appt_date, payment_amount:r.payment_amount,
                  payment_method:r.payment_method,
                  patientName:(Array.isArray(r.patients)?r.patients[0]:r.patients)?.full_name??"—",
                  doctorName:r.doctor_id?doctorMap[r.doctor_id]??"—":"—",
                })));
              } catch(e) {
                console.error("Cash load error:", e);
              } finally {
                setCashLoading(false);
              }
            }} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
              {cashLoading?"Loading...":"Load"}
            </button>
          </div>
          {cashRows.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div className="border-b border-neutral-100 px-4 py-3 flex justify-between items-center">
                <p className="text-sm font-medium text-neutral-800">Cash Payments</p>
                <p className="text-sm font-bold text-emerald-700">{fmt(cashRows.reduce((s,r)=>s+(r.payment_amount??0),0), currency)}</p>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Patient</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Doctor</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Method</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">Amount</th>
                  <th className="px-4 py-2 text-xs font-medium text-neutral-500">Edit</th>
                </tr></thead>
                <tbody>
                  {cashRows.map(r=>{
                    const isEditing = editCashId === r.id;
                    return (
                    <tr key={r.id} className={`border-b border-neutral-50 ${isEditing?"bg-amber-50":"hover:bg-neutral-50"}`}>
                      <td className="px-4 py-2 text-neutral-600 text-xs">{r.appt_date}</td>
                      <td className="px-4 py-2 text-neutral-800 text-sm">{r.patientName}</td>
                      <td className="px-4 py-2 text-neutral-600 text-xs">{r.doctorName}</td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <select value={editCashAmt.split("|")[1]??"cash"}
                            onChange={e=>setEditCashAmt(editCashAmt.split("|")[0]+"|"+e.target.value)}
                            className="rounded border border-neutral-300 px-2 py-1 text-xs outline-none">
                            {["cash","card","insurance","other"].map(m=><option key={m} value={m}>{m}</option>)}
                          </select>
                        ) : (
                          <span className="text-neutral-500 text-xs capitalize">{r.payment_method??"cash"}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {isEditing ? (
                          <input type="number" step="0.01" min="0"
                            value={editCashAmt.split("|")[0]}
                            onChange={e=>setEditCashAmt(e.target.value+"|"+(editCashAmt.split("|")[1]??"cash"))}
                            className="rounded border border-amber-400 px-2 py-1 text-sm w-24 text-right outline-none font-mono"/>
                        ) : (
                          <span className="font-mono text-emerald-700 font-medium">{fmt(r.payment_amount??0, currency)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button disabled={cashSaving} onClick={async()=>{
                              setCashSaving(true);
                              const amt = parseFloat(editCashAmt.split("|")[0]);
                              const method = editCashAmt.split("|")[1]??"cash";
                              if (!isNaN(amt) && amt >= 0) {
                                const { createClient } = await import("@/lib/supabase/client");
                                const sb = createClient();
                                await sb.from("appointments").update({
                                  payment_amount: amt,
                                  payment_method: method,
                                }).eq("id", r.id);
                                setCashRows(prev=>prev.map(row=>row.id===r.id?{...row,payment_amount:amt,payment_method:method}:row));
                                setCashSaved(r.id);
                                setTimeout(()=>setCashSaved(null),2000);
                              }
                              setEditCashId(null);
                              setCashSaving(false);
                            }} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50">
                              {cashSaving?"...":"Save"}
                            </button>
                            <button onClick={()=>setEditCashId(null)}
                              className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50">
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button onClick={()=>{
                            setEditCashId(r.id);
                            setEditCashAmt(`${r.payment_amount??0}|${r.payment_method??"cash"}`);
                          }} className="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800">
                            {cashSaved===r.id?"✓ Saved":"✏ Edit"}
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── UNCLAIMED TAB ── */}
      {activeTab === "unclaimed" && (
        <div className="space-y-4">
          {totalUnclaimed > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-900">Total Unclaimed Revenue</p>
              <p className="text-3xl font-black text-red-800 mt-1">{fmt(totalUnclaimed, currency)}</p>
            </div>
          )}
          {unclaimedInsurance.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div className="border-b border-neutral-100 px-4 py-3"><p className="text-sm font-semibold text-neutral-800">Insurance — Unclaimed</p></div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Company</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">Visits</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">Amount</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">Period</th>
                </tr></thead>
                <tbody>
                  {unclaimedInsurance.map(u=>(
                    <tr key={u.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                      <td className="px-4 py-2 font-medium text-neutral-800">{u.name}</td>
                      <td className="px-4 py-2 text-right text-neutral-600">{u.count}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-red-700">{fmt(u.amount, currency)}</td>
                      <td className="px-4 py-2 text-right text-xs text-neutral-400">{u.earliestDate} → {u.latestDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {unclaimedHospital.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div className="border-b border-neutral-100 px-4 py-3"><p className="text-sm font-semibold text-neutral-800">Hospitals — Unclaimed</p></div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Hospital</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">Visits</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">Amount</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">Period</th>
                </tr></thead>
                <tbody>
                  {unclaimedHospital.map(u=>(
                    <tr key={u.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                      <td className="px-4 py-2 font-medium text-neutral-800">{u.name}</td>
                      <td className="px-4 py-2 text-right text-neutral-600">{u.count}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-red-700">{fmt(u.amount, currency)}</td>
                      <td className="px-4 py-2 text-right text-xs text-neutral-400">{u.earliestDate} → {u.latestDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalUnclaimed === 0 && <p className="text-sm text-neutral-400 py-8 text-center">No unclaimed revenue found.</p>}
        </div>
      )}

      {/* ── CLAIMS TAB ── */}
      {activeTab === "claims" && (
        <div>
          {claimsLoading && <p className="text-sm text-neutral-400">Loading claims...</p>}
          {claimsLoaded && (
            <ClaimsTabContent
              companies={claimsCompanies} claims={claimsData}
              currency={currency} clinicId={clinicId}
              onRefresh={async()=>{ setClaimsLoaded(false); await loadClaims(); }}
            />
          )}
          {!claimsLoaded && !claimsLoading && (
            <button onClick={loadClaims} className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">Load Claims</button>
          )}
        </div>
      )}
    </div>
  );
}
