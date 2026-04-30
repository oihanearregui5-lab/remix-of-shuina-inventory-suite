import { useEffect, useMemo, useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart3, Droplet, TrendingUp, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Legend } from "recharts";

type ItemKey = "hydraulic_oil" | "engine_oil" | "coolant" | "adblue";

interface LogRow {
  id: string;
  machine_id: string;
  log_date: string;
  hydraulic_oil_done: boolean;
  hydraulic_oil_liters: number | null;
  engine_oil_done: boolean;
  engine_oil_liters: number | null;
  coolant_done: boolean;
  coolant_liters: number | null;
  adblue_done: boolean;
  adblue_liters: number | null;
}

interface Machine { id: string; display_name: string }

const ITEM_LABELS: Record<ItemKey, string> = {
  hydraulic_oil: "Aceite hidráulico",
  engine_oil: "Aceite motor",
  coolant: "Anticongelante",
  adblue: "AdBlue",
};

const COLORS: Record<ItemKey, string> = {
  hydraulic_oil: "hsl(var(--primary))",
  engine_oil: "hsl(var(--destructive))",
  coolant: "hsl(var(--info))",
  adblue: "hsl(var(--success))",
};

const ITEMS: ItemKey[] = ["hydraulic_oil", "engine_oil", "coolant", "adblue"];

const litersOf = (row: LogRow, key: ItemKey): number => {
  const done = row[`${key}_done` as keyof LogRow] as boolean;
  if (!done) return 0;
  return Number(row[`${key}_liters` as keyof LogRow] ?? 0);
};

const MaintenanceAnalyticsView = () => {
  const db = supabase as any;
  const [machines, setMachines] = useState<Machine[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthsBack, setMonthsBack] = useState<number>(6);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthsBack]);

  const load = async () => {
    setLoading(true);
    const since = format(startOfMonth(subMonths(new Date(), monthsBack - 1)), "yyyy-MM-dd");
    const [{ data: m }, { data: l }] = await Promise.all([
      db.from("machine_assets").select("id, display_name").order("display_name"),
      db.from("machine_maintenance_log").select("*").gte("log_date", since).order("log_date"),
    ]);
    setMachines((m ?? []) as Machine[]);
    setLogs((l ?? []) as LogRow[]);
    setLoading(false);
  };

  const machineNameMap = useMemo(() => {
    const map = new Map<string, string>();
    machines.forEach((m) => map.set(m.id, m.display_name));
    return map;
  }, [machines]);

  // Totales por máquina × tipo
  const perMachineTotals = useMemo(() => {
    const map = new Map<string, Record<ItemKey, number> & { total: number }>();
    logs.forEach((row) => {
      const cur = map.get(row.machine_id) ?? { hydraulic_oil: 0, engine_oil: 0, coolant: 0, adblue: 0, total: 0 };
      ITEMS.forEach((k) => { cur[k] += litersOf(row, k); });
      cur.total = ITEMS.reduce((s, k) => s + cur[k], 0);
      map.set(row.machine_id, cur);
    });
    return Array.from(map.entries())
      .map(([machineId, totals]) => ({ machineId, name: machineNameMap.get(machineId) ?? "—", ...totals }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [logs, machineNameMap]);

  // Frecuencia: días promedio entre acciones del mismo tipo
  const frequencyByType = useMemo(() => {
    const out: Array<{ machineId: string; name: string } & Partial<Record<ItemKey, number | null>>> = [];
    const grouped = new Map<string, LogRow[]>();
    logs.forEach((row) => {
      const arr = grouped.get(row.machine_id) ?? [];
      arr.push(row);
      grouped.set(row.machine_id, arr);
    });
    grouped.forEach((rows, machineId) => {
      const sorted = [...rows].sort((a, b) => a.log_date.localeCompare(b.log_date));
      const stats: Partial<Record<ItemKey, number | null>> = {};
      ITEMS.forEach((k) => {
        const dates = sorted.filter((r) => (r[`${k}_done` as keyof LogRow] as boolean)).map((r) => new Date(r.log_date + "T00:00:00"));
        if (dates.length < 2) {
          stats[k] = dates.length === 1 ? null : null;
          return;
        }
        let total = 0;
        for (let i = 1; i < dates.length; i++) {
          total += differenceInDays(dates[i], dates[i - 1]);
        }
        stats[k] = Math.round(total / (dates.length - 1));
      });
      out.push({ machineId, name: machineNameMap.get(machineId) ?? "—", ...stats });
    });
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [logs, machineNameMap]);

  // Evolución temporal por mes y tipo
  const monthlyEvolution = useMemo(() => {
    const map = new Map<string, Record<ItemKey, number>>();
    logs.forEach((row) => {
      const monthKey = row.log_date.slice(0, 7); // yyyy-MM
      const cur = map.get(monthKey) ?? { hydraulic_oil: 0, engine_oil: 0, coolant: 0, adblue: 0 };
      ITEMS.forEach((k) => { cur[k] += litersOf(row, k); });
      map.set(monthKey, cur);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, vals]) => ({
        month: format(new Date(m + "-01T00:00:00"), "MMM yy", { locale: es }),
        ...vals,
      }));
  }, [logs]);

  const totalLitersAll = useMemo(
    () => perMachineTotals.reduce((s, r) => s + r.total, 0),
    [perMachineTotals],
  );

  const totalsByType = useMemo(() => {
    const out: Record<ItemKey, number> = { hydraulic_oil: 0, engine_oil: 0, coolant: 0, adblue: 0 };
    logs.forEach((row) => {
      ITEMS.forEach((k) => { out[k] += litersOf(row, k); });
    });
    return out;
  }, [logs]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando consumos…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Periodo:</span>
        <Select value={String(monthsBack)} onValueChange={(v) => setMonthsBack(Number(v))}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
            <SelectItem value="24">Últimos 24 meses</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">{logs.length} registros · {totalLitersAll.toFixed(1)} L totales</span>
      </div>

      {/* KPIs por tipo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((k) => (
          <article key={k} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Droplet className="h-3.5 w-3.5" style={{ color: COLORS[k] }} /> {ITEM_LABELS[k]}
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{totalsByType[k].toFixed(1)} L</p>
          </article>
        ))}
      </div>

      {/* Evolución temporal */}
      <section className="rounded-xl border border-border bg-card p-4">
        <header className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Evolución mensual de consumos (litros)</h3>
        </header>
        {monthlyEvolution.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos en el periodo.</p>
        ) : (
          <ChartContainer
            config={ITEMS.reduce((acc, k) => ({ ...acc, [k]: { label: ITEM_LABELS[k], color: COLORS[k] } }), {})}
            className="h-72 w-full"
          >
            <LineChart data={monthlyEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              {ITEMS.map((k) => (
                <Line key={k} type="monotone" dataKey={k} name={ITEM_LABELS[k]} stroke={COLORS[k]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </section>

      {/* Comparativa máquinas */}
      <section className="rounded-xl border border-border bg-card p-4">
        <header className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Comparativa entre máquinas</h3>
        </header>
        {perMachineTotals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos en el periodo.</p>
        ) : (
          <ChartContainer
            config={ITEMS.reduce((acc, k) => ({ ...acc, [k]: { label: ITEM_LABELS[k], color: COLORS[k] } }), {})}
            className="h-80 w-full"
          >
            <BarChart data={perMachineTotals.slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} angle={-20} textAnchor="end" height={70} interval={0} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              {ITEMS.map((k) => (
                <Bar key={k} dataKey={k} stackId="a" name={ITEM_LABELS[k]} fill={COLORS[k]} />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </section>

      {/* Tabla detallada */}
      <section className="rounded-xl border border-border bg-card p-4">
        <header className="mb-3 flex items-center gap-2">
          <Droplet className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Detalle por máquina</h3>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Máquina</th>
                {ITEMS.map((k) => (
                  <th key={k} className="py-2 pr-3 text-right">{ITEM_LABELS[k]}</th>
                ))}
                <th className="py-2 pr-3 text-right">Total L</th>
              </tr>
            </thead>
            <tbody>
              {perMachineTotals.length === 0 ? (
                <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">Sin datos.</td></tr>
              ) : perMachineTotals.map((r) => (
                <tr key={r.machineId} className="border-b border-border/50">
                  <td className="py-2 pr-3 font-medium text-foreground">{r.name}</td>
                  {ITEMS.map((k) => (
                    <td key={k} className="py-2 pr-3 text-right tabular-nums">{r[k] > 0 ? r[k].toFixed(1) : "—"}</td>
                  ))}
                  <td className="py-2 pr-3 text-right font-bold text-primary tabular-nums">{r.total.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Frecuencia */}
      <section className="rounded-xl border border-border bg-card p-4">
        <header className="mb-3 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Frecuencia (días promedio entre cada mantenimiento)</h3>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Máquina</th>
                {ITEMS.map((k) => (
                  <th key={k} className="py-2 pr-3 text-right">{ITEM_LABELS[k]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {frequencyByType.length === 0 ? (
                <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Sin datos.</td></tr>
              ) : frequencyByType.map((r) => (
                <tr key={r.machineId} className="border-b border-border/50">
                  <td className="py-2 pr-3 font-medium text-foreground">{r.name}</td>
                  {ITEMS.map((k) => (
                    <td key={k} className="py-2 pr-3 text-right tabular-nums">
                      {r[k] == null ? <span className="text-muted-foreground">—</span> : `${r[k]} días`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default MaintenanceAnalyticsView;
