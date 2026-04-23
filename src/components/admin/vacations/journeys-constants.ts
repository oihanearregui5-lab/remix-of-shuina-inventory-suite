import { getShiftsForDay, type TranstubariData } from "@/lib/transtubari-parser";

export const SHIFT_CODES = ["M", "T", "N"] as const;
export type ShiftCode = (typeof SHIFT_CODES)[number];

export const WEEKDAYS_SHORT = ["L", "M", "X", "J", "V", "S", "D"] as const;

export const SHIFT_TITLES: Record<ShiftCode, string> = {
  M: "Mañana",
  T: "Tarde",
  N: "Noche",
};

export const SHIFT_HOURS: Record<ShiftCode, string> = {
  M: "06:00–14:00",
  T: "14:00–22:00",
  N: "22:00–06:00",
};

export const getShiftsFor = (data: TranstubariData | null, date: Date) => {
  if (!data) return null;
  return getShiftsForDay(data, date.getMonth() + 1, date.getDate());
};

export const normalizeKey = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");