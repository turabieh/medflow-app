"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href:"/admin/dashboard",    label:"Dashboard",         icon:"⊞", feature:null },
  { href:"/admin/clinic-page",  label:"Public Clinic Page",icon:"🌐", feature:null },
  { group:"Patients", icon:"👤", items:[
    { href:"/admin/patients",         label:"Patient Management",icon:"🗂", feature:"patients" },
    { href:"/admin/patient-analysis", label:"Patient Analysis",  icon:"📊", feature:null },
  ]},
  { group:"Finance", icon:"💰", items:[
    { href:"/admin/finance", label:"Finance & Reports", icon:"💰", feature:"finance" },
  ]},
  { group:"Clinical", icon:"🩺", items:[
    { href:"/admin/settings/medications",  label:"Medications & Symptoms", icon:"💊", feature:null },
    { href:"/admin/settings/insurance",    label:"Insurance & Procedures", icon:"🏥", feature:"insurance_claims" },
    { href:"/admin/nurse-procedures",      label:"Nurse Procedures",       icon:"🩺", feature:"inpatients" },
    { href:"/admin/technician-procedures", label:"Tech Procedures",        icon:"🔬", feature:null },
  ]},
  { group:"Hospital", icon:"🏨", items:[
    { href:"/admin/hospitals", label:"Hospitals", icon:"🏨", feature:"inpatients" },
  ]},
  { group:"Settings", icon:"⚙", items:[
    { href:"/admin/settings/clinic",          label:"Clinic Settings", icon:"⚙", feature:null },
    { href:"/admin/settings/users",           label:"User Management", icon:"👥", feature:null },
    { href:"/admin/settings/schedules",       label:"Schedules",       icon:"📅", feature:"appointments" },
    { href:"/admin/settings/visit-durations", label:"Visit Durations", icon:"⏱", feature:"appointments" },
    { href:"/admin/permissions",              label:"Permissions",     icon:"🔐", feature:"permissions" },
  ]},
  { group:"System", icon:"⚡", items:[
    { href:"/admin/chat-tasks", label:"Quick Tasks", icon:"⚡", feature:null },
    { href:"/admin/backup",     label:"Data Backup", icon:"💾", feature:"data_backup" },
  ]},
];

interface NavItem { href:string; label:string; icon:string; feature:string|null; }
interface NavGroup { group:string; icon:string; items:NavItem[]; }
type NavEntry = NavItem | NavGroup;
function isGroup(e: NavEntry): e is NavGroup { return "group" in e; }

interface Props {
  clinicName:string; userName:string; logoUrl?:string|null; tierKey?:string; features?:string[];
}

export function AdminSidebarNav({ clinicName, userName, logoUrl, features=[] }: Props) {
  const pathname = usePathname();
  const activeGroups = (NAV.filter(isGroup) as NavGroup[]).filter(g =>
    g.items.some(i => pathname === i.href || pathname.startsWith(i.href+"/"))
  ).map(g => g.group);
  const [expanded, setExpanded] = useState<string[]>(activeGroups.length>0 ? activeGroups : ["Settings"]);

  function toggle(group:string) {
    setExpanded(prev => prev.includes(group) ? prev.filter(g=>g!==group) : [...prev,group]);
  }
  function allowed(feature:string|null) { return feature===null || features.includes(feature); }
  function active(href:string) { return pathname===href || pathname.startsWith(href+"/"); }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-neutral-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-neutral-100 px-4 py-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-8 w-8 rounded-md object-cover"/>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-900 text-xs font-bold text-white">
            {clinicName.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-neutral-900">{clinicName}</p>
          <p className="truncate text-[10px] text-neutral-400">{userName}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV.map((entry) => {
          if (!isGroup(entry)) {
            if (!allowed(entry.feature)) return null;
            return (
              <Link key={entry.href} href={entry.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active(entry.href) ? "bg-neutral-900 font-medium text-white" : "text-neutral-600 hover:bg-neutral-100"
                }`}>
                <span>{entry.icon}</span>{entry.label}
              </Link>
            );
          }
          const items = entry.items.filter(it => allowed(it.feature));
          if (items.length===0) return null;
          const isOpen = expanded.includes(entry.group);
          const hasActive = items.some(it => active(it.href));
          return (
            <div key={entry.group}>
              <button onClick={()=>toggle(entry.group)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-neutral-50 ${hasActive?"text-neutral-900 font-semibold":"text-neutral-500 hover:text-neutral-700"}`}>
                <span>{entry.icon}</span>
                <span className="flex-1 text-left">{entry.group}</span>
                <span className={`text-[10px] text-neutral-400 transition-transform duration-200 ${isOpen?"rotate-90":""}`}>▶</span>
              </button>
              {isOpen && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-neutral-100 pl-3">
                  {items.map(it => (
                    <Link key={it.href} href={it.href}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                        active(it.href) ? "bg-neutral-900 font-medium text-white" : "text-neutral-600 hover:bg-neutral-100"
                      }`}>
                      <span>{it.icon}</span>{it.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-neutral-100 px-4 py-3">
        <Link href="/secretary/dashboard" className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-600">
          <span>←</span> Secretary View
        </Link>
      </div>
    </aside>
  );
}
