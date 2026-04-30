import { useEffect, useMemo, useState } from "react";
import { addDays, eachDayOfInterval, endOfWeek, format, startOfWeek, startOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Download, Eye, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { useTranstubariData } from "@/hooks/useTranstubariData";
import { useAuth } from "@/hooks/useAuth";
import { getWorkerYearStats } from "@/lib/transtubari-parser";
import { supabase } from "@/integrations/supabase/client";
import type { HolidayItem, VacationSlotItem, VacationViewMode, WorkerItem, WorkerYearSummaryItem } from "./vacation-types";
import { getMonthMatrix, toDateKey } from "./vacation-utils";
import { SHIFT_CODES } from "./journeys-constants";
import { useWorkerLookups, type DisplayWorker } from "./useWorkerLookups";
import { useJourneyOverrides } from "./useJourneyOverrides";
import DayView from "./views/DayView";
import WeekView from "./views/WeekView";
import MonthView from "./views/MonthView";
import YearView from "./views/YearView";
import JourneysSidePanel from "./JourneysSidePanel";
import WorkerModal from "./WorkerModal";

interface Props {
  workers: WorkerItem[];
  holidays: HolidayItem[];
  vacationSlots: VacationSlotItem[];
  summaries: WorkerYearSummaryItem[];
  onOpenWorkerProfile: (workerId: string) => void;
}

const JourneysSection = ({ workers, holidays, vacationSlots, summaries, onOpenWorkerProfile }: Props) => {
  const { data, loading, error } = useTranstubariData();
  const [viewMode, setViewMode] = useState<VacationViewMode>("month");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [modalWorkerId, setModalWorkerId] = useState<string | null>(null);
  // Edición instantánea para admin: ya no hay toggle de "modo edición".
  const [staffMembers, setStaffMembers] = useState<Array<{ id: string; full_name: string; color_tag: string | null }>>([]);
  const { canViewAdmin } = useAuth();

  const excelWorkers = data?.workers ?? [];
  const { resolveExcelWorker, resolveAppWorker, getDisplayWorker } = useWorkerLookups(excelWorkers, workers, staffMembers);
  const currentMonth = useMemo(() => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1), [anchorDate]);
  const monthGrid = useMemo(() => getMonthMatrix(currentMonth), [currentMonth]);
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(anchorDate, { weekStartsOn: 1 }), end: endOfWeek(anchorDate, { weekStartsOn: 1 }) }),
    [anchorDate],
  );

  const holidaysByDate = useMemo(() => {
    const merged = new Map<string, { label: string; color: string | null }>();
    holidays.forEach((holiday) => merged.set(holiday.date, { label: holiday.label, color: holiday.color_hex }));
    Object.values(data?.holidays ?? {}).forEach((holiday) => merged.set(holiday.date, { label: holiday.label, color: holiday.color }));
    return merged;
  }, [data?.holidays, holidays]);

  const visibleDates = useMemo(() => {
    if (viewMode === "day") return [anchorDate];
    if (viewMode === "week") return weekDays;
    if (viewMode === "month") return monthGrid.flat();
    return eachDayOfInterval({ start: startOfYear(new Date(anchorDate.getFullYear(), 0, 1)), end: new Date(anchorDate.getFullYear(), 11, 31) });
  }, [anchorDate, monthGrid, viewMode, weekDays]);

  const { getOverride, setAssignment, clearAssignment, restoreFromExcel } = useJourneyOverrides(visibleDates);

  useEffect(() => {
    const loadStaffMembers = async () => {
      const { data } = await supabase
        .from("staff_directory")
        .select("id, full_name, color_tag")
        .eq("active", true)
        .order("full_name", { ascending: true });

      setStaffMembers((data ?? []) as Array<{ id: string; full_name: string; color_tag: string | null }>);
    };

    void loadStaffMembers();
  }, []);

  // Lista completa de trabajadores asignables: TODO el directorio activo (no se filtra por la tabla legacy `workers`).
  const allWorkers: DisplayWorker[] = useMemo(() => {
    return staffMembers
      .map((sm) => getDisplayWorker(sm.id))
      .filter((worker): worker is DisplayWorker => Boolean(worker?.assignmentId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [getDisplayWorker, staffMembers]);



  const monthReading = useMemo(() => {
    if (!data) return [];
    const counts = new Map<string, { assignments: number; nights: number; special: number }>();

    monthGrid.flat().forEach((date) => {
      if (date.getMonth() !== currentMonth.getMonth()) return;
      const shifts = data.shifts[`${date.getMonth() + 1}-${date.getDate()}`];
      if (!shifts) return;
      const holiday = holidaysByDate.get(toDateKey(date));

      SHIFT_CODES.forEach((code) => {
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
  }, [currentMonth, data, getDisplayWorker, holidaysByDate, monthGrid]);

  const coverageCount = useMemo(() => {
    if (!data) return 0;
    return monthGrid
      .flat()
      .filter((date) => date.getMonth() === currentMonth.getMonth())
      .reduce((sum, date) => {
        const shifts = data.shifts[`${date.getMonth() + 1}-${date.getDate()}`];
        if (!shifts) return sum;
        return sum + SHIFT_CODES.filter((code) => Boolean(shifts[code])).length;
      }, 0);
  }, [currentMonth, data, monthGrid]);

  const visibleHolidayCount = useMemo(() => visibleDates.filter((date) => holidaysByDate.has(toDateKey(date))).length, [holidaysByDate, visibleDates]);

  const monthSummaryLabel = useMemo(() => {
    if (!data) return "Cargando turnos reales…";
    const assigned = monthGrid
      .flat()
      .filter((date) => date.getMonth() === currentMonth.getMonth())
      .reduce((sum, date) => {
        const shifts = data.shifts[`${date.getMonth() + 1}-${date.getDate()}`];
        if (!shifts) return sum;
        return sum + SHIFT_CODES.filter((code) => Boolean(shifts[code]) && (!selectedWorkerId || shifts[code] === selectedWorkerId)).length;
      }, 0);
    return `${assigned} turnos asignados · ${visibleHolidayCount} festivos visibles`;
  }, [currentMonth, data, monthGrid, selectedWorkerId, visibleHolidayCount]);

  const genericSummary = useMemo(() => {
    const baseWorkers = excelWorkers.length > 0
      ? excelWorkers
      : workers.map((worker) => ({
          id: worker.id,
          name: worker.display_name,
          initials: worker.display_name.slice(0, 2),
          color: worker.color_hex,
          defaultShift: worker.shift_default,
          annualHours: Number(worker.annual_contract_hours),
        }));

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
    const excelWarnings = data.vacations.slice(0, 5).map((vacation) => ({
      id: `${vacation.workerId}-${vacation.startDate}`,
      name: getDisplayWorker(vacation.workerId)?.name ?? vacation.workerId,
      note: `${vacation.type || "Ausencia"} · ${vacation.startDate}`,
    }));
    const manualWarnings = vacationSlots.slice(0, Math.max(0, 5 - excelWarnings.length)).map((slot) => ({
      id: slot.id,
      name: workers.find((worker) => worker.id === slot.worker_id)?.display_name ?? slot.worker_id,
      note: `${slot.date} · ${slot.shift}`,
    }));
    return [...excelWarnings, ...manualWarnings];
  }, [data, getDisplayWorker, vacationSlots, workers]);

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
      const shifts = data.shifts[`${date.getMonth() + 1}-${date.getDate()}`];
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

  if (loading) {
    return <div className="rounded-xl border border-border bg-card p-8"><div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando Excel de jornadas…</div></div>;
  }

  if (error || !data) {
    return <div className="rounded-xl border border-destructive/30 bg-card p-8"><p className="text-sm font-semibold text-foreground">No se pudo leer el Excel de jornadas.</p><p className="mt-2 text-sm text-muted-foreground">{error ?? "Faltan datos para pintar el calendario."}</p></div>;
  }

  const activeExcelWorker = modalWorkerId ? resolveExcelWorker(modalWorkerId) : null;
  const activeAppWorker = modalWorkerId ? resolveAppWorker(modalWorkerId) : null;
  const summaryMap = new Map(summaries.map((summary) => [summary.worker_id, summary]));
  const balanceText = selectedWorkerId ? balanceLabel : `${summaryMap.size || workers.length} pers.`;

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

          {/* Barra informativa eliminada: no era interactiva */}
        </div>

        <div className="border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg bg-muted p-1">
              {([['day', 'Día'], ['week', 'Semana'], ['month', 'Mes'], ['year', 'Año']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setViewMode(value)} className={viewMode === value ? "rounded-md bg-card px-4 py-2 text-sm font-medium text-primary shadow-sm" : "rounded-md px-4 py-2 text-sm font-medium text-muted-foreground"}>{label}</button>
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

        {canViewAdmin ? (
          <div className="border-b border-border bg-primary/5 px-5 py-2 text-xs font-medium text-muted-foreground">
            💡 Pulsa cualquier turno para asignar otro trabajador, dejarlo en blanco o restaurar el valor del Excel.
          </div>
        ) : null}


        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-5 py-4">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Trabajadores</span>
          <button type="button" onClick={() => setSelectedWorkerId(null)} className={!selectedWorkerId ? "rounded-full border border-primary bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground" : "rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"}>Todos</button>
          {excelWorkers.map((worker) => (
            <button key={worker.id} type="button" onClick={() => openWorker(worker.id)} className={selectedWorkerId === worker.id ? "inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-2 py-1.5 text-xs font-semibold text-primary-foreground" : "inline-flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1.5 text-xs font-semibold text-foreground"}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-extrabold text-white" style={{ backgroundColor: worker.color }}>{worker.initials.slice(0, 1)}</span>
              {worker.name}
            </button>
          ))}
        </div>

        <div className="p-5">
          {viewMode === "month" ? <MonthView data={data} monthGrid={monthGrid} currentMonth={currentMonth} holidaysByDate={holidaysByDate} selectedWorkerId={selectedWorkerId} summaryLabel={monthSummaryLabel} getDisplayWorker={getDisplayWorker} onClickWorker={openWorker} editMode={canViewAdmin} allWorkers={allWorkers} getOverride={getOverride} onAssign={setAssignment} onClear={clearAssignment} onRestore={restoreFromExcel} /> : null}
          {viewMode === "week" ? <WeekView data={data} weekDays={weekDays} holidaysByDate={holidaysByDate} selectedWorkerId={selectedWorkerId} getDisplayWorker={getDisplayWorker} onClickWorker={openWorker} editMode={canViewAdmin} allWorkers={allWorkers} getOverride={getOverride} onAssign={setAssignment} onClear={clearAssignment} onRestore={restoreFromExcel} /> : null}
          {viewMode === "day" ? <DayView data={data} anchorDate={anchorDate} holidaysByDate={holidaysByDate} selectedWorkerId={selectedWorkerId} getDisplayWorker={getDisplayWorker} onClickWorker={openWorker} editMode={canViewAdmin} allWorkers={allWorkers} getOverride={getOverride} onAssign={setAssignment} onClear={clearAssignment} onRestore={restoreFromExcel} /> : null}
          {viewMode === "year" ? <YearView data={data} year={anchorDate.getFullYear()} holidaysByDate={holidaysByDate} selectedWorkerId={selectedWorkerId} onSelectMonth={(monthDate) => { setAnchorDate(monthDate); setViewMode("month"); }} /> : null}
        </div>

        <div className="grid gap-3 border-t border-border px-5 py-5 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ClipboardList className="h-4 w-4 text-primary" /> Cobertura mensual</div><p className="mt-3 text-2xl font-extrabold text-foreground">{coverageCount}</p><p className="mt-1 text-sm text-muted-foreground">Franjas registradas en {format(currentMonth, "MMMM", { locale: es })}.</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarDays className="h-4 w-4 text-primary" /> Festivos visibles</div><p className="mt-3 text-2xl font-extrabold text-foreground">{visibleHolidayCount}</p><p className="mt-1 text-sm text-muted-foreground">Días con cierre o festivo dentro del periodo mostrado.</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Eye className="h-4 w-4 text-primary" /> Balance filtrado</div><p className="mt-3 text-2xl font-extrabold text-foreground">{balanceText}</p><p className="mt-1 text-sm text-muted-foreground">{selectedWorkerId ? "Horas calculadas desde el Excel del trabajador activo." : "Trabajadores disponibles en planificación."}</p></div>
        </div>

        <JourneysSidePanel open={panelOpen} genericSummary={genericSummary} monthReading={monthReading} warnings={warnings} onClose={() => setPanelOpen(false)} />
      </div>

      {activeExcelWorker ? <WorkerModal data={data} worker={activeExcelWorker} appWorker={activeAppWorker} currentMonth={currentMonth} anchorYear={anchorDate.getFullYear()} holidaysByDate={holidaysByDate} onClose={() => setModalWorkerId(null)} onOpenWorkerProfile={onOpenWorkerProfile} /> : null}
    </>
  );
};

export default JourneysSection;
