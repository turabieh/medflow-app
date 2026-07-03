"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/ui/logout-button";

// feature: null = always shown | feature: "key" = only if clinic has that feature
const NAV_ITEMS = [
  { href:"/admin/dashboard",                label:"Dashboard",             icon:"⊞", feature:null },
  { href:"/admin/clinic-page",              label:"Public Clinic Page",    icon:"🌐", feature:null },
  { href:"/admin/patients",                 label:"Patient Management",    icon:"🗂", feature:"patients" },
  { href:"/admin/settings/clinic",          label:"Clinic Settings",       icon:"⚙", feature:null },
  { href:"/admin/settings/users",           label:"User Management",       icon:"👥", feature:null },
  { href:"/admin/settings/schedules",       label:"Schedule Settings",     icon:"📅", feature:"appointments" },
  { href:"/admin/settings/visit-durations", label:"Visit Durations",       icon:"⏱", feature:"appointments" },
  { href:"/admin/settings/medications",     label:"Medications & Symptoms",icon:"💊", feature:null },
  { href:"/admin/settings/insurance",       label:"Insurance & Procedures",icon:"🏥", feature:"insurance_claims" },
  { href:"/admin/hospitals",                label:"Hospitals",             icon:"🏨", feature:"inpatients" },
  { href:"/admin/nurse-procedures",         label:"Nurse Procedures",      icon:"🩺", feature:"inpatients" },
  { href:"/admin/technician-procedures",    label:"Tech Procedures",       icon:"🔬", feature:null },
  { href:"/admin/chat-tasks",               label:"Quick Tasks",           icon:"⚡", feature:null },
  { href:"/admin/permissions",              label:"Permissions",           icon:"🔐", feature:"permissions" },
  { href:"/admin/backup",                   label:"Data Backup",           icon:"💾", feature:"data_backup" },
  { href:"/admin/finance",                  label:"Finance & Reports",     icon:"💰", feature:"finance" },
] as const;

export function AdminSidebarNav({
  clinicName, userName, logoUrl, tierKey, features = [],
}: {
  clinicName: string;
  userName: string;
  logoUrl?: string | null;
  tierKey?: string;
  features?: string[];
}) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(item =>
    item.feature === null || features.includes(item.feature)
  );

  const tierLabel = tierKey === "ai" ? "AI Plus"
    : tierKey ? tierKey.charAt(0).toUpperCase() + tierKey.slice(1)
    : null;

  const tierClass = tierKey === "ai"
    ? "bg-purple-100 text-purple-700"
    : tierKey === "professional"
    ? "bg-indigo-100 text-indigo-700"
    : "bg-neutral-100 text-neutral-500";

  return (
    <aside className="flex w-56 flex-col border-r border-neutral-200 bg-white h-screen sticky top-0">
      {/* Clinic header */}
      <div className="border-b border-neutral-100 px-4 py-4">
        {logoUrl && <img src={logoUrl} alt="logo" className="mb-2 h-10 w-auto object-contain" />}
        <p className="text-sm font-medium text-neutral-900 leading-tight">{clinicName}</p>
        {tierLabel && (
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${tierClass}`}>
            {tierLabel}
          </span>
        )}
        <p className="mt-1 text-xs text-neutral-400">{userName} · admin</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {visibleItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-neutral-100 font-medium text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-700"
              }`}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-neutral-100 p-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
