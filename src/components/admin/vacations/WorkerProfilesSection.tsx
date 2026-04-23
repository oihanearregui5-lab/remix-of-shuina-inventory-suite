import { useMemo, useState } from "react";
import { Clock3, SunMedium, UserSquare2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { HolidayItem, VacationSlotItem, WorkerItem, WorkerYearSummaryItem } from "./vacation-types";
import { formatHours, getMonthMatrix, toDateKey } from "./vacation-utils";

interface Props {
  workers: WorkerItem[];
  summaries: WorkerYearSummaryItem[];
  vacationSlots: VacationSlotItem[];
  holidays: HolidayItem[];
  selectedWorkerId?: string;
  onSelectedWorkerChange?: (workerId: string) => void;
}

const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

const WorkerProfilesSection = ({ workers, summaries, vacationSlots, holidays, selectedWorkerId: controlledSelectedWorkerId, onSelectedWorkerChange }: Props) => {
  const [internalSelectedWorkerId, setInternalSelectedWorkerId] = useState(workers[0]?.id ?? "");
  const selectedWorkerId = controlledSelectedWorkerId ?? internalSelectedWorkerId;
  const setSelectedWorkerId = onSelectedWorkerChange ?? setInternalSelectedWorkerId;
  const worker = workers.find((item) => item.id === selectedWorkerId) ?? workers[0] ?? null;
  const summary = useMemo(() => summaries.find((item) => item.worker_id === worker?.id) ?? null, [summaries, worker?.id]);
  const workerSlots = useMemo(() => vacationSlots.filter((slot) => slot.worker_id === worker?.id).slice(0, 18), [vacationSlots, worker?.id]);
  const workerSlotKeys = useMemo(() => new Set(vacationSlots.filter((slot) => slot.worker_id === worker?.id).map((slot) => slot.date)), [vacationSlots, worker?.id]);
  const holidaysByDate = useMemo(() => new Map(holidays.map((holiday) => [holiday.date, holiday])), [holidays]);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.35fr_0.65fr]">
      <aside className="rounded-lg border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Trabajadores</p>
        <div className="space-y-2">
          {workers.map((item) => (
            <button key={item.id} type="button" onClick={() => setSelectedWorkerId(item.id)} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left ${selectedWorkerId === item.id ? "border-primary bg-primary/8" : "border-border bg-background"}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: item.color_hex, color: "#fff" }}>{item.display_name.slice(0, 1).toUpperCase()}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.display_name}</p>
                <p className="text-xs text-muted-foreground">{item.name}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {worker ? (
        <section className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold" style={{ backgroundColor: worker.color_hex, color: "#fff" }}>{worker.display_name.slice(0, 1).toUpperCase()}</span>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><UserSquare2 className="h-4 w-4 text-primary" /> {worker.display_name}</div>
                <p className="mt-1 text-sm text-muted-foreground">Turno por defecto: {worker.shift_default}</p>
                {worker.extra_vacation_reason ? <p className="mt-1 text-xs text-muted-foreground">Motivo extra: {worker.extra_vacation_reason}</p> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border bg-background p-4"><p className="text-sm text-muted-foreground">Horas anuales</p><p className="mt-2 text-xl font-semibold text-foreground">{formatHours(summary?.total_annual_hours ?? worker.total_annual_hours)}</p></div>
            <div className="rounded-lg border border-border bg-background p-4"><p className="text-sm text-muted-foreground">Horas realizadas</p><p className="mt-2 text-xl font-semibold text-foreground">{formatHours(summary?.worked_hours)}</p></div>
            <div className="rounded-lg border border-border bg-background p-4"><p className="text-sm text-muted-foreground">Horas restantes</p><p className="mt-2 text-xl font-semibold text-foreground">{formatHours(summary?.remaining_hours)}</p></div>
            <div className="rounded-lg border border-border bg-background p-4"><p className="text-sm text-muted-foreground">Vacaciones</p><p className="mt-2 text-xl font-semibold text-foreground">{(summary?.vacation_days_total ?? worker.worker_vacation_days).toFixed(2)} días</p></div>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground"><UserSquare2 className="h-4 w-4 text-primary" /> Calendario anual de {worker.display_name}</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const monthDate = new Date(2026, monthIndex, 1);
                const monthWeeks = getMonthMatrix(monthDate);

                return (
                  <div key={monthIndex} className="rounded-lg border border-border bg-card p-3">
                    <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{format(monthDate, "MMMM", { locale: es })}</p>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
                      {weekDays.map((day) => <span key={`${monthIndex}-${day}`}>{day}</span>)}
                    </div>
                    <div className="mt-2 space-y-1">
                      {monthWeeks.map((week, weekIndex) => (
                        <div key={`${monthIndex}-${weekIndex}`} className="grid grid-cols-7 gap-1">
                          {week.map((date) => {
                            const dateKey = toDateKey(date);
                            const holiday = holidaysByDate.get(dateKey);
                            const isCurrentMonth = date.getMonth() === monthIndex;
                            const hasVacation = workerSlotKeys.has(dateKey);
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                            return (
                              <div
                                key={dateKey}
                                className={`flex aspect-square items-center justify-center rounded text-[10px] font-semibold ${
                                  !isCurrentMonth
                                    ? "text-transparent"
                                    : hasVacation
                                      ? "text-primary-foreground"
                                      : holiday?.type === "festivo_nacional"
                                        ? "bg-destructive text-destructive-foreground"
                                        : holiday?.type === "cierre_fabrica"
                                          ? "bg-warning text-foreground"
                                          : isWeekend
                                            ? "bg-muted text-muted-foreground"
                                            : "text-foreground"
                                }`}
                                style={hasVacation ? { backgroundColor: worker.color_hex } : undefined}
                                title={holiday?.label ?? (hasVacation ? `${worker.display_name} · vacaciones` : format(date, "dd/MM/yyyy"))}
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
              })}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Clock3 className="h-4 w-4 text-primary" /> Resumen contractual</div>
              <div className="space-y-2 text-sm text-foreground">
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"><span>Convenio anual</span><span>{formatHours(worker.annual_contract_hours)}</span></div>
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"><span>Vacaciones empresa</span><span>{formatHours(worker.company_vacation_hours)}</span></div>
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"><span>Días extra</span><span>{(worker.extra_vacation_days ?? 0).toFixed(2)}</span></div>
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"><span>Días usados</span><span>{(summary?.vacation_days_used ?? 0).toFixed(2)}</span></div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><SunMedium className="h-4 w-4 text-primary" /> Últimas franjas marcadas</div>
              <div className="space-y-2">
                {workerSlots.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                    <span>{format(new Date(slot.date), "dd/MM/yyyy")}</span>
                    <span className="font-semibold uppercase">{slot.shift}</span>
                  </div>
                ))}
                {workerSlots.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay vacaciones marcadas para este trabajador.</p> : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default WorkerProfilesSection;
