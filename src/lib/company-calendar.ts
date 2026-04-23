import { addDays, eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

export type CompanyDayType = "holiday" | "closure" | "workday" | "custom";
export type ShiftPeriod = "morning" | "afternoon" | "night" | "mixed";

export interface CompanyCalendarDay {
  id: string;
  calendar_date: string;
  title: string;
  day_type: string;
  color_tag: string | null;
  notes: string | null;
}

export const NATIONAL_HOLIDAYS_BY_YEAR: Record<number, Array<{ date: string; title: string }>> = {
  2026: [
    { date: "2026-01-01", title: "Año Nuevo" },
    { date: "2026-01-06", title: "Reyes" },
    { date: "2026-04-03", title: "Viernes Santo" },
    { date: "2026-05-01", title: "Día del Trabajador" },
    { date: "2026-08-15", title: "Asunción" },
    { date: "2026-10-12", title: "Fiesta Nacional" },
    { date: "2026-11-01", title: "Todos los Santos" },
    { date: "2026-12-06", title: "Constitución" },
    { date: "2026-12-08", title: "Inmaculada" },
    { date: "2026-12-25", title: "Navidad" },
  ],
};

export const buildClosureDates = (year: number, startDay = 12, endDay = 25) =>
  eachDayOfInterval({
    start: new Date(`${year}-12-${String(startDay).padStart(2, "0")}`),
    end: new Date(`${year}-12-${String(endDay).padStart(2, "0")}`),
  }).map((date) => format(date, "yyyy-MM-dd"));

export const companyDayTone: Record<string, string> = {
  holiday: "bg-destructive/15 text-destructive border-destructive/20",
  closure: "bg-secondary/25 text-secondary-foreground border-secondary/25",
  custom: "bg-primary/10 text-primary border-primary/20",
  workday: "bg-muted text-muted-foreground border-border",
};

export const shiftPeriodLabel: Record<ShiftPeriod, string> = {
  morning: "Mañana",
  afternoon: "Tarde",
  night: "Noche",
  mixed: "Mixto",
};

export const shiftPeriodTone: Record<ShiftPeriod, string> = {
  morning: "bg-info/10 text-info border-info/15",
  afternoon: "bg-warning/15 text-foreground border-warning/25",
  night: "bg-primary/10 text-primary border-primary/15",
  mixed: "bg-muted text-foreground border-border",
};

export const EXCEL_WORKER_COLORS: Record<string, string> = {
  ADRIAN: "#0EA5E9",
  AITOR: "#8B5CF6",
  ANDRIY: "#EF4444",
  FRAN: "#EF4444",
  HAMID: "#EF4444",
  JUAN: "#14B8A6",
  LYUBEN: "#EF4444",
  MANUEL: "#3B82F6",
  MISAEL: "#F59E0B",
  NELO: "#84CC16",
  OLEK: "#06B6D4",
  RAQUEL: "#F97316",
  SILVIO: "#EF4444",
};

export const normalizeWorkerName = (value: string | null | undefined) => {
  const normalized = (value ?? "")
    .toUpperCase()
    .replace("HACER", "")
    .replace(" SIL", "")
    .replace(" SM", "")
    .replace(" MS", "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.startsWith("RAQUEL")) return "RAQUEL";
  return normalized;
};

export const resolveWorkerColor = (workerName: string | null | undefined, fallback?: string | null) =>
  EXCEL_WORKER_COLORS[normalizeWorkerName(workerName)] ?? fallback ?? "#94A3B8";

export const getWeekDays = (selectedDate: Date) => {
  const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
};

export const getMonthName = (dateString: string) =>
  format(new Date(dateString), "MMMM", { locale: es });

export const matchesCalendarDate = (date: Date, dateString: string) => isSameDay(date, new Date(dateString));

export const getWeekRangeLabel = (selectedDate: Date) => {
  const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
  return `${format(start, "d MMM", { locale: es })} · ${format(end, "d MMM", { locale: es })}`;
};