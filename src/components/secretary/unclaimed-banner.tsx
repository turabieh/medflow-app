"use client";
import { useState } from "react";
import Link from "next/link";

interface Company { id:string; name:string; amount:number; count:number; from:string; to:string; }

export function UnclaimedBanner({
  count, total, currency, companies,
}: { count:number; total:number; currency:string; companies:Company[]; }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 overflow-hidden">
      {/* Header — always visible, click to expand */}
      <button onClick={()=>setOpen(o=>!o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100 transition text-left">
        <div className="flex items-center gap-3">
          <span className="text-base">🔴</span>
          <div>
            <p className="text-sm font-bold text-amber-900">
              {count} unclaimed insurance visit{count!==1?"s":""}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              <span className="font-bold">{total.toFixed(2)} {currency}</span>
              {" "}from {companies.length} compan{companies.length===1?"y":"ies"} · click to {open?"hide":"view"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/secretary/insurance-claims"
            onClick={e=>e.stopPropagation()}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition">
            Generate →
          </Link>
          <span className={`text-amber-500 text-xs transition-transform duration-200 ${open?"rotate-90":""}`}>▶</span>
        </div>
      </button>

      {/* Expandable company list */}
      {open && (
        <div className="border-t border-amber-200 divide-y divide-amber-100">
          {companies.map(co=>(
            <div key={co.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-amber-100 transition">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">
                  {co.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">{co.name}</p>
                  <p className="text-xs text-amber-600">
                    {co.count} visit{co.count!==1?"s":""} · {co.from} → {co.to}
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold text-amber-900">{co.amount.toFixed(2)} {currency}</p>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-2 bg-amber-100">
            <span className="text-xs font-bold text-amber-800">Total</span>
            <span className="text-sm font-black text-amber-900">{total.toFixed(2)} {currency}</span>
          </div>
        </div>
      )}
    </div>
  );
}
