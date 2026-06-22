"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/ui/logout-button";

const NAV_ITEMS = [
  { href: "/secretary/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/secretary/patients", label: "Patients", icon: "👤" },
  { href: "/secretary/appointments", label: "Appointments", icon: "📅" },
  { href: "/secretary/schedule", label: "Schedule", icon: "🗓" },
  { href: "/secretary/reports", label: "Reports & Print", icon: "🖨" },
  { href: "/secretary/settings", label: "Settings", icon: "⚙" },
];

export function SecretarySidebar({
  clinicName,
  userName,
  userRole,
}: {
  clinicName: string;
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-neutral-200 bg-white">
      {/* Clinic header */}
      <div className="border-b border-neutral-100 px-4 py-4">
        <p className="text-sm font-medium text-neutral-900 leading-tight">{clinicName}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{userName} · {userRole}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
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
