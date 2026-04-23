import { useMemo, useState } from "react";
import { CalendarRange, LayoutGrid, Rows3, UserSquare2 } from "lucide-react";
import { excelGenericMonths, excelVacationMonths, excelWorkerSheets } from "@/data/excelVacationData";
import { normalizeWorkerName, resolveWorkerColor } from "@/lib/company-calendar";
import { cn } from "@/lib/utils";

const normalizeMonth = (value: string) => value.trim().toLowerCase();

const ExcelVacationPlanner = () => {
  const [selectedMonth, setSelectedMonth] = useState(excelVacationMonths[0]?.month ?? "Enero");
  const [selectedWorker, setSelectedWorker] = useState<string>("all");

  const visibleMonth = useMemo(
    () => excelVacationMonths.find((item) => normalizeMonth(item.month) === normalizeMonth(selectedMonth)) ?? excelVacationMonths[0],
    [selectedMonth]
  );

  const genericMonth = useMemo(
    () => excelGenericMonths.find((item) => normalizeMonth(item.month) === normalizeMonth(selectedMonth)),
    [selectedMonth]
  );

  const workerOptions = useMemo(() => {
    const names = new Set<string>();
    visibleMonth?.weeks.forEach((row) => row.forEach((cell) => cell.worker && names.add(normalizeWorkerName(cell.worker))));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "es"));
  }, [visibleMonth]);

  const filteredWeeks = useMemo(() => {
    if (!visibleMonth) return [];
    if (selectedWorker === "all") return visibleMonth.weeks;
    return visibleMonth.weeks.filter((row) => row.some((cell) => normalizeWorkerName(cell.worker) === selectedWorker));
  }, [selectedWorker, visibleMonth]);

  const workerCards = useMemo(() => {
    const base = selectedWorker === "all"
      ? excelWorkerSheets
      : excelWorkerSheets.filter((sheet) => normalizeWorkerName(sheet.sheet) === selectedWorker || normalizeWorkerName(sheet.title) === selectedWorker);

    return base.map((sheet) => ({
      ...sheet,
      currentMonth: sheet.months.find((month) => normalizeMonth(month.month) === normalizeMonth(selectedMonth)) ?? null,
    }));
  }, [selectedMonth, selectedWorker]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Planificación real del Excel</p>
          <p className="text-sm text-muted-foreground">Misma organización base: hoja VACACIONES, hoja GENERICO y hojas individuales por trabajador.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {excelVacationMonths.map((month) => (
            <button
              key={month.month}
              type="button"
              onClick={() => setSelectedMonth(month.month)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                selectedMonth === month.month ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {month.month}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-background p-3">
        <button
          type="button"
          onClick={() => setSelectedWorker("all")}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            selectedWorker === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
          )}
        >
          Todos
        </button>
        {workerOptions.map((worker) => (
          <button
            key={worker}
            type="button"
            onClick={() => setSelectedWorker(worker)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              selectedWorker === worker ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full border border-border/60" style={{ backgroundColor: resolveWorkerColor(worker) }} />
            {worker}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-2xl border border-border bg-background p-4">
          <div className="mb-4 flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            <p className="font-semibold text-foreground">Hoja VACACIONES · {visibleMonth?.month}</p>
          </div>
          <div className="overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-7 gap-2">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                <div key={day} className="rounded-xl bg-muted px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{day}</div>
              ))}
              {filteredWeeks.map((week, weekIndex) =>
                Array.from({ length: 7 }).map((_, cellIndex) => {
                  const cell = week[cellIndex];
                  const worker = cell?.worker ? normalizeWorkerName(cell.worker) : null;
                  const color = worker ? resolveWorkerColor(worker) : null;

                  return (
                    <div key={`${weekIndex}-${cellIndex}`} className="min-h-[82px] rounded-xl border border-border bg-card p-2">
                      {cell ? (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">{cell.day ?? "—"}</span>
                            {color ? <span className="h-2.5 w-2.5 rounded-full border border-border/60" style={{ backgroundColor: color }} /> : null}
                          </div>
                          <p className="mt-3 text-sm font-semibold text-foreground">{worker ?? "Sin asignar"}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">turno / vacaciones</p>
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">—</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-background p-4">
            <div className="mb-4 flex items-center gap-2">
              <Rows3 className="h-4 w-4 text-primary" />
              <p className="font-semibold text-foreground">Hoja GENERICO</p>
            </div>
            <div className="space-y-2">
              {genericMonth?.entries.slice(0, 10).map((entry, index) => (
                <div key={`${entry.weekday}-${entry.day}-${index}`} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{entry.weekday ?? "Día"} {entry.day ?? ""}</p>
                    <p className="text-xs text-muted-foreground">Base mensual del Excel</p>
                  </div>
                  <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground">{entry.hours ?? 0} h</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-background p-4">
            <div className="mb-4 flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary" />
              <p className="font-semibold text-foreground">Lectura del mes</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-muted px-3 py-3"><p className="text-muted-foreground">Bloques visibles</p><p className="mt-1 font-semibold text-foreground">{filteredWeeks.length}</p></div>
              <div className="rounded-xl bg-muted px-3 py-3"><p className="text-muted-foreground">Trabajadores</p><p className="mt-1 font-semibold text-foreground">{workerOptions.length}</p></div>
              <div className="rounded-xl bg-muted px-3 py-3"><p className="text-muted-foreground">Mes activo</p><p className="mt-1 font-semibold text-foreground">{selectedMonth}</p></div>
              <div className="rounded-xl bg-muted px-3 py-3"><p className="text-muted-foreground">Filtro</p><p className="mt-1 font-semibold text-foreground">{selectedWorker === "all" ? "Todos" : selectedWorker}</p></div>
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="mb-4 flex items-center gap-2">
          <UserSquare2 className="h-4 w-4 text-primary" />
          <p className="font-semibold text-foreground">Hojas individuales</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workerCards.map((worker) => {
            const workerName = normalizeWorkerName(worker.sheet);
            return (
              <article key={worker.sheet} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{workerName}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Hoja {worker.sheet}</p>
                  </div>
                  <span className="h-3 w-3 rounded-full border border-border/60" style={{ backgroundColor: resolveWorkerColor(workerName) }} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-muted px-3 py-3">
                    <p className="text-muted-foreground">Horas {selectedMonth}</p>
                    <p className="mt-1 font-semibold text-foreground">{worker.currentMonth?.hours ?? 0} h</p>
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-3">
                    <p className="text-muted-foreground">Días marcados</p>
                    <p className="mt-1 font-semibold text-foreground">{worker.currentMonth?.workedDays ?? 0}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(worker.currentMonth?.sampleDays ?? []).slice(0, 8).map((day) => (
                    <span key={`${worker.sheet}-${day}`} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground">{day}</span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default ExcelVacationPlanner;