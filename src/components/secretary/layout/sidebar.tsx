"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/ui/logout-button";

// Fixed nav — always visible to secretary
const BASE_NAV = [
  { href: "/secretary/dashboard",        label: "Dashboard",       icon: "⊞" },
  { href: "/secretary/patients",         label: "Patients",        icon: "👤" },
  { href: "/secretary/appointments",     label: "Appointments",    icon: "📅" },
  { href: "/secretary/daily-report", label: "Daily Report", icon: "📊" },
  { href: "/secretary/schedule",         label: "Schedule",        icon: "🗓" },
  { href: "/secretary/technician-schedule", label: "Tech Schedule",    icon: "🔬" },
  { href: "/secretary/reports",          label: "Reports & Print", icon: "🖨" },
  { href: "/secretary/unfinalized",       label: "Unfinalized",     icon: "⚠️" },
  { href: "/secretary/insurance-claims", label: "Insurance Claims",icon: "🏦" },
  { href: "/secretary/settings/schedules", label: "Settings",      icon: "⚙" },
];

// Extra nav items unlocked by permissions — each maps to a real page that checks the permission
const PERMISSION_NAV: { permission: string; href: string; label: string; icon: string; group?: string }[] = [
  // Finance
  { permission:"finance.access",   href:"/admin/finance",              label:"Finance & Reports",icon:"💰", group:"Extra Access"  },
  // Patients
  { permission:"patients.delete",  href:"/admin/patients",             label:"Delete Patients",  icon:"🗑", group:"Patients"     },
  // Data
  { permission:"data.backup",      href:"/admin/backup",               label:"Data Backup",      icon:"💾", group:"Data"         },
  { permission:"data.catalog",     href:"/admin/settings/medications", label:"Medications",      icon:"💊", group:"Catalogs"     },
  { permission:"data.catalog",     href:"/admin/settings/symptoms",    label:"Symptoms Catalog", icon:"🤒", group:"Catalogs"     },
  { permission:"data.catalog",     href:"/admin/settings/procedures",  label:"Procedures",       icon:"🔬", group:"Catalogs"     },
  // Schedule
  { permission:"schedule.manage",  href:"/admin/settings/schedules",   label:"Working Hours",    icon:"⏱", group:"Schedule"     },
];

export function SecretarySidebar({
  clinicName, userName, userRole, logoUrl, grantedPermissions = [],
}: {
  clinicName: string;
  userName: string;
  userRole: string;
  logoUrl?: string | null;
  grantedPermissions?: string[];
}) {
  const pathname = usePathname();

  // Build extra nav items from granted permissions (deduplicate by href)
  const seenHrefs = new Set(BASE_NAV.map(n => n.href));
  const extraNav: typeof PERMISSION_NAV = [];
  for (const item of PERMISSION_NAV) {
    if (grantedPermissions.includes(item.permission) && !seenHrefs.has(item.href)) {
      seenHrefs.add(item.href);
      extraNav.push(item);
    }
  }

  // Group extra items
  const extraGroups = [...new Set(extraNav.map(n => n.group ?? "Extra Access"))];

  const isActive = (href: string) => { const base = href.split('?')[0]; return pathname === base || pathname.startsWith(base + '/'); };

  const navLink = (item: { href: string; label: string; icon: string }) => (
    <Link key={item.href} href={item.href}
      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
        isActive(item.href)
          ? "bg-neutral-900 text-white"
          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
      }`}>
      <span className="text-base">{item.icon}</span>
      {item.label}
    </Link>
  );

  return (
    <aside className="flex w-56 flex-col border-r border-neutral-200 bg-white">
      {/* Clinic header */}
      <div className="border-b border-neutral-100 px-4 py-4">
        {logoUrl && <img src={logoUrl} alt="logo" className="mb-2 h-10 w-auto object-contain" />}
        <p className="text-sm font-medium text-neutral-900 leading-tight">{clinicName}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{userName} · {userRole}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {/* Base items */}
        {BASE_NAV.map(navLink)}

        {/* Extra items from granted permissions */}
        {extraGroups.map(group => {
          const items = extraNav.filter(n => (n.group ?? "Extra Access") === group);
          return (
            <div key={group}>
              <div className="mt-3 mb-1 px-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{group}</p>
              </div>
              {items.map(navLink)}
            </div>
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
