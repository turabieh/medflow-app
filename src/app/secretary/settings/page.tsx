import Link from "next/link";

export default function SecretarySettingsPage() {
  return (
    <div>
      <h1 className="mb-2 text-lg font-medium text-neutral-900">Settings</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Manage doctor schedules — block dates, set working hours, add one-off closures.
      </p>
      <Link
        href="/settings/schedules"
        className="inline-block rounded-lg border border-neutral-200 bg-white p-4 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50"
      >
        🗓 Doctor schedules →
      </Link>
    </div>
  );
}
