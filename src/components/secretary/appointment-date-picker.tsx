"use client";

import { useRouter } from "next/navigation";

export function AppointmentDatePicker({ currentDate }: { currentDate: string }) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    router.push(`/secretary/appointments?date=${e.target.value}`);
  }

  return (
    <div className="mb-4 flex items-center gap-2">
      <input
        type="date"
        defaultValue={currentDate}
        onChange={handleChange}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
