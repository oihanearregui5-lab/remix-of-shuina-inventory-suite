import { useMemo, useState } from "react";
import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isToday, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { BookOpenText, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Download, Eye, FileSpreadsheet, TriangleAlert } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HolidayItem, VacationSlotItem, VacationViewMode, WorkerItem, WorkerYearSummaryItem } from "./vacation-types";
import { getContrastTextColor, getMonthMatrix, toDateKey } from "./vacation-utils";

interface Props {
  workers: WorkerItem[];
  holidays: HolidayItem[];
  vacationSlots: VacationSlotItem[];
  summaries: WorkerYearSummaryItem[];
  onOpenWorkerProfile: (workerId: string) => void;
}

const shiftOrder = ["dia", "tarde", "noche"] as const;
const shiftShortLabel = { dia: "M", tarde: "T", noche: "N" } as const;
const shiftLongLabel = { dia: "Mañana", tarde: "Tarde", noche: "Noche" } as const;
const shiftHours = { dia: "06:00–14:00", tarde: "14:00–22:00", noche: "22:00–06:00" } as const;
const weekDaysShort = ["L", "M", "X", "J", "V", "S", "D"];

const JourneysSection = ({ workers, holidays, vacationSlots, summaries, onOpenWorkerProfile }: Props) => {
  const [viewMode, setViewMode] = useState<VacationViewMode>("month");
  const [anchorDate, setAnchorDate] = useState(new Date(2026, 3, 23));
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [modalWorkerId, setModalWorkerId] = useState<string | null>(null);

  const workersById = useMemo(() => new Map(workers.map((worker) => [worker.id, worker])), [workers]);
  const summariesByWorkerId = useMemo(() => new Map(summaries.map((summary) => [summary.worker_id, summary])), [summaries]);
  const holidaysByDate = useMemo(() => new Map(holidays.map((holiday) => [holiday.date, holiday])), [holidays]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Partial<Record<(typeof shiftOrder)[number], VacationSlotItem>>>();
    vacationSlots.forEach((slot) => {
      const existing = map.get(slot.date) ?? {};
      existing[slot.shift] = slot;
      map.set(slot.date, existing);
    });
    return map;
  }, [vacationSlots]);

  const activeWorkers = useMemo(() => workers.filter((worker) => worker.is_active), [workers]);
  const currentMonth = useMemo(() => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1), [anchorDate]);
  const monthGrid = useMemo(() => getMonthMatrix(currentMonth), [currentMonth]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: startOfWeek(anchorDate, { weekStartsOn: 1 }), end: endOfWeek(anchorDate, { weekStartsOn: 1 }) }), [anchorDate]);
  const dayKey = toDateKey(anchorDate);
  const modalWorker = modalWorkerId ? workersById.get(modalWorkerId) ?? null : null;

  const visibleDates = useMemo(() => {
    if (viewMode === "day") return [anchorDate];
    if (viewMode === "week") return weekDays;
    if (viewMode === "month") return monthGrid.flat();
    return eachDayOfInterval({ start: startOfYear(new Date(anchorDate.getFullYear(), 0, 1)), end: new Date(anchorDate.getFullYear(), 11, 31) });
  }, [anchorDate, monthGrid, viewMode, weekDays]);

  const monthReading = useMemo(() => {
    const counts = new Map<string, { assignments: number; special: number; nights: number }>();

    monthGrid.flat().forEach((date) => {
      if (date.getMonth() !== currentMonth.getMonth()) return;
      const key = toDateKey(date);
      const dailySlots = slotsByDate.get(key);
      if (!dailySlots) return;

      shiftOrder.forEach((shift) => {
        const slot = dailySlots[shift];
        if (!slot) return;
        const stats = counts.get(slot.worker_id) ?? { assignments: 0, special: 0, nights: 0 };
        stats.assignments += 1;
        if (shift === "noche") stats.nights += 1;
        if (holidaysByDate.has(key)) stats.special += 1;
        counts.set(slot.worker_id, stats);
      });
    });

    return Array.from(counts.entries())
      .map(([workerId, stats]) => ({ worker: workersById.get(workerId), stats }))
      .filter((item): item is { worker: WorkerItem; stats: { assignments: number; special: number; nights: number } } => Boolean(item.worker))
      .sort((left, right) => right.stats.assignments - left.stats.assignments);
  }, [currentMonth, holidaysByDate, monthGrid, slotsByDate, workersById]);

  const genericSummary = useMemo(() => {
    const annualHours = activeWorkers.length > 0 ? Math.round(activeWorkers.reduce((sum, worker) => sum + worker.annual_contract_hours, 0) / activeWorkers.length) : 0;
    const vacationDays = activeWorkers.length > 0 ? Math.round(activeWorkers.reduce((sum, worker) => sum + worker.worker_vacation_days, 0) / activeWorkers.length) : 0;
    const targetYear = anchorDate.getFullYear();
    const firstDay = new Date(targetYear, 0, 1);
    const lastDay = new Date(targetYear, 11, 31);
    const laborableDays = eachDayOfInterval({ start: firstDay, end: lastDay }).filter((date) => {
      const key = toDateKey(date);
      const isWeekendDay = date.getDay() === 0 || date.getDay() === 6;
      return !isWeekendDay && !holidaysByDate.has(key);
    }).length;

    return {
      annualHours,
      vacationDays,
      dailyHours: 8,
      holidayCount: holidays.filter((holiday) => new Date(holiday.date).getFullYear() === targetYear).length,
      laborableDays,
    };
  }, [activeWorkers, anchorDate, holidays, holidaysByDate]);

  const warnings = useMemo(
    () => workers.filter((worker) => !worker.is_active || worker.extra_vacation_reason).slice(0, 5),
    [workers],
  );

  const coverageCount = useMemo(
    () => vacationSlots.filter((slot) => new Date(slot.date).getMonth() === currentMonth.getMonth() && new Date(slot.date).getFullYear() === currentMonth.getFullYear()).length,
    [currentMonth, vacationSlots],
  );

  const visibleHolidayCount = useMemo(() => visibleDates.filter((date) => holidaysByDate.has(toDateKey(date))).length, [holidaysByDate, visibleDates]);

  const balanceLabel = useMemo(() => {
    if (!selectedWorkerId) return `${workers.length} pers.`;
    const summary = summariesByWorkerId.get(selectedWorkerId);
    return `${((summary?.remaining_hours ?? 0) || 0).toFixed(2)} h`;
  }, [selectedWorkerId, summariesByWorkerId, workers.length]);

  const monthSummaryLabel = useMemo(() => {
    const assigned = monthGrid
      .flat()
      .filter((date) => date.getMonth() === currentMonth.getMonth())
      .reduce((sum, date) => {
        const daySlots = slotsByDate.get(toDateKey(date));
        return sum + shiftOrder.filter((shift) => Boolean(daySlots?.[shift]) && (!selectedWorkerId || daySlots?.[shift]?.worker_id === selectedWorkerId)).length;
      }, 0);

    return `${assigned} turnos asignados · ${visibleHolidayCount} festivos visibles`;
  }, [currentMonth, monthGrid, selectedWorkerId, slotsByDate, visibleHolidayCount]);

  const periodLabel = useMemo(() => {
    if (viewMode === "day") return format(anchorDate, "d MMMM yyyy", { locale: es });
    if (viewMode === "week") return `${format(weekDays[0], "d MMM", { locale: es })} – ${format(weekDays[6], "d MMM yyyy", { locale: es })}`;
    if (viewMode === "month") return format(currentMonth, "MMMM yyyy", { locale: es });
    return String(anchorDate.getFullYear());
  }, [anchorDate, currentMonth, viewMode, weekDays]);

  const todayBadge = useMemo(() => format(new Date(), "EEEE d MMMM yyyy", { locale: es }), []);

  const navigate = (direction: 1 | -1) => {
    if (viewMode === "day") setAnchorDate((current) => addDays(current, direction));
    if (viewMode === "week") setAnchorDate((current) => addDays(current, direction * 7));
    if (viewMode === "month") setAnchorDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
    if (viewMode === "year") setAnchorDate((current) => new Date(current.getFullYear() + direction, current.getMonth(), 1));
  };

  const exportMonth = () => {
    const workbook = XLSX.utils.book_new();
    const rows = monthGrid.flat().map((date) => {
      const key = toDateKey(date);
      const daySlots = slotsByDate.get(key);

      return {
        Fecha: format(date, "dd/MM/yyyy"),
        Festivo: holidaysByDate.get(key)?.label ?? "",
        Mañana: daySlots?.dia ? workersById.get(daySlots.dia.worker_id)?.display_name ?? "" : "",
        Tarde: daySlots?.tarde ? workersById.get(daySlots.tarde.worker_id)?.display_name ?? "" : "",
        Noche: daySlots?.noche ? workersById.get(daySlots.noche.worker_id)?.display_name ?? "" : "",
      };
    });

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Jornadas");
    XLSX.writeFile(workbook, `transtubari-jornadas-${format(currentMonth, "yyyy-MM")}.xlsx`);
  };

  const handleWorkerChip = (workerId: string) => {
    if (selectedWorkerId === workerId) {
      setModalWorkerId(workerId);
      return;
    }
    setSelectedWorkerId(workerId);
  };

  const renderWorkerPill = (slot: VacationSlotItem | undefined, compact = false) => {
    if (!slot) return <span className={cn("italic text-muted-foreground", compact ? "text-[12px]" : "text-[10px]")}>sin asignar</span>;

    const worker = workersById.get(slot.worker_id);
    if (!worker) return null;

    return (
      <button
        type="button"
        onClick={() => setModalWorkerId(worker.id)}
        className={cn("truncate rounded-md font-bold uppercase tracking-[0.04em]", compact ? "w-full px-3 py-2 text-[13px]" : "px-2 py-1 text-[10px]")}
        style={{ backgroundColor: worker.color_hex, color: getContrastTextColor(worker.color_hex) }}
      >
        {worker.display_name}
      </button>
    );
  };

  const renderWorkerYear = (worker: WorkerItem) => {
    const workerDates = new Set(vacationSlots.filter((slot) => slot.worker_id === worker.id).map((slot) => slot.date));

    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthDate = new Date(anchorDate.getFullYear(), monthIndex, 1);
      const weeks = getMonthMatrix(monthDate);

      return (
        <div key={monthIndex} className="rounded-lg border border-border bg-card p-3">
          <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {format(monthDate, "MMM", { locale: es })}
          </p>
          <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-semibold text-muted-foreground">
            {weekDaysShort.map((day) => <span key={`${monthIndex}-${day}`}>{day}</span>)}
          </div>
          <div className="mt-1 space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={`${monthIndex}-${weekIndex}`} className="grid grid-cols-7 gap-1">
                {week.map((date) => {
                  const key = toDateKey(date);
                  const holiday = holidaysByDate.get(key);
                  const isCurrentMonth = date.getMonth() === monthIndex;
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const hasVacation = workerDates.has(key);
                  const isCurrentDay = isToday(date);

                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-[3px] text-[9px] font-semibold",
                        !isCurrentMonth && "invisible",
                        holiday && "bg-destructive text-destructive-foreground",
                        !holiday && hasVacation && "text-primary-foreground",
                        !holiday && !hasVacation && isWeekend && "text-muted-foreground",
                        !holiday && !hasVacation && !isWeekend && "text-foreground",
                        isCurrentDay && "ring-2 ring-secondary",
                      )}
                      style={hasVacation ? { backgroundColor: worker.color_hex } : undefined}
                      title={holiday?.label ?? `${format(date, "dd/MM/yyyy")} · ${worker.display_name}`}
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

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-5">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Transtubari › Vacaciones › Jornadas</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h3 className="text-[26px] font-extrabold text-foreground">Vacaciones y Jornadas</h3>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">Hoy: {todayBadge}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Planificación anual de turnos y control por trabajador.</p>
            </div>

            <div className="inline-flex rounded-full border border-border bg-background p-1">
              <button type="button" className="rounded-full px-4 py-2 text-sm text-muted-foreground">Trabajador</button>
              <button type="button" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Administración</button>
            </div>
          </div>

          <div className="grid gap-2 rounded-xl border border-border bg-background p-2 md:grid-cols-5">
            {[
              "Fichajes",
              "Calendario general",
              "Vacaciones",
              "Jornadas",
              "Ficha por trabajador",
            ].map((label) => (
              <div
                key={label}
                className={cn(
                  "flex items-center justify-center rounded-lg px-3 py-3 text-sm font-medium",
                  label === "Jornadas" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="border-b border-border bg-card px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg bg-muted p-1">
              {([
                ["day", "Día"],
                ["week", "Semana"],
                ["month", "Mes"],
                ["year", "Año"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setViewMode(value)}
                  className={cn("rounded-md px-4 py-2 text-sm font-medium text-muted-foreground", viewMode === value && "bg-card text-primary shadow-sm")}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center rounded-lg bg-muted p-1">
              <Button type="button" size="icon" variant="ghost" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="min-w-[180px] px-3 text-center text-sm font-bold capitalize text-foreground">{periodLabel}</div>
              <Button type="button" size="icon" variant="ghost" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>

            <Button type="button" variant="secondary" size="sm" onClick={() => setAnchorDate(new Date())}>Hoy</Button>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm">＋ Añadir turno</Button>
              <Button type="button" size="sm" onClick={exportMonth}><Download className="h-4 w-4" /> Exportar Excel</Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card-muted px-5 py-4">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Trabajadores</span>
          <button
            type="button"
            onClick={() => setSelectedWorkerId(null)}
            className={cn("rounded-full border px-3 py-2 text-xs font-semibold", !selectedWorkerId ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground")}
          >
            Todos
          </button>
          {workers.map((worker) => (
            <button
              key={worker.id}
              type="button"
              onClick={() => handleWorkerChip(worker.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-2 py-1.5 text-xs font-semibold",
                selectedWorkerId === worker.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
              )}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-extrabold" style={{ backgroundColor: worker.color_hex, color: getContrastTextColor(worker.color_hex) }}>
                {worker.display_name.slice(0, 1).toUpperCase()}
              </span>
              {worker.display_name}
            </button>
          ))}
          <span className="ml-auto text-xs italic text-muted-foreground">click una vez para filtrar y otra para abrir ficha</span>
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
                    const daySlots = slotsByDate.get(key) ?? {};

                    return (
                      <div
                        key={key}
                        className={cn(
                          "grid min-h-[118px] grid-rows-[28px_1fr] overflow-hidden rounded-lg border bg-card transition-transform hover:-translate-y-0.5",
                          !isCurrentMonth && "opacity-35",
                          isWeekend && "bg-muted/30",
                          holiday ? "border-destructive" : "border-border",
                          isCurrentDay && "ring-2 ring-secondary",
                        )}
                      >
                        <div className={cn("flex items-center justify-between px-2 text-[11px] font-bold", holiday ? "bg-destructive text-destructive-foreground" : isCurrentDay ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground")}>
                          <span>{date.getDate()}</span>
                          <span className="truncate text-[10px]">{holiday?.label ?? ""}</span>
                        </div>
                        <div className="grid grid-rows-3">
                          {shiftOrder.map((shift) => {
                            const slot = daySlots[shift];
                            const visibleSlot = !selectedWorkerId || slot?.worker_id === selectedWorkerId ? slot : undefined;
                            return (
                              <div key={`${key}-${shift}`} className="grid grid-cols-[18px_1fr] items-center gap-2 border-t border-dashed border-border px-2 py-1 first:border-t-0">
                                <span className="text-[9px] font-bold text-muted-foreground">{shiftShortLabel[shift]}</span>
                                {renderWorkerPill(visibleSlot)}
                              </div>
                            );
                          })}
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

                {shiftOrder.map((shift) => (
                  <div key={shift} className="contents">
                    <div className="border-t border-border bg-muted px-3 py-4 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {shiftLongLabel[shift]}
                      <div className="mt-1 text-[10px] font-medium normal-case tracking-normal">{shiftHours[shift]}</div>
                    </div>
                    {weekDays.map((date) => {
                      const slot = slotsByDate.get(toDateKey(date))?.[shift];
                      const visibleSlot = !selectedWorkerId || slot?.worker_id === selectedWorkerId ? slot : undefined;
                      return (
                        <div key={`${shift}-${date.toISOString()}`} className={cn("flex min-h-[72px] items-center justify-center border-l border-t border-border px-3 py-3", (date.getDay() === 0 || date.getDay() === 6) && "bg-muted/20", isSameDay(date, new Date()) && "bg-secondary/20")}>
                          {renderWorkerPill(visibleSlot, true)}
                        </div>
                      );
                    })}
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
                  <p className="text-sm text-muted-foreground">
                    {format(anchorDate, "EEEE", { locale: es })}
                    {holidaysByDate.get(dayKey) ? ` · Festivo: ${holidaysByDate.get(dayKey)?.label}` : ""}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {shiftOrder.map((shift) => {
                  const slot = slotsByDate.get(dayKey)?.[shift];
                  const visibleSlot = !selectedWorkerId || slot?.worker_id === selectedWorkerId ? slot : undefined;
                  return (
                    <div key={shift} className="rounded-xl border border-border bg-muted/30 p-6 text-center">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">{shiftLongLabel[shift]}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{shiftHours[shift]}</p>
                      <div className="mt-6">{renderWorkerPill(visibleSlot, true)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {viewMode === "year" ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const monthDate = new Date(anchorDate.getFullYear(), monthIndex, 1);
                return (
                  <button
                    key={monthIndex}
                    type="button"
                    onClick={() => {
                      setAnchorDate(monthDate);
                      setViewMode("month");
                    }}
                    className="rounded-xl border border-border bg-muted/30 p-3 text-left transition-transform hover:-translate-y-0.5"
                  >
                    <p className="mb-3 text-center text-sm font-bold capitalize text-foreground">{format(monthDate, "MMMM", { locale: es })}</p>
                    <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-semibold text-muted-foreground">
                      {weekDaysShort.map((day) => <span key={`${monthIndex}-${day}`}>{day}</span>)}
                    </div>
                    <div className="mt-2 space-y-1">
                      {getMonthMatrix(monthDate).map((week, index) => (
                        <div key={index} className="grid grid-cols-7 gap-1">
                          {week.map((date) => {
                            const key = toDateKey(date);
                            const holiday = holidaysByDate.get(key);
                            const isCurrentMonth = date.getMonth() === monthIndex;
                            const hasShift = shiftOrder.some((shift) => {
                              const slot = slotsByDate.get(key)?.[shift];
                              return Boolean(slot) && (!selectedWorkerId || slot?.worker_id === selectedWorkerId);
                            });
                            return (
                              <div
                                key={key}
                                className={cn(
                                  "flex aspect-square items-center justify-center rounded text-[10px] font-semibold",
                                  !isCurrentMonth && "text-transparent",
                                  holiday && "bg-destructive text-destructive-foreground",
                                  !holiday && hasShift && "bg-primary/10 text-foreground",
                                  !holiday && !hasShift && (date.getDay() === 0 || date.getDay() === 6) && "text-muted-foreground",
                                  isSameDay(date, new Date()) && "ring-2 ring-secondary",
                                )}
                              >
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
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ClipboardList className="h-4 w-4 text-primary" /> Cobertura mensual</div>
            <p className="mt-3 text-2xl font-extrabold text-foreground">{coverageCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">Franjas registradas en {format(currentMonth, "MMMM", { locale: es })}.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarDays className="h-4 w-4 text-primary" /> Festivos visibles</div>
            <p className="mt-3 text-2xl font-extrabold text-foreground">{visibleHolidayCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">Días con cierre o festivo dentro del periodo mostrado.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Eye className="h-4 w-4 text-primary" /> Balance filtrado</div>
            <p className="mt-3 text-2xl font-extrabold text-foreground">{balanceLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">{selectedWorkerId ? "Horas pendientes del trabajador activo." : "Trabajadores disponibles en planificación."}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPanelOpen((current) => !current)}
          className="fixed right-0 top-40 z-30 rounded-l-lg bg-primary px-3 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground shadow-lg"
        >
          Genérico + lectura
        </button>

        <aside className={cn("fixed right-0 top-24 z-40 h-[75vh] w-[340px] max-w-[90vw] translate-x-full overflow-y-auto rounded-l-xl border border-border bg-card p-5 shadow-2xl transition-transform", panelOpen && "translate-x-0") }>
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground">Panel lateral</h4>
            <button type="button" onClick={() => setPanelOpen(false)} className="text-lg text-muted-foreground">✕</button>
          </div>

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
              {monthReading.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay turnos cargados en este mes.</p> : monthReading.map(({ worker, stats }) => (
                <div key={worker.id} className="flex items-center gap-3 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: worker.color_hex }} />
                  <div>
                    <p className="font-semibold text-foreground">{worker.display_name.toUpperCase()}</p>
                    <p className="text-muted-foreground">{stats.assignments} turnos · {stats.nights} noches · {stats.special} festivos</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="pt-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><TriangleAlert className="h-4 w-4 text-primary" /> Avisos</div>
            <div className="space-y-2">
              {warnings.length === 0 ? <p className="text-sm text-muted-foreground">Sin avisos activos ahora mismo.</p> : warnings.map((worker) => (
                <div key={worker.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="font-medium text-foreground">{worker.display_name}</span>
                  <span className="text-muted-foreground">{worker.extra_vacation_reason ?? "Inactivo"}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {modalWorker ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-primary/35 px-4 py-8 backdrop-blur-sm" onClick={(event) => {
          if (event.target === event.currentTarget) setModalWorkerId(null);
        }}>
          <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="grid gap-4 border-b border-border px-6 py-6 md:grid-cols-[auto_1fr_auto] md:items-center" style={{ background: `linear-gradient(120deg, hsl(var(--primary)) 0%, ${modalWorker.color_hex} 180%)` }}>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/20 text-2xl font-extrabold text-white">
                {modalWorker.display_name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h4 className="text-2xl font-extrabold text-white">{modalWorker.display_name}</h4>
                <p className="mt-1 text-sm text-white/80">Turno por defecto: {modalWorker.shift_default}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => onOpenWorkerProfile(modalWorker.id)}>Abrir ficha completa</Button>
                <Button type="button" variant="outline" size="sm" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">Editar jornada</Button>
                <button type="button" onClick={() => setModalWorkerId(null)} className="ml-auto text-xl text-white/90">✕</button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border bg-background p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Horas anuales</p><p className="mt-2 text-2xl font-extrabold text-foreground">{((summariesByWorkerId.get(modalWorker.id)?.total_annual_hours ?? modalWorker.total_annual_hours) || 0).toFixed(2)} h</p></div>
                <div className="rounded-xl border border-border bg-background p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Turnos asignados</p><p className="mt-2 text-2xl font-extrabold text-foreground">{vacationSlots.filter((slot) => slot.worker_id === modalWorker.id).length}</p></div>
                <div className="rounded-xl border border-border bg-background p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Vacaciones</p><p className="mt-2 text-2xl font-extrabold text-success">{((summariesByWorkerId.get(modalWorker.id)?.vacation_days_total ?? modalWorker.worker_vacation_days) || 0).toFixed(2)} d</p></div>
                <div className="rounded-xl border border-border bg-background p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Turnos especiales</p><p className="mt-2 text-2xl font-extrabold text-foreground">{vacationSlots.filter((slot) => slot.worker_id === modalWorker.id && holidaysByDate.has(slot.date)).length}</p></div>
              </div>

              <h5 className="mb-3 text-sm font-bold text-foreground">Calendario anual · {modalWorker.display_name}</h5>
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{renderWorkerYear(modalWorker)}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default JourneysSection;