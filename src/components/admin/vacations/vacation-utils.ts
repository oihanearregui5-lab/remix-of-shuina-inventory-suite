import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWeekend,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import type { HolidayType, ShiftSlot, VacationViewMode } from "./vacation-types";

export const SHIFT_LABELS: Record<ShiftSlot, string> = {
  dia: "Día",
  tarde: "Tarde",
  noche: "Noche",
};

export const VIEW_LABELS: Record<VacationViewMode, string> = {
  day: "Diaria",
  week: "Semanal",
  month: "Mensual",
  year: "Anual",
};

export const HOLIDAY_TYPE_OPTIONS: Array<{ value: HolidayType; label: string; defaultColor: string }> = [
  { value: "festivo_nacional", label: "Festivo nacional", defaultColor: "#FF0000" },
  { value: "cierre_fabrica", label: "Cierre fábrica", defaultColor: "#FFFF00" },
  { value: "festivo_local", label: "Festivo local", defaultColor: "#F97316" },
  { value: "otro", label: "Otro", defaultColor: "#2563EB" },
];

export const getHolidayTone = (type: HolidayType) => {
  switch (type) {
    case "festivo_nacional":
      return "bg-destructive text-destructive-foreground";
    case "cierre_fabrica":
      return "bg-warning text-foreground";
    case "festivo_local":
      return "bg-accent text-accent-foreground";
    default:
      return "bg-primary/12 text-primary";
  }
};

export const getDaysForView = (anchorDate: Date, mode: VacationViewMode) => {
  if (mode === "day") {
    return [anchorDate];
  }

  if (mode === "week") {
    return eachDayOfInterval({
      start: startOfWeek(anchorDate, { weekStartsOn: 1 }),
      end: endOfWeek(anchorDate, { weekStartsOn: 1 }),
    });
  }

  if (mode === "month") {
    return eachDayOfInterval({
      start: startOfMonth(anchorDate),
      end: endOfMonth(anchorDate),
    });
  }

  return eachDayOfInterval({
    start: new Date(anchorDate.getFullYear(), 0, 1),
    end: new Date(anchorDate.getFullYear(), 11, 31),
  });
};

export const getMonthMatrix = (monthDate: Date) => {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7));
};

export const toDateKey = (date: Date) => format(date, "yyyy-MM-dd");
export const formatDayLabel = (date: Date) => format(date, "EEE d", { locale: es });
export const formatMonthLabel = (date: Date) => format(date, "MMMM yyyy", { locale: es });
export const formatLongDate = (date: Date) => format(date, "EEEE d MMMM yyyy", { locale: es });
export const sameDate = (left: Date, right: Date) => isSameDay(left, right);
export const isNonWorkingWeekend = (date: Date) => isWeekend(date);

export const getNextAnchorDate = (anchorDate: Date, mode: VacationViewMode, direction: 1 | -1) => {
  if (mode === "day") return addDays(anchorDate, direction);
  if (mode === "week") return addDays(anchorDate, direction * 7);
  if (mode === "month") return new Date(anchorDate.getFullYear(), anchorDate.getMonth() + direction, 1);
  return new Date(anchorDate.getFullYear() + direction, anchorDate.getMonth(), 1);
};

export const getContrastTextColor = (hexColor: string) => {
  const cleaned = hexColor.replace("#", "");
  const normalized = cleaned.length === 3 ? cleaned.split("").map((value) => value + value).join("") : cleaned;
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.62 ? "#111827" : "#FFFFFF";
};

export const formatHours = (value: number | null | undefined) => `${(value ?? 0).toFixed(2)} h`;
