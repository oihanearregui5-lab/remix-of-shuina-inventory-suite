import { useMemo, useState } from "react";
import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { BookOpenText, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Download, Eye, FileSpreadsheet, Pencil, TriangleAlert, UserSquare2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
const shiftShortLabel = { dia: "M", tarde: "T", noche: "N" };
const shiftLongLabel = { dia: "Mañana", tarde: "Tarde", noche: "Noche" };
const shiftHours = { dia: "06:00 – 14:00", tarde: "14:00 – 22:00", noche: "22:00 – 06:00" };
const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

const JourneysSection = ({ workers, holidays, vacationSlots, summaries, onOpenWorkerProfile }: Props) => {
  const [viewMode, setViewMode] = useState<VacationViewMode>("month");
  const [anchorDate, setAnchorDate] = useState(new Date(2026, 0, 6));
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const holidaysByDate = useMemo(() => new Map(holidays.map((holiday) => [holiday.date, holiday])), [holidays]);
  const workersById = useMemo(() => new Map(workers.map((worker) => [worker.id, worker])), [workers]);
  const slotsByDate = useMemo(() => {
    const map = new Map<string, VacationSlotItem[]>();
    vacationSlots.forEach((slot) => {
      const current = map.get(slot.date) ?? [];
      current.push(slot);
      map.set(slot.date, current.sort((left, right) => shiftOrder.indexOf(left.shift) - shiftOrder.indexOf(right.shift)));
    });
    return map;
  }, [vacationSlots]);

  const monthDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const monthGrid = useMemo(() => getMonthMatrix(monthDate), [monthDate]);
  const weekDaysRange = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(anchorDate, { weekStartsOn: 1 }), index)), [anchorDate]);
  const dayDateKey = toDateKey(anchorDate);

  const filteredWorkers = useMemo(() => {
    if (!selectedWorkerId) return workers;
    return workers.filter((worker) => worker.id === selectedWorkerId);
  }, [selectedWorkerId, workers]);

  const monthReadings = useMemo(() => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const countMap = new Map<string, { days: Set<string>; special: number; nights: number }>();

    vacationSlots.forEach((slot) => {
      const slotDate = new Date(slot.date);
      if (slotDate < monthStart || slotDate > monthEnd) return;
      const entry = countMap.get(slot.worker_id) ?? { days: new Set<string>(), special: 0, nights: 0 };
      entry.days.add(slot.date);
      if (slot.shift === "noche") entry.nights += 1;
      if (holidaysByDate.has(slot.date)) entry.special += 1;
      countMap.set(slot.worker_id, entry);
    });

    return Array.from(countMap.entries())
      .map(([workerId, stats]) => ({ worker: workersById.get(workerId), stats }))
      .filter((item): item is { worker: WorkerItem; stats: { days: Set<string>; special: number; nights: number } } => Boolean(item.worker))
      .sort((left, right) => right.stats.days.size - left.stats.days.size)
      .slice(0, 6);
  }, [holidaysByDate, monthDate, vacationSlots, workersById]);

  const exportMonth = () => {
    const workbook = XLSX.utils.book_new();
    const rows = monthGrid.flat().map((date) => {
      const dateKey = toDateKey(date);
      const slots = (slotsByDate.get(dateKey) ?? []).filter((slot) => !selectedWorkerId || slot.worker_id === selectedWorkerId);
      const shiftMap = Object.fromEntries(shiftOrder.map((shift) => [shift, slots.find((slot) => slot.shift === shift)]));
      return {
        Fecha: format(date, "dd/MM/yyyy"),
        Festivo: holidaysByDate.get(dateKey)?.label ?? "",
        M: shiftMap.dia ? workersById.get(shiftMap.dia.worker_id)?.display_name ?? "" : "",
        T: shiftMap.tarde ? workersById.get(shiftMap.tarde.worker_id)?.display_name ?? "" : "",
        N: shiftMap.noche ? workersById.get(shiftMap.noche.worker_id)?.display_name ?? "" : "",
      };
    });

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Jornadas");
    XLSX.writeFile(workbook, `Jornadas_${format(monthDate, "yyyy_MM")}.xlsx`);
  };

  const navigate = (direction: 1 | -1) => {
    if (viewMode === "day") setAnchorDate((current) => addDays(current, direction));
    if (viewMode === "week") setAnchorDate((current) => addDays(current, direction * 7));
    if (viewMode === "month") setAnchorDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
    if (viewMode === "year") setAnchorDate((current) => new Date(current.getFullYear() + direction, 0, 1));
  };

  const periodLabel =
    viewMode === "day"
      ? format(anchorDate, "d MMMM yyyy", { locale: es })
      : viewMode === "week"
        ? `${format(weekDaysRange[0], "d MMM", { locale: es })} – ${format(weekDaysRange[6], "d MMM yyyy", { locale: es })}`
        : viewMode === "month"
          ? format(monthDate, "MMMM yyyy", { locale: es })
          : String(anchorDate.getFullYear());

  const openWorker = (workerId: string) => {
    if (selectedWorkerId === workerId) {
      onOpenWorkerProfile(workerId);
      return;
    }
    setSelectedWorkerId(workerId);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
        <span className="font-semibold">Jornadas</span> reemplaza a Excel real con vistas diaria, semanal, mensual y anual, panel lateral y acceso rápido a la ficha de cada trabajador.
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-4">
          <div className="flex rounded-lg bg-muted p-1">
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
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors", viewMode === value && "bg-card text-foreground shadow-sm")}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="min-w-[190px] px-2 text-center text-sm font-semibold capitalize text-foreground">{periodLabel}</div>
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm"><Pencil className="h-4 w-4" /> Editor de jornada</Button>
            <Button type="button" size="sm" onClick={exportMonth}><Download className="h-4 w-4" /> Exportar Excel</Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" size="sm"><BookOpenText className="h-4 w-4" /> Genérico + lectura</Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[360px] overflow-y-auto sm:max-w-[360px]">
                <SheetHeader>
                  <SheetTitle>Lectura del mes</SheetTitle>
                  <SheetDescription>Resumen operativo y avisos rápidos.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <section className="space-y-2 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><FileSpreadsheet className="h-4 w-4 text-primary" /> Hoja genérico</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span className="text-muted-foreground">Horas convenio</span><b className="text-foreground">1.744 h</b></div>
                      <div className="flex items-center justify-between"><span className="text-muted-foreground">Vacaciones estándar</span><b className="text-foreground">31 días</b></div>
                      <div className="flex items-center justify-between"><span className="text-muted-foreground">Horas por día</span><b className="text-foreground">8 h</b></div>
                      <div className="flex items-center justify-between"><span className="text-muted-foreground">Festivos cargados</span><b className="text-foreground">{holidays.length}</b></div>
                    </div>
                  </section>

                  <section className="space-y-3 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Eye className="h-4 w-4 text-primary" /> Lectura del mes</div>
                    {monthReadings.map(({ worker, stats }) => (
                      <div key={worker.id} className="flex items-start gap-3 text-sm">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: worker.color_hex }} />
                        <div>
                          <p className="font-semibold text-foreground">{worker.display_name}</p>
                          <p className="text-muted-foreground">{stats.days.size} días · {stats.nights} noches · {stats.special} festivos</p>
                        </div>
                      </div>
                    ))}
                  </section>

                  <section className="space-y-3 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><TriangleAlert className="h-4 w-4 text-primary" /> Avisos</div>
                    {workers.filter((worker) => !worker.is_active || worker.extra_vacation_reason).slice(0, 4).map((worker) => (
                      <div key={worker.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                        <span className="text-foreground">{worker.display_name}</span>
                        <span className="font-semibold text-muted-foreground">{worker.extra_vacation_reason ?? "Revisar jornada"}</span>
                      </div>
                    ))}
                  </section>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <button type="button" onClick={() => setSelectedWorkerId(null)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", !selectedWorkerId ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground")}>Todos</button>
          {workers.map((worker) => (
            <button key={worker.id} type="button" onClick={() => openWorker(worker.id)} className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold", selectedWorkerId === worker.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground")}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold" style={{ backgroundColor: worker.color_hex, color: getContrastTextColor(worker.color_hex) }}>{worker.display_name.slice(0, 2).toUpperCase()}</span>
              {worker.display_name}
            </button>
          ))}
          <span className="ml-auto text-xs italic text-muted-foreground">Pulsa una vez para filtrar y otra para abrir la ficha.</span>
        </div>

        <div className="p-4">
          {viewMode === "month" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {weekDays.map((day) => <span key={day}>{day}</span>)}
              </div>
              {monthGrid.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-2">
                  {week.map((date) => {
                    const dateKey = toDateKey(date);
                    const holiday = holidaysByDate.get(dateKey);
                    const isCurrentMonth = date.getMonth() === monthDate.getMonth();
                    const daySlots = (slotsByDate.get(dateKey) ?? []).filter((slot) => !selectedWorkerId || slot.worker_id === selectedWorkerId);

                    return (
                      <div key={dateKey} className={cn("min-h-[132px] overflow-hidden rounded-lg border", holiday ? "border-destructive/40" : "border-border", !isCurrentMonth && "opacity-35", date.getDay() === 0 || date.getDay() === 6 ? "bg-muted/30" : "bg-card")}>
                        <div className={cn("flex items-center justify-between px-3 py-2 text-xs font-semibold", holiday ? "bg-destructive text-destructive-foreground" : "bg-muted text-foreground")}>
                          <span>{date.getDate()}</span>
                          <span className="truncate">{holiday?.label ?? ""}</span>
                        </div>
                        <div className="grid grid-rows-3">
                          {shiftOrder.map((shift) => {
                            const slot = daySlots.find((item) => item.shift === shift);
                            const worker = slot ? workersById.get(slot.worker_id) : null;
                            return (
                              <div key={shift} className="grid min-h-[34px] grid-cols-[22px_1fr] items-center gap-2 border-t border-dashed border-border px-2 py-1 first:border-t-0">
                                <span className="text-[10px] font-bold text-muted-foreground">{shiftShortLabel[shift]}</span>
                                {worker ? (
                                  <button type="button" onClick={() => onOpenWorkerProfile(worker.id)} className="truncate rounded-md px-2 py-1 text-left text-[10px] font-bold uppercase tracking-[0.04em]" style={{ backgroundColor: worker.color_hex, color: getContrastTextColor(worker.color_hex) }}>
                                    {worker.display_name}
                                  </button>
                                ) : (
                                  <span className="text-[10px] italic text-muted-foreground">sin asignar</span>
                                )}
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
            <div className="overflow-x-auto rounded-lg border border-border">
              <div className="grid min-w-[980px]" style={{ gridTemplateColumns: "96px repeat(7, minmax(0, 1fr))" }}>
                <div className="bg-muted" />
                {weekDaysRange.map((date) => {
                  const holiday = holidaysByDate.get(toDateKey(date));
                  return (
                    <div key={date.toISOString()} className={cn("border-l border-border px-3 py-3 text-center", holiday ? "bg-destructive text-destructive-foreground" : "bg-muted")}> 
                      <div className="text-[11px] uppercase tracking-[0.12em]">{format(date, "EEE", { locale: es })}</div>
                      <div className="mt-1 text-lg font-bold">{format(date, "d")}</div>
                    </div>
                  );
                })}
                {shiftOrder.map((shift) => (
                  <>
                    <div key={`${shift}-label`} className="border-t border-border bg-muted px-3 py-4 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {shiftLongLabel[shift]}
                      <div className="mt-1 text-[10px] normal-case tracking-normal">{shiftHours[shift]}</div>
                    </div>
                    {weekDaysRange.map((date) => {
                      const slot = (slotsByDate.get(toDateKey(date)) ?? []).find((item) => item.shift === shift && (!selectedWorkerId || item.worker_id === selectedWorkerId));
                      const worker = slot ? workersById.get(slot.worker_id) : null;
                      return (
                        <div key={`${shift}-${date.toISOString()}`} className="flex min-h-[74px] items-center justify-center border-l border-t border-border px-3 py-3">
                          {worker ? (
                            <button type="button" onClick={() => onOpenWorkerProfile(worker.id)} className="w-full rounded-lg px-3 py-2 text-sm font-bold" style={{ backgroundColor: worker.color_hex, color: getContrastTextColor(worker.color_hex) }}>
                              {worker.display_name}
                            </button>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">descanso</span>
                          )}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          ) : null}

          {viewMode === "day" ? (
            <div className="grid gap-4 md:grid-cols-3">
              {shiftOrder.map((shift) => {
                const slot = (slotsByDate.get(dayDateKey) ?? []).find((item) => item.shift === shift && (!selectedWorkerId || item.worker_id === selectedWorkerId));
                const worker = slot ? workersById.get(slot.worker_id) : null;
                return (
                  <div key={shift} className="rounded-xl border border-border bg-muted/40 p-5 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{shiftLongLabel[shift]}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{shiftHours[shift]}</p>
                    <div className="mt-5">
                      {worker ? (
                        <button type="button" onClick={() => onOpenWorkerProfile(worker.id)} className="rounded-lg px-5 py-3 text-lg font-bold" style={{ backgroundColor: worker.color_hex, color: getContrastTextColor(worker.color_hex) }}>
                          {worker.display_name}
                        </button>
                      ) : (
                        <span className="text-sm italic text-muted-foreground">sin asignar</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {viewMode === "year" ? (
            <div className="grid gap-4 xl:grid-cols-4">
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const currentMonth = new Date(anchorDate.getFullYear(), monthIndex, 1);
                return (
                  <div key={monthIndex} className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="mb-3 text-center text-sm font-semibold capitalize text-foreground">{format(currentMonth, "MMMM", { locale: es })}</p>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground">
                      {weekDays.map((day) => <span key={`${monthIndex}-${day}`}>{day}</span>)}
                    </div>
                    <div className="mt-2 space-y-1">
                      {getMonthMatrix(currentMonth).map((week, index) => (
                        <div key={index} className="grid grid-cols-7 gap-1">
                          {week.map((date) => {
                            const dateKey = toDateKey(date);
                            const holiday = holidaysByDate.get(dateKey);
                            const hasSlots = (slotsByDate.get(dateKey) ?? []).some((slot) => !selectedWorkerId || slot.worker_id === selectedWorkerId);
                            return (
                              <div key={dateKey} className={cn("flex aspect-square items-center justify-center rounded text-[10px] font-semibold", date.getMonth() !== monthIndex && "text-transparent", holiday && "bg-destructive text-destructive-foreground", !holiday && hasSlots && "bg-info/15 text-foreground", !holiday && !hasSlots && (date.getDay() === 0 || date.getDay() === 6) && "text-muted-foreground")}>
                                {date.getDate()}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ClipboardList className="h-4 w-4 text-primary" /> Cobertura mensual</div>
          <p className="mt-3 text-2xl font-bold text-foreground">{vacationSlots.filter((slot) => new Date(slot.date).getMonth() === monthDate.getMonth()).length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Franjas registradas en {format(monthDate, "MMMM", { locale: es })}.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarDays className="h-4 w-4 text-primary" /> Festivos visibles</div>
          <p className="mt-3 text-2xl font-bold text-foreground">{holidays.filter((holiday) => new Date(holiday.date).getMonth() === monthDate.getMonth()).length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Días con cierre o festivo en el periodo mostrado.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><UserSquare2 className="h-4 w-4 text-primary" /> Balance filtrado</div>
          <p className="mt-3 text-2xl font-bold text-foreground">{selectedWorkerId ? format(((summaries.find((item) => item.worker_id === selectedWorkerId)?.remaining_hours) ?? 0), ".2f") : `${workers.length} pers.`}</p>
          <p className="mt-1 text-sm text-muted-foreground">{selectedWorkerId ? "Horas pendientes del trabajador activo." : "Trabajadores disponibles en planificación."}</p>
        </div>
      </div>
    </div>
  );
};

export default JourneysSection;