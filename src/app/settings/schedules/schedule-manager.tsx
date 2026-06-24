"use client";

import { useState } from "react";
import {
  setDoctorWorkingHours,
  addScheduleBlock,
  removeScheduleBlock,
} from "@/lib/actions/schedules";

interface Doctor {
  id: string;
  full_name: string;
}

interface WorkingHourRow {
  id: string;
  doctor_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  has_break: boolean;
  break_start: string | null;
  break_end: string | null;
}

interface BlockRow {
  id: string;
  doctor_id: string;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ScheduleManager({
  doctors,
  initialWorkingHours,
  initialBlocks,
  showWorkingHours = true,
}: {
  doctors: Doctor[];
  initialWorkingHours: WorkingHourRow[];
  initialBlocks: BlockRow[];
  showWorkingHours?: boolean;
}) {
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id ?? "");
  const [workingHours, setWorkingHours] = useState(initialWorkingHours);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [error, setError] = useState<string | null>(null);

  const doctorHours = workingHours.filter((wh) => wh.doctor_id === selectedDoctorId);
  const doctorBlocks = blocks
    .filter((b) => b.doctor_id === selectedDoctorId)
    .sort((a, b) => a.block_date.localeCompare(b.block_date));

  async function handleDayToggle(dayOfWeek: number, isWorking: boolean) {
    setError(null);
    if (isWorking) {
      const result = await setDoctorWorkingHours({
        doctorId: selectedDoctorId,
        dayOfWeek,
        isWorking: true,
        openTime: "09:00",
        closeTime: "17:00",
        hasBreak: true,
        breakStart: "12:00",
        breakEnd: "12:30",
      });
      if (!result.success) {
        setError(result.error ?? "Could not update.");
        return;
      }
      setWorkingHours((prev) => [
        ...prev.filter((wh) => !(wh.doctor_id === selectedDoctorId && wh.day_of_week === dayOfWeek)),
        {
          id: crypto.randomUUID(),
          doctor_id: selectedDoctorId,
          day_of_week: dayOfWeek,
          open_time: "09:00",
          close_time: "17:00",
          has_break: true,
          break_start: "12:00",
          break_end: "12:30",
        },
      ]);
    } else {
      const result = await setDoctorWorkingHours({
        doctorId: selectedDoctorId,
        dayOfWeek,
        isWorking: false,
      });
      if (!result.success) {
        setError(result.error ?? "Could not update.");
        return;
      }
      setWorkingHours((prev) =>
        prev.filter((wh) => !(wh.doctor_id === selectedDoctorId && wh.day_of_week === dayOfWeek))
      );
    }
  }

  async function handleTimeChange(
    dayOfWeek: number,
    field: "open_time" | "close_time" | "break_start" | "break_end",
    value: string
  ) {
    const existing = doctorHours.find((wh) => wh.day_of_week === dayOfWeek);
    if (!existing) return;

    const updated = { ...existing, [field]: value };
    setWorkingHours((prev) =>
      prev.map((wh) =>
        wh.doctor_id === selectedDoctorId && wh.day_of_week === dayOfWeek ? updated : wh
      )
    );

    await setDoctorWorkingHours({
      doctorId: selectedDoctorId,
      dayOfWeek,
      isWorking: true,
      openTime: updated.open_time,
      closeTime: updated.close_time,
      hasBreak: updated.has_break,
      breakStart: updated.break_start || undefined,
      breakEnd: updated.break_end || undefined,
    });
  }

  const [blockDate, setBlockDate] = useState("");
  const [wholeDay, setWholeDay] = useState(true);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [reason, setReason] = useState("");
  const [addingBlock, setAddingBlock] = useState(false);

  async function handleAddBlock(e: React.FormEvent) {
    e.preventDefault();
    setAddingBlock(true);
    setError(null);

    const result = await addScheduleBlock({
      doctorId: selectedDoctorId,
      blockDate,
      wholeDay,
      startTime: wholeDay ? undefined : blockStart,
      endTime: wholeDay ? undefined : blockEnd,
      reason,
    });

    setAddingBlock(false);

    if (!result.success) {
      setError(result.error ?? "Could not add block.");
      return;
    }

    setBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        doctor_id: selectedDoctorId,
        block_date: blockDate,
        start_time: wholeDay ? null : blockStart,
        end_time: wholeDay ? null : blockEnd,
        reason: reason.trim(),
      },
    ]);
    setBlockDate("");
    setBlockStart("");
    setBlockEnd("");
    setReason("");
  }

  async function handleRemoveBlock(blockId: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    const result = await removeScheduleBlock(blockId);
    if (!result.success) {
      setError(result.error ?? "Could not remove block.");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <label className="mb-1 block text-sm text-neutral-700">Doctor</label>
        <select
          value={selectedDoctorId}
          onChange={(e) => setSelectedDoctorId(e.target.value)}
          className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          {doctors.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.full_name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {showWorkingHours && (
      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-neutral-900">Weekly working hours</h2>
        <div className="space-y-2">
          {DAY_NAMES.map((dayName, dayOfWeek) => {
            const hours = doctorHours.find((wh) => wh.day_of_week === dayOfWeek);
            const isWorking = !!hours;
            return (
              <div key={dayOfWeek} className="flex items-center gap-3 border-b border-neutral-100 py-2 last:border-0">
                <label className="flex w-28 items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={isWorking}
                    onChange={(e) => handleDayToggle(dayOfWeek, e.target.checked)}
                  />
                  {dayName}
                </label>
                {isWorking && hours && (
                  <div className="flex flex-1 items-center gap-2 text-sm">
                    <input
                      type="time"
                      value={hours.open_time}
                      onChange={(e) => handleTimeChange(dayOfWeek, "open_time", e.target.value)}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                    />
                    <span className="text-neutral-400">to</span>
                    <input
                      type="time"
                      value={hours.close_time}
                      onChange={(e) => handleTimeChange(dayOfWeek, "close_time", e.target.value)}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                    />
                    {hours.has_break && (
                      <>
                        <span className="ml-2 text-xs text-neutral-400">break</span>
                        <input
                          type="time"
                          value={hours.break_start ?? ""}
                          onChange={(e) => handleTimeChange(dayOfWeek, "break_start", e.target.value)}
                          className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                        />
                        <span className="text-neutral-400">-</span>
                        <input
                          type="time"
                          value={hours.break_end ?? ""}
                          onChange={(e) => handleTimeChange(dayOfWeek, "break_end", e.target.value)}
                          className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-neutral-900">One-off closures</h2>

        <form onSubmit={handleAddBlock} className="mb-4 space-y-2 rounded-md bg-neutral-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Date</label>
              <input
                type="date"
                required
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Scope</label>
              <select
                value={wholeDay ? "whole" : "partial"}
                onChange={(e) => setWholeDay(e.target.value === "whole")}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              >
                <option value="whole">Whole day</option>
                <option value="partial">Specific time range</option>
              </select>
            </div>
          </div>

          {!wholeDay && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-neutral-600">From</label>
                <input
                  type="time"
                  required={!wholeDay}
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-600">To</label>
                <input
                  type="time"
                  required={!wholeDay}
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-neutral-600">Reason</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Public holiday, doctor traveling, conference"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={addingBlock}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {addingBlock ? "Adding..." : "Add closure"}
          </button>
        </form>

        {doctorBlocks.length === 0 ? (
          <p className="text-sm text-neutral-500">No upcoming closures for this doctor.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {doctorBlocks.map((block) => (
              <li key={block.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-neutral-900">
                    {block.block_date}
                    {block.start_time && block.end_time && (
                      <span className="text-neutral-500"> · {block.start_time}–{block.end_time}</span>
                    )}
                    {!block.start_time && <span className="text-neutral-500"> · whole day</span>}
                  </p>
                  <p className="text-xs text-neutral-500">{block.reason}</p>
                </div>
                <button
                  onClick={() => handleRemoveBlock(block.id)}
                  className="text-xs text-red-600 underline hover:text-red-800"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
