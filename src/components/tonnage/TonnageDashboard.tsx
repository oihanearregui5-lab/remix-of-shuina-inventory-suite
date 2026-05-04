import { useEffect, useMemo, useState } from "react";
import { Download, Filter, RefreshCw } from "lucide-react";
import { format, getDaysInMonth, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import XLSX from "xlsx-js-style";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  computeZoneSummaries,
  formatKg,
  formatTons,
  useTonnage,
  type TripType,
} from "@/hooks/useTonnage";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const ALL_VALUE = "__all__";

const TonnageDashboard = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const { trucks, zones, trips, loading, reload } = useTonnage(currentMonth, { includeInactive: true });

  // Filtros del dashboard
  const [filterDay, setFilterDay] = useState<string>(ALL_VALUE);
  const [filterDriverId, setFilterDriverId] = useState<string>(ALL_VALUE);
  const [filterTruckId, setFilterTruckId] = useState<string>(ALL_VALUE);
  const [filterType, setFilterType] = useState<TripType | typeof ALL_VALUE>(ALL_VALUE);

  // Mapa userId → nombre, lo cargo desde profiles
  const [driverNames, setDriverNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const loadDrivers = async () => {
      const ids = Array.from(new Set(trips.map((t) => t.created_by_user_id).filter(Boolean) as string[]));
      if (ids.length === 0) return;
      const { data } = await (supabase as any).from("profiles").select("user_id, full_name").in("user_id", ids);
      const m = new Map<string, string>();
      ((data ?? []) as Array<{ user_id: string; full_name: string }>).forEach((row) => {
        m.set(row.user_id, row.full_name || "Sin nombre");
      });
      setDriverNames(m);
    };
    void loadDrivers();
  }, [trips]);

  // Aplicación de filtros sobre los viajes ya cargados del mes
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      if (filterDay !== ALL_VALUE) {
        const day = new Date(t.trip_date).getDate();
        if (day !== parseInt(filterDay, 10)) return false;
      }
      if (filterDriverId !== ALL_VALUE && t.created_by_user_id !== filterDriverId) return false;
      if (filterTruckId !== ALL_VALUE && t.truck_id !== filterTruckId) return false;
      if (filterType !== ALL_VALUE && (t.trip_type ?? "tolva") !== filterType) return false;
      return true;
    });
  }, [trips, filterDay, filterDriverId, filterTruckId, filterType]);

  const totalTrips = filteredTrips.length;
  const totalKg = filteredTrips.reduce((acc, t) => acc + Number(t.weight_kg), 0);

  // Materiales — conteo de viajes por material_snapshot (case-insensitive).
  // "tortas" y "sulfatos" se cuentan explícitamente; cualquier otro valor
  // (incluido vacío o "Arenas A/B") se cuenta como "arenas".
  const materials = useMemo(() => {
    let tortas = 0, sulfatos = 0, arenas = 0;
    filteredTrips.forEach((t) => {
      const raw = (t.material_snapshot ?? "").toString().trim().toLowerCase();
      if (raw.startsWith("torta")) tortas += 1;
      else if (raw.startsWith("sulfat")) sulfatos += 1;
      else if (raw.startsWith("arena")) arenas += 1; // "general" y otros NO cuentan
    });
    return { arenas, tortas, sulfatos };
  }, [filteredTrips]);

  // Zonas (carga)
  const loadZoneSummaries = useMemo(
    () => computeZoneSummaries(filteredTrips, zones, "load_zone_id").filter((z) => z.tripCount > 0).sort((a, b) => b.tripCount - a.tripCount),
    [filteredTrips, zones],
  );

  // Viajes por día (gráfico)
  const daysInMonth = getDaysInMonth(currentMonth);
  const tripsPerDay = useMemo(() => {
    const counts = new Map<number, number>();
    filteredTrips.forEach((t) => {
      const d = new Date(t.trip_date).getDate();
      counts.set(d, (counts.get(d) || 0) + 1);
    });
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return { day: String(day), viajes: counts.get(day) || 0 };
    });
  }, [filteredTrips, daysInMonth]);

  const dailyAvg = useMemo(() => {
    const daysWithTrips = tripsPerDay.filter((d) => d.viajes > 0).length;
    if (daysWithTrips === 0) return 0;
    return Math.round(totalTrips / daysWithTrips);
  }, [tripsPerDay, totalTrips]);

  // Viajes por conductor (gráfico de barras)
  const driverChart = useMemo(() => {
    const counts = new Map<string, number>();
    filteredTrips.forEach((t) => {
      if (!t.created_by_user_id) return;
      counts.set(t.created_by_user_id, (counts.get(t.created_by_user_id) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([id, count]) => ({ name: (driverNames.get(id) || "Sin nombre").toUpperCase(), viajes: count }))
      .sort((a, b) => b.viajes - a.viajes);
  }, [filteredTrips, driverNames]);

  const monthIdx = currentMonth.getMonth();
  const year = currentMonth.getFullYear();

  const exportMonthExcel = (mode: "tolva" | "all") => {
    const source = trips.filter((t) => mode === "all" || (t.trip_type ?? "tolva") === "tolva");
    if (source.length === 0) {
      toast.error("No hay viajes para exportar en este mes");
      return;
    }

    // Camiones reales activos ordenados por truck_number
    const orderedTrucks = [...trucks]
      .filter((t) => t.is_active !== false)
      .sort((a, b) => (a.truck_number ?? 0) - (b.truck_number ?? 0));
    if (orderedTrucks.length === 0) {
      toast.error("No hay camiones configurados");
      return;
    }
    const numTrucks = orderedTrucks.length;

    const monthName = MONTHS[monthIdx];
    const monthUpper = monthName.toUpperCase();
    const yearShort = String(year).slice(-2);
    const sheetName = `${monthUpper} ${yearShort}`;

    // Estilos reutilizables
    const FONT = { name: "Arial", sz: 10 };
    const FONT_BOLD = { name: "Arial", sz: 10, bold: true };
    const ALIGN_CENTER = { horizontal: "center", vertical: "center", wrapText: true };
    const BORDER_THIN = { style: "thin", color: { rgb: "000000" } };
    const BORDER_MEDIUM = { style: "medium", color: { rgb: "000000" } };

    const lastTruckColIdx = 1 + numTrucks - 1; // A=0, B=1, ..., último camión
    const lastTruckColLetter = XLSX.utils.encode_col(lastTruckColIdx);

    // Construye matriz: A=día, B..= camiones
    const aoa: any[][] = [];
    aoa.push([]); // Fila 1 vacía

    // Fila 2: [mes, "Camiones", null, null, ...]
    const row2: any[] = [monthName, "Camiones"];
    for (let i = 2; i < 1 + numTrucks; i++) row2.push(null);
    aoa.push(row2);

    // Fila 3: [null, 1, 2, 3, ..., N]
    const row3: any[] = [null];
    for (let i = 1; i <= numTrucks; i++) row3.push(i);
    aoa.push(row3);

    // Filas 4..: día + pesos por camión
    for (let day = 1; day <= daysInMonth; day++) {
      const row: any[] = [day];
      for (const truck of orderedTrucks) {
        const trip = source.find((t) => {
          const d = new Date(t.trip_date);
          return d.getDate() === day && d.getMonth() === monthIdx && d.getFullYear() === year && t.truck_id === truck.id;
        });
        row.push(trip ? Number(trip.weight_kg) : null);
      }
      aoa.push(row);
    }

    // Fila Total
    const totalRow: any[] = ["Total"];
    for (let i = 0; i < numTrucks; i++) totalRow.push(null);
    aoa.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Anchos
    ws["!cols"] = [
      { wch: 9.14 },
      { wch: 11.28 },
      ...Array(Math.max(0, numTrucks - 1)).fill({ wch: 13 }),
    ];

    // Alturas: fila 1 =15.75, filas 2 y 3 = 28.5
    ws["!rows"] = [
      { hpt: 15.75 },
      { hpt: 28.5 },
      { hpt: 28.5 },
    ];

    // Merge B2:lastTruckCol2
    ws["!merges"] = [
      { s: { r: 1, c: 1 }, e: { r: 1, c: lastTruckColIdx } },
    ];

    const lastDataRow = 3 + daysInMonth; // 0-indexed último día
    const totalRowIdx = lastDataRow + 1;

    // Aplicar estilos celda a celda
    const setCell = (r: number, c: number, style: any) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: "z", v: null };
      ws[ref].s = { ...(ws[ref].s || {}), ...style };
    };

    // Fila 2: A2 (mes) y B2 (Camiones merged)
    setCell(1, 0, { font: FONT_BOLD, alignment: ALIGN_CENTER });
    setCell(1, 1, {
      font: FONT_BOLD,
      alignment: ALIGN_CENTER,
      border: { top: BORDER_MEDIUM, left: BORDER_MEDIUM },
    });

    // Fila 3: números de camión
    for (let c = 1; c <= lastTruckColIdx; c++) {
      const border: any = {};
      if (c === 1) border.left = BORDER_MEDIUM;
      setCell(2, c, { font: FONT_BOLD, alignment: ALIGN_CENTER, border });
    }
    // A3 vacía sin estilo

    // Filas de días
    for (let day = 1; day <= daysInMonth; day++) {
      const r = 2 + day; // fila 4 = índice 3 = day 1
      // Columna A: día
      setCell(r, 0, { font: FONT, alignment: ALIGN_CENTER });
      for (let c = 1; c <= lastTruckColIdx; c++) {
        const border: any = {
          top: BORDER_THIN,
          right: BORDER_THIN,
          bottom: BORDER_THIN,
          left: c === 1 ? BORDER_MEDIUM : BORDER_THIN,
        };
        setCell(r, c, { font: FONT, alignment: ALIGN_CENTER, border });
      }
    }

    // Fila Total
    setCell(totalRowIdx, 0, { font: FONT_BOLD, alignment: ALIGN_CENTER });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const fileName = `Toneladas_${mode === "tolva" ? "TOLVA" : "TODOS"}_${format(currentMonth, "yyyy-MM")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Excel descargado");
  };

  return (
    <div className="space-y-4">
      {/* FILTROS */}
      <section className="panel-surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </div>

          <Select value={String(monthIdx)} onValueChange={(v) => setCurrentMonth(new Date(year, parseInt(v, 10), 1))}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={String(year)} onValueChange={(v) => setCurrentMonth(new Date(parseInt(v, 10), monthIdx, 1))}>
            <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterDay} onValueChange={setFilterDay}>
            <SelectTrigger className="w-28 h-9"><SelectValue placeholder="Día" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos los días</SelectItem>
              {Array.from({ length: daysInMonth }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterDriverId} onValueChange={setFilterDriverId}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Trabajador" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos los trabajadores</SelectItem>
              {Array.from(driverNames.entries()).map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTruckId} onValueChange={setFilterTruckId}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Camión" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos los camiones</SelectItem>
              {trucks.map((t) => <SelectItem key={t.id} value={t.id}>#{t.truck_number} {t.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos los tipos</SelectItem>
              <SelectItem value="tolva">Tolva (facturable)</SelectItem>
              <SelectItem value="acopio">Acopio</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="default" className="ml-auto gap-1.5">
                <Download className="h-3.5 w-3.5" /> Exportar Excel
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportMonthExcel("tolva")}>Solo TOLVA (facturable)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportMonthExcel("all")}>TODOS los viajes</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setFilterDay(ALL_VALUE); setFilterDriverId(ALL_VALUE); setFilterTruckId(ALL_VALUE); setFilterType(ALL_VALUE); }}
            className="text-destructive border-destructive/40 hover:bg-destructive/5"
          >
            Borrar filtros
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => void reload()} title="Actualizar">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
        {/* KPI grande estilo Power BI */}
        <div className="panel-surface flex flex-col items-center justify-center p-6">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <div className="text-center">
              <div className="text-4xl font-bold leading-none">{totalTrips}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide opacity-90">Viajes</div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </p>
          <p className="mt-1 text-center text-sm font-semibold text-foreground">{formatTons(totalKg)} t totales</p>
        </div>

        {/* Gráfico viajes diarios con línea de promedio */}
        <div className="panel-surface p-4">
          <header className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold italic text-foreground">Viajes diarios</p>
            <span className="text-xs text-muted-foreground">
              Promedio: <span className="font-semibold text-foreground">{dailyAvg}</span>
            </span>
          </header>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={tripsPerDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                labelFormatter={(label) => `Día ${label}`}
              />
              <ReferenceLine y={dailyAvg} stroke="hsl(var(--primary))" strokeDasharray="4 4" />
              <Bar dataKey="viajes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Materiales y zonas */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="panel-surface p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Materiales (viajes)</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-warning/15 p-3">
              <p className="text-xs uppercase tracking-wide text-foreground/80">Arenas</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{materials.arenas || "--"}</p>
            </div>
            <div className="rounded-2xl bg-primary/10 p-3">
              <p className="text-xs uppercase tracking-wide text-primary">Tortas</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{materials.tortas || "--"}</p>
            </div>
            <div className="rounded-2xl bg-success/15 p-3">
              <p className="text-xs uppercase tracking-wide text-success">Sulfatos</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{materials.sulfatos || "--"}</p>
            </div>
          </div>
        </div>

        <div className="panel-surface p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Zonas de carga</p>
          {loadZoneSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin viajes con zona registrada todavía.</p>
          ) : (
            <ul className="space-y-1.5">
              {loadZoneSummaries.map((z) => (
                <li key={z.zoneId} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-1.5">
                  <span className="text-sm font-medium text-foreground">{z.label}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{z.tripCount}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Tabla cronológica + Viajes por conductor */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="panel-surface overflow-hidden p-0">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Listado de viajes</p>
            <span className="text-xs text-muted-foreground">{filteredTrips.length} viajes</span>
          </header>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-3 py-2 text-left font-semibold">Hora</th>
                  <th className="px-3 py-2 text-right font-semibold">Peso</th>
                  <th className="px-3 py-2 text-left font-semibold">Trabajador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTrips.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Sin viajes con estos filtros</td></tr>
                ) : filteredTrips.map((t) => {
                  const driverName = (t.created_by_user_id ? driverNames.get(t.created_by_user_id) : null) || "—";
                  return (
                    <tr key={t.id}>
                      <td className="px-3 py-1.5">{format(new Date(t.trip_date), "dd/MM/yy")}</td>
                      <td className="px-3 py-1.5">{t.trip_time ? t.trip_time.slice(0, 5) : "—"}</td>
                      <td className="px-3 py-1.5 text-right font-medium">{formatKg(Number(t.weight_kg))}</td>
                      <td className="px-3 py-1.5 uppercase">{driverName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel-surface p-4">
          <p className="mb-2 text-sm font-semibold italic text-foreground">Viajes por conductor</p>
          {driverChart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin datos de conductores</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={driverChart} margin={{ top: 30, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey="viajes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} label={{ position: "top", fontSize: 11, fill: "hsl(var(--foreground))" }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
};

export default TonnageDashboard;
