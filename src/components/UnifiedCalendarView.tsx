import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import { useUnifiedCalendar, getCategoryStyle, type UnifiedEventCategory, type UnifiedCalendarEvent } from "@/hooks/useUnifiedCalendar";

const CATEGORY_OPTIONS: { key: UnifiedEventCategory; label: string }[] = [
  { key: "task", label: "Tareas" },
  { key: "vacation", label: "Vacaciones" },
  { key: "machine_itv", label: "ITV" },
  { key: "machine_inspection", label: "Inspecciones" },
  { key: "holiday", label: "Festivos" },
  { key: "company_calendar", label: "Calendario empresa" },
];

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const formatMonth = (date: Date) =>
  date.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase());

const formatLongDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const buildMonthGrid = (anchor: Date) => {
  const first = startOfMonth(anchor);
  const last = endOfMonth(anchor);
  const startWeekday = (first.getDay() + 6) % 7; // lunes = 0
  const cells: Date[] = [];
  for (let i = startWeekday; i > 0; i -= 1) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), 1 - i));
  }
  for (let d = 1; d <= last.getDate(); d += 1) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), d));
  }
  while (cells.length % 7 !== 0) {
    const lastCell = cells[cells.length - 1];
    cells.push(new Date(lastCell.getFullYear(), lastCell.getMonth(), lastCell.getDate() + 1));
  }
  while (cells.length < 42) {
    const lastCell = cells[cells.length - 1];
    cells.push(new Date(lastCell.getFullYear(), lastCell.getMonth(), lastCell.getDate() + 1));
  }
  return cells;
};

const toISO = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const UnifiedCalendarView = () => {
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selectedISO, setSelectedISO] = useState<string>(() => toISO(new Date()));
  const [activeCategories, setActiveCategories] = useState<Set<UnifiedEventCategory>>(
    () => new Set(CATEGORY_OPTIONS.map((opt) => opt.key)),
  );

  const monthCells = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const rangeStart = monthCells[0];
  const rangeEnd = monthCells[monthCells.length - 1];

  const { data: events = [], isLoading } = useUnifiedCalendar({ rangeStart, rangeEnd });

  const filteredEvents = useMemo(
    () => events.filter((event) => activeCategories.has(event.category)),
    [events, activeCategories],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, UnifiedCalendarEvent[]>();
    filteredEvents.forEach((event) => {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    });
    return map;
  }, [filteredEvents]);

  const selectedEvents = eventsByDay.get(selectedISO) ?? [];

  const toggleCategory = (key: UnifiedEventCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setAnchor(today);
    setSelectedISO(toISO(today));
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Visión global"
        title="Calendario unificado"
        description="Tareas, vacaciones, ITV, inspecciones y festivos en una sola vista."
      />

      {/* Filtros */}
      <div className="panel-surface flex flex-wrap items-center gap-2 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Capas
        </span>
        {CATEGORY_OPTIONS.map((opt) => {
          const style = getCategoryStyle(opt.key);
          const isActive = activeCategories.has(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggleCategory(opt.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                isActive
                  ? `${style.bg} ${style.fg} border-transparent`
                  : "border-border/70 bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", style.bg.replace("/15", ""))} />
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Calendario */}
        <div className="panel-surface px-4 py-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="min-w-[180px] text-lg font-semibold text-foreground">
                {formatMonth(anchor)}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={goToToday} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" />
              Hoy
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((cell, idx) => {
              const iso = toISO(cell);
              const inMonth = cell.getMonth() === anchor.getMonth();
              const isSelected = iso === selectedISO;
              const isToday = iso === toISO(new Date());
              const dayEvents = eventsByDay.get(iso) ?? [];

              return (
                <button
                  key={`${iso}-${idx}`}
                  type="button"
                  onClick={() => setSelectedISO(iso)}
                  className={cn(
                    "flex min-h-[72px] flex-col items-stretch gap-1 rounded-lg border px-1.5 py-1.5 text-left transition-all",
                    inMonth ? "bg-card" : "bg-muted/40",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border/60 hover:border-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      inMonth ? "text-foreground" : "text-muted-foreground/60",
                      isToday && "text-primary",
                    )}
                  >
                    {cell.getDate()}
                  </span>
                  <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((event) => {
                      const style = getCategoryStyle(event.category);
                      return (
                        <span
                          key={event.id}
                          className={cn(
                            "truncate rounded px-1 py-0.5 text-[10px] font-medium",
                            style.bg,
                            style.fg,
                          )}
                          title={event.title}
                        >
                          {event.title}
                        </span>
                      );
                    })}
                    {dayEvents.length > 3 ? (
                      <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <p className="mt-3 text-xs text-muted-foreground">Cargando eventos…</p>
          ) : null}
        </div>

        {/* Detalle del día */}
        <aside className="panel-surface flex flex-col px-4 py-5">
          <h3 className="text-sm font-semibold text-foreground">
            {formatLongDate(selectedISO)}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {selectedEvents.length} evento{selectedEvents.length === 1 ? "" : "s"}
          </p>

          <div className="mt-4 flex flex-col gap-2">
            {selectedEvents.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
                Sin eventos para este día.
              </p>
            ) : (
              selectedEvents.map((event) => {
                const style = getCategoryStyle(event.category);
                return (
                  <div
                    key={event.id}
                    className={cn("rounded-lg border border-border/70 px-3 py-2.5", style.bg)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm font-semibold", style.fg)}>{event.title}</p>
                      <Badge variant="outline" className="text-[10px]">{style.label}</Badge>
                    </div>
                    {event.meta?.workerName && event.category !== "vacation" ? (
                      <p className="mt-1 text-xs text-muted-foreground">{event.meta.workerName}</p>
                    ) : null}
                    {event.meta?.shift ? (
                      <p className="mt-1 text-xs text-muted-foreground">Turno: {event.meta.shift}</p>
                    ) : null}
                    {event.meta?.priority ? (
                      <p className="mt-1 text-xs text-muted-foreground">Prioridad: {event.meta.priority}</p>
                    ) : null}
                    {event.meta?.notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">{event.meta.notes}</p>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default UnifiedCalendarView;
