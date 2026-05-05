import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTranstubariData } from "@/hooks/useTranstubariData";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { normalizeKey } from "@/components/admin/vacations/journeys-constants";
import { toDateKey, getMonthMatrix, getContrastTextColor } from "@/components/admin/vacations/vacation-utils";
import type { ShiftCode } from "@/components/admin/vacations/journeys-constants";

type ViewMode = "week" | "month" | "year";

const SHIFT_CODES: ShiftCode[] = ["M", "T", "N"];
const SHIFT_LABELS: Record<ShiftCode, string> = { M: "Mañana", T: "Tarde", N: "Noche" };

interface OverrideRow {
  journey_date: string;
  shift: ShiftCode;
  staff_member_id: string | null;
  color: string | null;
}

const MyJourneyView = () => {
  const { user, profile } = useAuth();
  const { data, loading, error } = useTranstubariData();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [myStaffId, setMyStaffId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Map<string, OverrideRow>>(new Map());
  const [loadingOverrides, setLoadingOverrides] = useState(false);

  // Resolve current user's staff_directory id
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: row } = await supabase
        .from("staff_directory")
        .select("id")
        .eq("linked_user_id", user.id)
        .maybeSingle();
      setMyStaffId(row?.id ?? null);
    })();
  }, [user]);

  // Excel worker id (lowercase name) — best-effort match by full_name
  const myExcelWorkerId = useMemo(() => {
    if (!data || !profile?.full_name) return null;
    const key = normalizeKey(profile.full_name);
    const match = data.workers.find((w) => normalizeKey(w.name) === key || normalizeKey(w.id) === key);
    return match?.id ?? null;
  }, [data, profile?.full_name]);

  const myExcelWorker = useMemo(
    () => (myExcelWorkerId && data ? data.workers.find((w) => w.id === myExcelWorkerId) ?? null : null),
    [data, myExcelWorkerId],
  );

  // Date range based on view
  const range = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      return { start, end: endOfWeek(anchor, { weekStartsOn: 1 }) };
    }
    if (viewMode === "month") {
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    }
    return {
      start: new Date(anchor.getFullYear(), 0, 1),
      end: new Date(anchor.getFullYear(), 11, 31),
    };
  }, [viewMode, anchor]);

  // Load my overrides for the visible range
  useEffect(() => {
    if (!myStaffId) {
      setOverrides(new Map());
      return;
    }
    setLoadingOverrides(true);
    (async () => {
      const { data: rows, error: err } = await supabase
        .from("staff_journeys")
        .select("journey_date, shift, staff_member_id, color")
        .eq("staff_member_id", myStaffId)
        .gte("journey_date", toDateKey(range.start))
        .lte("journey_date", toDateKey(range.end));
      if (err) {
        console.error("Error cargando mis jornadas", err);
        setLoadingOverrides(false);
        return;
      }
      const map = new Map<string, OverrideRow>();
      (rows ?? []).forEach((row) => {
        const shift = row.shift as ShiftCode;
        if (!SHIFT_CODES.includes(shift)) return;
        map.set(`${row.journey_date}__${shift}`, row as OverrideRow);
      });
      setOverrides(map);
      setLoadingOverrides(false);
    })();
  }, [myStaffId, range.start, range.end]);

  // For a given date+shift, decide if I work that turn (override has priority over Excel)
  const getMyShiftForDay = (date: Date): ShiftCode | null => {
    const dateKey = toDateKey(date);
    // Check overrides first
    for (const code of SHIFT_CODES) {
      if (overrides.has(`${dateKey}__${code}`)) return code;
    }
    // Fallback to Excel
    if (!data || !myExcelWorkerId) return null;
    const dayShifts = data.shifts[`${date.getMonth() + 1}-${date.getDate()}`];
    if (!dayShifts) return null;
    for (const code of SHIFT_CODES) {
      if (dayShifts[code] === myExcelWorkerId) return code;
    }
    return null;
  };

  const myColor = myExcelWorker?.color ?? "hsl(var(--primary))";
  const myColorText = getContrastTextColor(myColor);

  const navigate = (dir: 1 | -1) => {
    if (viewMode === "week") setAnchor((c) => addDays(c, dir * 7));
    else if (viewMode === "month") setAnchor((c) => addMonths(c, dir));
    else setAnchor((c) => new Date(c.getFullYear() + dir, 0, 1));
  };

  const periodLabel = useMemo(() => {
    if (viewMode === "week") {
      const s = startOfWeek(anchor, { weekStartsOn: 1 });
      const e = endOfWeek(anchor, { weekStartsOn: 1 });
      return `${format(s, "d MMM", { locale: es })} – ${format(e, "d MMM yyyy", { locale: es })}`;
    }
    if (viewMode === "month") return format(anchor, "MMMM yyyy", { locale: es });
    return String(anchor.getFullYear());
  }, [viewMode, anchor]);

  // Mapa de festivos/cierres por fecha (YYYY-MM-DD)
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, { label: string; type: string; color: string }>();
    Object.values(data?.holidays ?? {}).forEach((h: any) => {
      map.set(h.date, { label: h.label, type: h.type, color: h.color });
    });
    return map;
  }, [data?.holidays]);

  // Counters
  const counters = useMemo(() => {
    if (!data) return { M: 0, T: 0, N: 0, total: 0 };
    const days = eachDayOfInterval({ start: range.start, end: range.end });
    const c = { M: 0, T: 0, N: 0, total: 0 };
    days.forEach((d) => {
      const code = getMyShiftForDay(d);
      if (code) {
        c[code] += 1;
        c.total += 1;
      }
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, overrides, myExcelWorkerId, range.start, range.end]);

  if (loading) {
    return (
      <div className="panel-surface p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando tu jornada anual…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="panel-surface p-6">
        <p className="text-sm font-semibold text-foreground">No se pudo cargar el calendario de jornadas.</p>
        <p className="mt-1 text-xs text-muted-foreground">{error ?? "Faltan datos del Excel."}</p>
      </div>
    );
  }

  if (!myStaffId && !myExcelWorkerId) {
    return (
      <div className="panel-surface p-6">
        <p className="text-sm font-semibold text-foreground">No encontramos tu perfil en la planilla.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pide al administrador que vincule tu usuario al directorio de personal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header / controls */}
      <div className="panel-surface flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">
            Mi jornada {profile?.full_name ? `· ${profile.full_name}` : ""}
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-muted p-1">
          {(["week", "month", "year"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewMode(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === v ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
              )}
            >
              {v === "week" ? "Semana" : v === "month" ? "Mes" : "Año"}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center rounded-lg bg-muted p-1">
          <Button type="button" size="icon" variant="ghost" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[160px] px-3 text-center text-sm font-bold capitalize text-foreground">
            {periodLabel}
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setAnchor(new Date())}>
            Hoy
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const start = startOfMonth(anchor);
              const end = endOfMonth(anchor);
              const days = eachDayOfInterval({ start, end });
              const lines: string[] = ["Fecha,Día,Turno"];
              days.forEach((d) => {
                const code = getMyShiftForDay(d) ?? "";
                lines.push(`${format(d, "yyyy-MM-dd")},${format(d, "EEE", { locale: es })},${code}`);
              });
              const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `mi-jornada-${format(anchor, "yyyy-MM")}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4" /> Exportar mes
          </Button>
        </div>
      </div>

      {/* Leyenda M / T / N */}
      <div className="panel-surface flex flex-wrap items-center gap-3 px-4 py-2 text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider">Leyenda:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded font-bold text-[10px]" style={{ backgroundColor: myColor, color: myColorText }}>M</span>
          Mañana
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded font-bold text-[10px]" style={{ backgroundColor: myColor, color: myColorText }}>T</span>
          Tarde
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded font-bold text-[10px]" style={{ backgroundColor: myColor, color: myColorText }}>N</span>
          Noche
        </span>
        <span className="ml-auto">Solo se muestran tus turnos asignados.</span>
      </div>

      {/* Counters */}
      <div className="grid gap-3 md:grid-cols-4">
        <div className="panel-surface p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Total turnos</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{counters.total}</p>
        </div>
        <div className="panel-surface p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Mañanas</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{counters.M}</p>
        </div>
        <div className="panel-surface p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Tardes</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{counters.T}</p>
        </div>
        <div className="panel-surface p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Noches</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{counters.N}</p>
        </div>
      </div>

      {/* Body */}
      <div className="panel-surface p-4">
        {loadingOverrides ? (
          <p className="text-xs text-muted-foreground">Sincronizando con la planilla…</p>
        ) : null}

        {viewMode === "week" ? (
          <WeekGrid anchor={anchor} getMyShiftForDay={getMyShiftForDay} myColor={myColor} myColorText={myColorText} holidaysByDate={holidaysByDate} />
        ) : null}

        {viewMode === "month" ? (
          <MonthGrid anchor={anchor} getMyShiftForDay={getMyShiftForDay} myColor={myColor} myColorText={myColorText} holidaysByDate={holidaysByDate} />
        ) : null}

        {viewMode === "year" ? (
          <YearGrid year={anchor.getFullYear()} getMyShiftForDay={getMyShiftForDay} myColor={myColor} myColorText={myColorText} holidaysByDate={holidaysByDate} />
        ) : null}
      </div>
    </div>
  );
};

// ============ Sub-views ============

interface ViewProps {
  getMyShiftForDay: (date: Date) => ShiftCode | null;
  myColor: string;
  myColorText: string;
  holidaysByDate: Map<string, { label: string; type: string; color: string }>;
}

const isFactoryClosure = (type: string) =>
  type === "cierre_fabrica" || /cierre/i.test(type);

const ShiftCell = ({ code, color, textColor, compact = false }: { code: ShiftCode | null; color: string; textColor: string; compact?: boolean }) => {
  if (!code) {
    return <span className="text-[11px] italic text-muted-foreground">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-extrabold",
        compact ? "h-5 min-w-5 px-1 text-[10px]" : "h-7 min-w-7 px-2 text-xs",
      )}
      style={{ backgroundColor: color, color: textColor }}
      title={SHIFT_LABELS[code]}
    >
      {code}
    </span>
  );
};

const WeekGrid = ({ anchor, getMyShiftForDay, myColor, myColorText, holidaysByDate }: ViewProps & { anchor: Date }) => {
  const days = eachDayOfInterval({
    start: startOfWeek(anchor, { weekStartsOn: 1 }),
    end: endOfWeek(anchor, { weekStartsOn: 1 }),
  });
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {days.map((d) => {
              const h = holidaysByDate.get(format(d, "yyyy-MM-dd"));
              return (
                <th key={d.toISOString()} className="border-b border-border px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
                  <div className="capitalize">{format(d, "EEE", { locale: es })}</div>
                  <div className="text-base font-bold text-foreground">{format(d, "d")}</div>
                  {h ? (
                    <div
                      className="mt-0.5 truncate rounded px-1 py-0.5 text-[9px] font-semibold"
                      style={{ backgroundColor: h.color || "hsl(var(--muted))", color: getContrastTextColor(h.color || "#888") }}
                      title={h.label}
                    >
                      {h.label}
                    </div>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {SHIFT_CODES.map((code) => (
            <tr key={code}>
              {days.map((d) => {
                const my = getMyShiftForDay(d);
                const active = my === code;
                const h = holidaysByDate.get(format(d, "yyyy-MM-dd"));
                const closure = h && isFactoryClosure(h.type) && !my;
                return (
                  <td key={d.toISOString()} className="border-b border-border/50 p-2 text-center">
                    {closure && code === "M" ? (
                      <span className="block rounded bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                        Cierre fábrica
                      </span>
                    ) : closure ? (
                      <span className="text-[11px] italic text-muted-foreground/40">—</span>
                    ) : active ? (
                      <ShiftCell code={code} color={myColor} textColor={myColorText} />
                    ) : (
                      <span className="text-[11px] italic text-muted-foreground/60">{code}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const MonthGrid = ({ anchor, getMyShiftForDay, myColor, myColorText, holidaysByDate }: ViewProps & { anchor: Date }) => {
  const grid = getMonthMatrix(anchor);
  const monthIndex = anchor.getMonth();
  const weekHeaders = ["L", "M", "X", "J", "V", "S", "D"];
  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {weekHeaders.map((h) => (
          <div key={h}>{h}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.flat().map((d) => {
          const inMonth = d.getMonth() === monthIndex;
          const my = getMyShiftForDay(d);
          const h = holidaysByDate.get(format(d, "yyyy-MM-dd"));
          const closure = h && isFactoryClosure(h.type);
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "flex min-h-[68px] flex-col items-stretch gap-1 rounded-lg border border-border/60 p-1.5",
                inMonth ? "bg-card" : "bg-muted/40",
                closure && inMonth ? "bg-muted" : "",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={cn("text-xs font-semibold", inMonth ? "text-foreground" : "text-muted-foreground/60")}>
                  {d.getDate()}
                </span>
                {h && !closure && inMonth ? (
                  <span
                    className="truncate rounded px-1 text-[9px] font-semibold"
                    style={{ backgroundColor: h.color || "hsl(var(--primary))", color: getContrastTextColor(h.color || "#888") }}
                    title={h.label}
                  >
                    {h.label}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 items-center justify-center">
                {closure && !my ? (
                  <span className="rounded bg-muted-foreground/15 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                    Cierre fábrica
                  </span>
                ) : (
                  <ShiftCell code={my} color={myColor} textColor={myColorText} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const YearGrid = ({ year, getMyShiftForDay, myColor, myColorText, holidaysByDate }: ViewProps & { year: number }) => {
  const months = Array.from({ length: 12 }, (_, m) => m);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border-b border-border bg-card px-2 py-2 text-left font-semibold text-muted-foreground">Mes</th>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <th key={d} className="border-b border-border px-1 py-2 text-center text-[10px] font-semibold text-muted-foreground">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {months.map((m) => {
            const lastDay = new Date(year, m + 1, 0).getDate();
            return (
              <tr key={m}>
                <td className="sticky left-0 z-10 border-b border-border/50 bg-card px-2 py-1 text-left text-[11px] font-semibold capitalize text-foreground">
                  {format(new Date(year, m, 1), "MMM", { locale: es })}
                </td>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  if (day > lastDay) {
                    return <td key={day} className="border-b border-border/30 bg-muted/30 px-1 py-1" />;
                  }
                  const date = new Date(year, m, day);
                  const my = getMyShiftForDay(date);
                  return (
                    <td key={day} className="border-b border-border/50 p-0.5 text-center">
                      <ShiftCell code={my} color={myColor} textColor={myColorText} compact />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MyJourneyView;
