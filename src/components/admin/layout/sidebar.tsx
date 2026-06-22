"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/ui/logout-button";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/admin/settings/clinic", label: "Clinic Settings", icon: "⚙" },
  { href: "/admin/settings/users", label: "User Management", icon: "👥" },
  { href: "/admin/settings/schedules", label: "Schedule Settings", icon: "📅" },
  { href: "/admin/settings/medications", label: "Medications & Symptoms", icon: "💊" },
  { href: "/admin/settings/insurance", label: "Insurance & Procedures", icon: "🏥" },
  { href: "/admin/finance", label: "Finance & Reports", icon: "💰" },
];

export function AdminSidebarNav({
  clinicName,
  userName,
}: {
  clinicName: string;
  userName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-neutral-200 bg-neutral-900">
      <div className="border-b border-neutral-700 px-4 py-4">
        <p className="text-sm font-medium text-white leading-tight">{clinicName}</p>
        <p className="mt-0.5 text-xs text-neutral-400">{userName} · admin</p>
      </div>

      <nav className="flex-1 py-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-neutral-700 text-white"
                  : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-700 p-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
