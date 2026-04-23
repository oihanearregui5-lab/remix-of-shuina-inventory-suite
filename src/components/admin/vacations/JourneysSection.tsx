import { useMemo, useState } from "react";
import { addDays, eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek, startOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { BookOpenText, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Download, Eye, FileSpreadsheet, Loader2, TriangleAlert } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranstubariData } from "@/hooks/useTranstubariData";
import {
  getShiftsForDay,
  getWorkerMonthShifts,
  getWorkerYearStats,
  type DayShifts,
  type TranstubariData,
  type Worker,
} from "@/lib/transtubari-parser";
import type { HolidayItem, VacationSlotItem, VacationViewMode, WorkerItem, WorkerYearSummaryItem } from "./vacation-types";
import { getContrastTextColor, getMonthMatrix, toDateKey } from "./vacation-utils";

interface Props {
  workers: WorkerItem[];
  holidays: HolidayItem[];
  vacationSlots: VacationSlotItem[];
  summaries: WorkerYearSummaryItem[];
  onOpenWorkerProfile: (workerId: string) => void;
}

const shiftCodes = ["M", "T", "N"] as const;
const weekDaysShort = ["L", "M", "X", "J", "V", "S", "D"];
const shiftTitles = { M: "Mañana", T: "Tarde", N: "Noche" } as const;
const shiftHours = { M: "06:00–14:00", T: "14:00–22:00", N: "22:00–06:00" } as const;

const normalizeKey = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const buildWorkerLookups = (excelWorkers: Worker[], appWorkers: WorkerItem[]) => {
  const byId = new Map(excelWorkers.map((worker) => [worker.id, worker]));
  const appByNormalized = new Map(
    appWorkers.flatMap((worker) => [
      [normalizeKey(worker.id), worker],
      [normalizeKey(worker.name), worker],
      [normalizeKey(worker.display_name), worker],
    ]),
  );

  return {
    byId,
    resolveExcelWorker: (workerId: string | null | undefined) => (workerId ? byId.get(workerId) ?? null : null),
    resolveAppWorker: (workerId: string | null | undefined) => {
      if (!workerId) return null;
      const normalized = normalizeKey(workerId);
      return appByNormalized.get(normalized) ?? null;
    },
  };
};

const JourneysSection = ({ workers, holidays, vacationSlots, summaries, onOpenWorkerProfile }: Props) => {
  const { data, loading, error } = useTranstubariData();
  const [viewMode, setViewMode] = useState<VacationViewMode>("month");
  const [anchorDate, setAnchorDate] = useState(new Date(2026, 3, 23));
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [modalWorkerId, setModalWorkerId] = useState<string | null>(null);

  const excelWorkers = data?.workers ?? [];
  const lookups = useMemo(() => buildWorkerLookups(excelWorkers, workers), [excelWorkers, workers]);
  const currentMonth = useMemo(() => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1), [anchorDate]);
  const monthGrid = useMemo(() => getMonthMatrix(currentMonth), [currentMonth]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: startOfWeek(anchorDate, { weekStartsOn: 1 }), end: endOfWeek(anchorDate, { weekStartsOn: 1 }) }), [anchorDate]);
  const dayKey = toDateKey(anchorDate);

  const holidaysByDate = useMemo(() => {
    const merged = new Map<string, { label: string; color: string | null }>();
    holidays.forEach((holiday) => merged.set(holiday.date, { label: holiday.label, color: holiday.color_hex }));
    Object.values(data?.holidays ?? {}).forEach((holiday) => merged.set(holiday.date, { label: holiday.label, color: holiday.color }));
    return merged;
  }, [data?.holidays, holidays]);

  const workerSummaries = useMemo(() => new Map(summaries.map((summary) => [summary.worker_id, summary])), [summaries]);
  const activeExcelWorker = modalWorkerId ? lookups.resolveExcelWorker(modalWorkerId) : null;
  const activeAppWorker = modalWorkerId ? lookups.resolveAppWorker(modalWorkerId) : null;

  const visibleDates = useMemo(() => {
    if (viewMode === "day") return [anchorDate];
    if (viewMode === "week") return weekDays;
    if (viewMode === "month") return monthGrid.flat();
    return eachDayOfInterval({ start: startOfYear(new Date(anchorDate.getFullYear(), 0, 1)), end: new Date(anchorDate.getFullYear(), 11, 31) });
  }, [anchorDate, monthGrid, viewMode, weekDays]);

  const getDayData = (date: Date) => {
    if (!data) return null;
    return getShiftsForDay(data, date.getMonth() + 1, date.getDate());
  };

  const getDisplayWorker = (workerId: string | null | undefined) => {
    const excelWorker = lookups.resolveExcelWorker(workerId);
    const appWorker = lookups.resolveAppWorker(workerId);
    if (!excelWorker && !appWorker) return null;

    const color = excelWorker?.color ?? appWorker?.color_hex ?? "hsl(var(--muted))";
    return {
      id: workerId ?? "",
      name: excelWorker?.name ?? appWorker?.display_name ?? appWorker?.name ?? workerId ?? "Sin asignar",
      initials: excelWorker?.initials ?? (appWorker?.display_name?.slice(0, 1).toUpperCase() ?? "?"),
      color,
      appWorkerId: appWorker?.id ?? null,
    };
  };

  const monthReading = useMemo(() => {
    if (!data) return [];

    const counts = new Map<string, { assignments: number; nights: number; special: number }>();
    monthGrid.flat().forEach((date) => {
      if (date.getMonth() !== currentMonth.getMonth()) return;
      const shifts = getShiftsForDay(data, date.getMonth() + 1, date.getDate());
      if (!shifts) return;
      const holiday = holidaysByDate.get(toDateKey(date));

      shiftCodes.forEach((code) => {
        const workerId = shifts[code];
        if (!workerId) return;
        const current = counts.get(workerId) ?? { assignments: 0, nights: 0, special: 0 };
        current.assignments += 1;
        if (code === "N") current.nights += 1;
        if (holiday || shifts[`${code}_spec`]) current.special += 1;
        counts.set(workerId, current);
      });
    });

    return Array.from(counts.entries())
      .map(([workerId, stats]) => ({ worker: getDisplayWorker(workerId), stats }))
      .filter((item): item is { worker: NonNullable<ReturnType<typeof getDisplayWorker>>; stats: { assignments: number; nights: number; special: number } } => Boolean(item.worker))
      .sort((a, b) => b.stats.assignments - a.stats.assignments);
  }, [currentMonth, data, holidaysByDate, monthGrid]);

  const coverageCount = useMemo(() => {
    if (!data) return 0;
    return monthGrid
      .flat()
      .filter((date) => date.getMonth() === currentMonth.getMonth())
      .reduce((sum, date) => {
        const shifts = getShiftsForDay(data, date.getMonth() + 1, date.getDate());
        if (!shifts) return sum;
        return sum + shiftCodes.filter((code) => Boolean(shifts[code])).length;
      }, 0);
  }, [currentMonth, data, monthGrid]);

  const visibleHolidayCount = useMemo(() => visibleDates.filter((date) => holidaysByDate.has(toDateKey(date))).length, [holidaysByDate, visibleDates]);

  const monthSummaryLabel = useMemo(() => {
    if (!data) return "Cargando turnos reales…";
    const assigned = monthGrid
      .flat()
      .filter((date) => date.getMonth() === currentMonth.getMonth())
      .reduce((sum, date) => {
        const shifts = getShiftsForDay(data, date.getMonth() + 1, date.getDate());
        if (!shifts) return sum;
        return sum + shiftCodes.filter((code) => Boolean(shifts[code]) && (!selectedWorkerId || shifts[code] === selectedWorkerId)).length;
      }, 0);
    return `${assigned} turnos asignados · ${visibleHolidayCount} festivos visibles`;
  }, [currentMonth, data, monthGrid, selectedWorkerId, visibleHolidayCount]);

  const genericSummary = useMemo(() => {
    const baseWorkers = excelWorkers.length > 0 ? excelWorkers : workers.map((worker) => ({ id: worker.id, name: worker.display_name, initials: worker.display_name.slice(0, 2), color: worker.color_hex, defaultShift: worker.shift_default, annualHours: Number(worker.annual_contract_hours) }));
    const annualHours = baseWorkers.length > 0 ? Math.round(baseWorkers.reduce((sum, worker) => sum + worker.annualHours, 0) / baseWorkers.length) : 0;
    const firstDay = new Date(anchorDate.getFullYear(), 0, 1);
    const lastDay = new Date(anchorDate.getFullYear(), 11, 31);
    const laborableDays = eachDayOfInterval({ start: firstDay, end: lastDay }).filter((date) => {
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      return !isWeekend && !holidaysByDate.has(toDateKey(date));
    }).length;

    return {
      annualHours,
      vacationDays: workers.length > 0 ? Math.round(workers.reduce((sum, worker) => sum + Number(worker.worker_vacation_days), 0) / workers.length) : 30,
      dailyHours: 8,
      holidayCount: holidaysByDate.size,
      laborableDays,
    };
  }, [anchorDate, excelWorkers, holidaysByDate, workers]);

  const warnings = useMemo(() => {
    if (!data) return workers.filter((worker) => !worker.is_active || worker.extra_vacation_reason).slice(0, 5);
    return data.vacations.slice(0, 5).map((vacation) => ({
      id: `${vacation.workerId}-${vacation.startDate}`,
      name: getDisplayWorker(vacation.workerId)?.name ?? vacation.workerId,
      note: `${vacation.type || "Ausencia"} · ${vacation.startDate}`,
    }));
  }, [data, workers]);

  const balanceLabel = useMemo(() => {
    if (!selectedWorkerId || !data) return `${excelWorkers.length || workers.length} pers.`;
    const stats = getWorkerYearStats(data, selectedWorkerId);
    return `${stats.totalHours.toFixed(0)} h`;
  }, [data, excelWorkers.length, selectedWorkerId, workers.length]);

  const periodLabel = useMemo(() => {
    if (viewMode === "day") return format(anchorDate, "d MMMM yyyy", { locale: es });
    if (viewMode === "week") return `${format(weekDays[0], "d MMM", { locale: es })} – ${format(weekDays[6], "d MMM yyyy", { locale: es })}`;
    if (viewMode === "month") return format(currentMonth, "MMMM yyyy", { locale: es });
    return String(anchorDate.getFullYear());
  }, [anchorDate, currentMonth, viewMode, weekDays]);

  const navigate = (direction: 1 | -1) => {
    if (viewMode === "day") setAnchorDate((current) => addDays(current, direction));
    if (viewMode === "week") setAnchorDate((current) => addDays(current, direction * 7));
    if (viewMode === "month") setAnchorDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
    if (viewMode === "year") setAnchorDate((current) => new Date(current.getFullYear() + direction, current.getMonth(), 1));
  };

  const openWorker = (workerId: string) => {
    setSelectedWorkerId(workerId);
    setModalWorkerId(workerId);
  };

  const exportMonth = () => {
    if (!data) return;
    const workbook = XLSX.utils.book_new();
    const rows = monthGrid.flat().map((date) => {
      const shifts = getShiftsForDay(data, date.getMonth() + 1, date.getDate());
      return {
        Fecha: format(date, "dd/MM/yyyy"),
        Festivo: holidaysByDate.get(toDateKey(date))?.label ?? "",
        Mañana: getDisplayWorker(shifts?.M)?.name ?? "",
        Tarde: getDisplayWorker(shifts?.T)?.name ?? "",
        Noche: getDisplayWorker(shifts?.N)?.name ?? "",
      };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Jornadas");
    XLSX.writeFile(workbook, `transtubari-jornadas-${format(currentMonth, "yyyy-MM")}.xlsx`);
  };

  const renderShiftPill = (shifts: DayShifts | null, code: (typeof shiftCodes)[number], compact = false) => {
    const workerId = shifts?.[code] ?? null;
    if (!workerId || (selectedWorkerId && selectedWorkerId !== workerId)) {
      return <span className={cn("italic text-muted-foreground", compact ? "text-xs" : "text-[10px]")}>—</span>;
    }

    const worker = getDisplayWorker(workerId);
    if (!worker) return <span className="text-xs text-muted-foreground">—</span>;
    const spec = shifts?.[`${code}_spec`];

    return (
      <button
        type="button"
        onClick={() => openWorker(worker.id)}
        className={cn("flex max-w-full items-center gap-2 rounded-md font-bold", compact ? "w-full justify-center px-3 py-2 text-sm" : "px-2 py-1 text-[10px]")}
        style={{ backgroundColor: worker.color, color: getContrastTextColor(worker.color) }}
      >
        <span className="truncate">{worker.name}</span>
        {spec ? <span className="rounded-sm bg-background/25 px-1.5 py-0.5 text-[9px] font-extrabold uppercase">{spec}</span> : null}
      </button>
    );
  };

  const renderWorkerYear = (worker: Worker) => {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthDate = new Date(anchorDate.getFullYear(), monthIndex, 1);
      const weeks = getMonthMatrix(monthDate);
      const monthShifts = new Set(getWorkerMonthShifts(data as TranstubariData, worker.id, monthIndex + 1).map((item) => item.day));

      return (
        <div key={monthIndex} className="rounded-lg border border-border bg-card p-3">
          <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{format(monthDate, "MMM", { locale: es })}</p>
          <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-semibold text-muted-foreground">
            {weekDaysShort.map((day) => <span key={`${monthIndex}-${day}`}>{day}</span>)}
          </div>
          <div className="mt-1 space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={`${monthIndex}-${weekIndex}`} className="grid grid-cols-7 gap-1">
                {week.map((date) => {
                  const isCurrentMonth = date.getMonth() === monthIndex;
                  const key = toDateKey(date);
                  const holiday = holidaysByDate.get(key);
                  const active = monthShifts.has(date.getDate()) && isCurrentMonth;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-[3px] text-[9px] font-semibold",
                        !isCurrentMonth && "invisible",
                        holiday && "bg-destructive text-destructive-foreground",
                        !holiday && active && "text-primary-foreground",
                        !holiday && !active && (date.getDay() === 0 || date.getDay() === 6) && "text-muted-foreground",
                      )}
                      style={active ? { backgroundColor: worker.color } : undefined}
                    >
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8">
        <div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando Excel de jornadas…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-card p-8">
        <p className="text-sm font-semibold text-foreground">No se pudo leer el Excel de jornadas.</p>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? "Faltan datos para pintar el calendario."}</p>
      </div>
    );
  }

  const modalStats = activeExcelWorker ? getWorkerYearStats(data, activeExcelWorker.id) : null;
  const modalMonthShifts = activeExcelWorker ? getWorkerMonthShifts(data, activeExcelWorker.id, currentMonth.getMonth() + 1) : [];

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-5">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Transtubari › Vacaciones › Jornadas</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h3 className="text-[26px] font-extrabold text-foreground">Vacaciones y Jornadas</h3>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">Excel 2026 conectado</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Planificación anual con turnos reales cargados desde el fichero Excel.</p>
            </div>
            <div className="inline-flex rounded-full border border-border bg-background p-1">
              <button type="button" className="rounded-full px-4 py-2 text-sm text-muted-foreground">Trabajador</button>
              <button type="button" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Administración</button>
            </div>
          </div>

          <div className="grid gap-2 rounded-xl border border-border bg-background p-2 md:grid-cols-5">
            {["Fichajes", "Calendario general", "Vacaciones", "Jornadas", "Ficha por trabajador"].map((label) => (
              <div key={label} className={cn("flex items-center justify-center rounded-lg px-3 py-3 text-sm font-medium", label === "Jornadas" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg bg-muted p-1">
              {([ ["day", "Día"], ["week", "Semana"], ["month", "Mes"], ["year", "Año"] ] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setViewMode(value)} className={cn("rounded-md px-4 py-2 text-sm font-medium text-muted-foreground", viewMode === value && "bg-card text-primary shadow-sm")}>
                  {label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center rounded-lg bg-muted p-1">
              <Button type="button" size="icon" variant="ghost" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="min-w-[180px] px-3 text-center text-sm font-bold capitalize text-foreground">{periodLabel}</div>
              <Button type="button" size="icon" variant="ghost" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>

            <Button type="button" variant="secondary" size="sm" onClick={() => setAnchorDate(new Date(data.year, new Date().getMonth(), new Date().getDate()))}>Hoy</Button>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPanelOpen((current) => !current)}>Panel</Button>
              <Button type="button" size="sm" onClick={exportMonth}><Download className="h-4 w-4" /> Exportar Excel</Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-5 py-4">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Trabajadores</span>
          <button type="button" onClick={() => setSelectedWorkerId(null)} className={cn("rounded-full border px-3 py-2 text-xs font-semibold", !selectedWorkerId ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground")}>
            Todos
          </button>
          {excelWorkers.map((worker) => (
            <button
              key={worker.id}
              type="button"
              onClick={() => openWorker(worker.id)}
              className={cn("inline-flex items-center gap-2 rounded-full border px-2 py-1.5 text-xs font-semibold", selectedWorkerId === worker.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground")}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-extrabold" style={{ backgroundColor: worker.color, color: getContrastTextColor(worker.color) }}>
                {worker.initials.slice(0, 1)}
              </span>
              {worker.name}
            </button>
          ))}
        </div>

        <div className="p-5">
          {viewMode === "month" ? (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="flex items-center gap-2 text-base font-bold text-foreground"><ClipboardList className="h-4 w-4 text-primary" /> Planificación mensual</h4>
                <p className="text-xs text-muted-foreground">{monthSummaryLabel}</p>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {weekDaysShort.map((day) => <div key={day} className="py-1">{day}</div>)}
              </div>
              {monthGrid.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((date) => {
                    const key = toDateKey(date);
                    const holiday = holidaysByDate.get(key);
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const isCurrentDay = isSameDay(date, new Date());
                    const shifts = getDayData(date);

                    return (
                      <div key={key} className={cn("grid min-h-[118px] grid-rows-[28px_1fr] overflow-hidden rounded-lg border bg-card", !isCurrentMonth && "opacity-35", isWeekend && "bg-muted/30", holiday ? "border-destructive" : "border-border", isCurrentDay && "ring-2 ring-secondary")}>
                        <div className={cn("flex items-center justify-between px-2 text-[11px] font-bold", holiday ? "bg-destructive text-destructive-foreground" : isCurrentDay ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground")}>
                          <span>{date.getDate()}</span>
                          <span className="truncate text-[10px]">{holiday?.label ?? ""}</span>
                        </div>
                        <div className="grid grid-rows-3">
                          {shiftCodes.map((code) => (
                            <div key={`${key}-${code}`} className="grid grid-cols-[18px_1fr] items-center gap-2 border-t border-dashed border-border px-2 py-1 first:border-t-0">
                              <span className="text-[9px] font-bold text-muted-foreground">{code}</span>
                              {renderShiftPill(shifts, code)}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : null}

          {viewMode === "week" ? (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <div className="grid min-w-[980px]" style={{ gridTemplateColumns: "90px repeat(7, minmax(0, 1fr))" }}>
                <div className="bg-muted" />
                {weekDays.map((date) => {
                  const holiday = holidaysByDate.get(toDateKey(date));
                  const current = isSameDay(date, new Date());
                  return (
                    <div key={date.toISOString()} className={cn("border-l border-border px-3 py-3 text-center", holiday ? "bg-destructive text-destructive-foreground" : current ? "bg-secondary text-secondary-foreground" : "bg-muted")}>
                      <div className="text-[11px] uppercase tracking-[0.14em]">{format(date, "EEE", { locale: es })}</div>
                      <div className="mt-1 text-xl font-extrabold">{format(date, "d")}</div>
                    </div>
                  );
                })}

                {shiftCodes.map((code) => (
                  <div key={code} className="contents">
                    <div className="border-t border-border bg-muted px-3 py-4 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {shiftTitles[code]}
                      <div className="mt-1 text-[10px] font-medium normal-case tracking-normal">{shiftHours[code]}</div>
                    </div>
                    {weekDays.map((date) => (
                      <div key={`${code}-${date.toISOString()}`} className={cn("flex min-h-[72px] items-center justify-center border-l border-t border-border px-3 py-3", (date.getDay() === 0 || date.getDay() === 6) && "bg-muted/20", isSameDay(date, new Date()) && "bg-secondary/20")}>
                        {renderShiftPill(getDayData(date), code, true)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {viewMode === "day" ? (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h4 className="text-2xl font-extrabold capitalize text-foreground">{format(anchorDate, "d 'de' MMMM yyyy", { locale: es })}</h4>
                  <p className="text-sm text-muted-foreground">{format(anchorDate, "EEEE", { locale: es })}{holidaysByDate.get(dayKey) ? ` · Festivo: ${holidaysByDate.get(dayKey)?.label}` : ""}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {shiftCodes.map((code) => (
                  <div key={code} className="rounded-xl border border-border bg-muted/30 p-6 text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">{shiftTitles[code]}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{shiftHours[code]}</p>
                    <div className="mt-6">{renderShiftPill(getDayData(anchorDate), code, true)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {viewMode === "year" ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const monthDate = new Date(anchorDate.getFullYear(), monthIndex, 1);
                return (
                  <button key={monthIndex} type="button" onClick={() => { setAnchorDate(monthDate); setViewMode("month"); }} className="rounded-xl border border-border bg-muted/30 p-3 text-left">
                    <p className="mb-3 text-center text-sm font-bold capitalize text-foreground">{format(monthDate, "MMMM", { locale: es })}</p>
                    <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-semibold text-muted-foreground">{weekDaysShort.map((day) => <span key={`${monthIndex}-${day}`}>{day}</span>)}</div>
                    <div className="mt-2 space-y-1">
                      {getMonthMatrix(monthDate).map((week, index) => (
                        <div key={index} className="grid grid-cols-7 gap-1">
                          {week.map((date) => {
                            const key = toDateKey(date);
                            const holiday = holidaysByDate.get(key);
                            const isCurrentMonth = date.getMonth() === monthIndex;
                            const shifts = getDayData(date);
                            const hasShift = shiftCodes.some((code) => Boolean(shifts?.[code]) && (!selectedWorkerId || shifts?.[code] === selectedWorkerId));
                            return (
                              <div key={key} className={cn("flex aspect-square items-center justify-center rounded text-[10px] font-semibold", !isCurrentMonth && "text-transparent", holiday && "bg-destructive text-destructive-foreground", !holiday && hasShift && "bg-primary/10 text-foreground", !holiday && !hasShift && (date.getDay() === 0 || date.getDay() === 6) && "text-muted-foreground")}>
                                {date.getDate()}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 border-t border-border px-5 py-5 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ClipboardList className="h-4 w-4 text-primary" /> Cobertura mensual</div><p className="mt-3 text-2xl font-extrabold text-foreground">{coverageCount}</p><p className="mt-1 text-sm text-muted-foreground">Franjas registradas en {format(currentMonth, "MMMM", { locale: es })}.</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarDays className="h-4 w-4 text-primary" /> Festivos visibles</div><p className="mt-3 text-2xl font-extrabold text-foreground">{visibleHolidayCount}</p><p className="mt-1 text-sm text-muted-foreground">Días con cierre o festivo dentro del periodo mostrado.</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Eye className="h-4 w-4 text-primary" /> Balance filtrado</div><p className="mt-3 text-2xl font-extrabold text-foreground">{balanceLabel}</p><p className="mt-1 text-sm text-muted-foreground">{selectedWorkerId ? "Horas calculadas desde el Excel del trabajador activo." : "Trabajadores disponibles en planificación."}</p></div>
        </div>

        <aside className={cn("fixed right-0 top-24 z-40 h-[75vh] w-[340px] max-w-[90vw] translate-x-full overflow-y-auto rounded-l-xl border border-border bg-card p-5 shadow-2xl transition-transform", panelOpen && "translate-x-0")}>
          <div className="mb-4 flex items-center justify-between"><h4 className="text-sm font-bold text-foreground">Panel lateral</h4><button type="button" onClick={() => setPanelOpen(false)} className="text-lg text-muted-foreground">✕</button></div>
          <section className="border-b border-dashed border-border pb-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><FileSpreadsheet className="h-4 w-4 text-primary" /> Hoja genérico</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Horas convenio</span><b className="text-foreground">{genericSummary.annualHours.toLocaleString("es-ES")} h</b></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Vacaciones estándar</span><b className="text-foreground">{genericSummary.vacationDays} días</b></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Horas por día</span><b className="text-foreground">{genericSummary.dailyHours} h</b></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Festivos contemplados</span><b className="text-foreground">{genericSummary.holidayCount}</b></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Total laborables año</span><b className="text-foreground">{genericSummary.laborableDays} días</b></div>
            </div>
          </section>
          <section className="border-b border-dashed border-border py-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><BookOpenText className="h-4 w-4 text-primary" /> Lectura del mes</div>
            <div className="space-y-3">
              {monthReading.map(({ worker, stats }) => (
                <div key={worker.id} className="flex items-center gap-3 text-sm"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: worker.color }} /><div><p className="font-semibold text-foreground">{worker.name.toUpperCase()}</p><p className="text-muted-foreground">{stats.assignments} turnos · {stats.nights} noches · {stats.special} especiales</p></div></div>
              ))}
            </div>
          </section>
          <section className="pt-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><TriangleAlert className="h-4 w-4 text-primary" /> Avisos</div>
            <div className="space-y-2">
              {warnings.length === 0 ? <p className="text-sm text-muted-foreground">Sin avisos activos.</p> : warnings.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"><span className="font-medium text-foreground">{"name" in item ? item.name : item.display_name}</span><span className="text-muted-foreground">{"note" in item ? item.note : item.extra_vacation_reason ?? "Inactivo"}</span></div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {activeExcelWorker ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-primary/35 px-4 py-8 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) setModalWorkerId(null); }}>
          <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="grid gap-4 border-b border-border px-6 py-6 md:grid-cols-[auto_1fr_auto] md:items-center" style={{ background: `linear-gradient(120deg, hsl(var(--primary)) 0%, ${activeExcelWorker.color} 180%)` }}>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/20 text-2xl font-extrabold text-white">{activeExcelWorker.initials.slice(0, 1)}</div>
              <div>
                <h4 className="text-2xl font-extrabold text-white">{activeExcelWorker.name}</h4>
                <p className="mt-1 text-sm text-white/80">Turno por defecto: {activeExcelWorker.defaultShift || "No definido"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeAppWorker?.id ? <Button type="button" variant="secondary" size="sm" onClick={() => onOpenWorkerProfile(activeAppWorker.id)}>Abrir ficha completa</Button> : null}
                <button type="button" onClick={() => setModalWorkerId(null)} className="ml-auto text-xl text-white/90">✕</button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border bg-background p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Horas anuales</p><p className="mt-2 text-2xl font-extrabold text-foreground">{(activeExcelWorker.annualHours || activeAppWorker?.annual_contract_hours || 0).toFixed(0)} h</p></div>
                <div className="rounded-xl border border-border bg-background p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Turnos asignados</p><p className="mt-2 text-2xl font-extrabold text-foreground">{modalStats?.totalShifts ?? 0}</p></div>
                <div className="rounded-xl border border-border bg-background p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Horas estimadas</p><p className="mt-2 text-2xl font-extrabold text-foreground">{modalStats?.totalHours ?? 0} h</p></div>
                <div className="rounded-xl border border-border bg-background p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Turnos especiales</p><p className="mt-2 text-2xl font-extrabold text-foreground">{modalStats?.specialShifts ?? 0}</p></div>
              </div>
              <div className="mb-6 rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-bold text-foreground">Mes activo</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {modalMonthShifts.length === 0 ? <span className="text-sm text-muted-foreground">Sin turnos este mes.</span> : modalMonthShifts.map((item) => (
                    <span key={`${item.day}-${item.shift}`} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">{item.day} · {item.shift}{item.spec ? ` · ${item.spec}` : ""}</span>
                  ))}
                </div>
              </div>
              <h5 className="mb-3 text-sm font-bold text-foreground">Calendario anual · {activeExcelWorker.name}</h5>
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{renderWorkerYear(activeExcelWorker)}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default JourneysSection;