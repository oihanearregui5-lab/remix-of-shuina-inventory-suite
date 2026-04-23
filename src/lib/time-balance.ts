import { addDays, differenceInMinutes, endOfMonth, isWeekend, startOfMonth } from "date-fns";

export interface TimeEntryLike {
  clock_in: string;
  clock_out: string | null;
}

export interface HoursBalanceSummary {
  workedMinutes: number;
  expectedMinutes: number;
  balanceMinutes: number;
  overtimeMinutes: number;
  missingMinutes: number;
  workedDays: number;
}

export const DAILY_TARGET_MINUTES = 8 * 60;

export const getWorkedMinutes = (entry: TimeEntryLike, now = new Date()) => {
  const end = entry.clock_out ? new Date(entry.clock_out) : now;
  return Math.max(0, differenceInMinutes(end, new Date(entry.clock_in)));
};

export const formatMinutes = (minutes: number) => {
  const sign = minutes < 0 ? "-" : "";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  return `${sign}${hours}h ${remainder}m`;
};

export const countWorkingDays = (start: Date, end: Date) => {
  let cursor = new Date(start);
  let total = 0;

  while (cursor <= end) {
    if (!isWeekend(cursor)) total += 1;
    cursor = addDays(cursor, 1);
  }

  return total;
};

export const summarizeEntriesForRange = (entries: TimeEntryLike[], start: Date, end: Date, now = new Date()): HoursBalanceSummary => {
  const rangedEntries = entries.filter((entry) => {
    const clockIn = new Date(entry.clock_in);
    return clockIn >= start && clockIn <= end;
  });

  const workedMinutes = rangedEntries.reduce((total, entry) => total + getWorkedMinutes(entry, now), 0);
  const workedDays = new Set(rangedEntries.map((entry) => new Date(entry.clock_in).toDateString())).size;
  const expectedMinutes = countWorkingDays(start, end) * DAILY_TARGET_MINUTES;
  const balanceMinutes = workedMinutes - expectedMinutes;

  return {
    workedMinutes,
    expectedMinutes,
    balanceMinutes,
    overtimeMinutes: Math.max(0, balanceMinutes),
    missingMinutes: Math.max(0, -balanceMinutes),
    workedDays,
  };
};

export const summarizeCurrentMonth = (entries: TimeEntryLike[], now = new Date()) => {
  const start = startOfMonth(now);
  const end = now > endOfMonth(now) ? endOfMonth(now) : now;
  return summarizeEntriesForRange(entries, start, end, now);
};