import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subDays, startOfYear, endOfYear } from "date-fns";
import { Calendar, Download, FileSpreadsheet, FileText, Filter, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useReportData, MODULE_LABELS, type ReportModule } from "@/hooks/useReportData";
import { exportToCSV, exportToXLSX, type SheetData } from "@/lib/reports-export";
import { cn } from "@/lib/utils";

const MODULES: ReportModule[] = ["fichajes", "partes", "toneladas", "gasolina", "albaranes"];

const todayISO = () => format(new Date(), "yyyy-MM-dd");

interface PresetRange {
  label: string;
  range: () => { start: string; end: string };
}

const PRESETS: PresetRange[] = [
  {
    label: "Hoy",
    range: () => ({ start: todayISO(), end: todayISO() }),
  },
  {
    label: "Últimos 7 días",
    range: () => ({ start: format(subDays(new Date(), 6), "yyyy-MM-dd"), end: todayISO() }),
  },
  {
    label: "Últimos 30 días",
    range: () => ({ start: format(subDays(new Date(), 29), "yyyy-MM-dd"), end: todayISO() }),
  },
  {
    label: "Mes actual",
    range: () => ({
      start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    }),
  },
  {
    label: "Año actual",
    range: () => ({
      start: format(startOfYear(new Date()), "yyyy-MM-dd"),
      end: format(endOfYear(new Date()), "yyyy-MM-dd"),
    }),
  },
];

const ReportsView = () => {
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(todayISO());
  const [userId, setUserId] = useState<string>("all");
  const [selectedModules, setSelectedModules] = useState<Set<ReportModule>>(new Set(MODULES));

  // Lista de trabajadores para el filtro
  const { data: workers } = useQuery({
    queryKey: ["reports-workers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filters = useMemo(
    () => ({
      startDate,
      endDate,
      userId: userId === "all" ? null : userId,
    }),
    [startDate, endDate, userId],
  );

  const modulesArr = useMemo(() => Array.from(selectedModules), [selectedModules]);
  const { data, isFetching, refetch } = useReportData(modulesArr, filters, modulesArr.length > 0);

  const totalRows = useMemo(() => {
    if (!data) return 0;
    return modulesArr.reduce((sum, m) => sum + (data[m]?.length ?? 0), 0);
  }, [data, modulesArr]);

  const toggleModule = (m: ReportModule) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  const applyPreset = (preset: PresetRange) => {
    const r = preset.range();
    setStartDate(r.start);
    setEndDate(r.end);
  };

  const handleExportCSV = (module: ReportModule) => {
    if (!data) return;
    const rows = data[module] ?? [];
    if (rows.length === 0) {
      toast.warning(`No hay datos de ${MODULE_LABELS[module]} en este rango.`);
      return;
    }
    exportToCSV(rows, `transtubari_${module}_${startDate}_${endDate}`);
    toast.success(`CSV de ${MODULE_LABELS[module]} descargado.`);
  };

  const handleExportXLSXAll = () => {
    if (!data) return;
    const sheets: SheetData[] = modulesArr.map((m) => ({
      name: MODULE_LABELS[m],
      rows: data[m] ?? [],
    }));
    if (sheets.every((s) => s.rows.length === 0)) {
      toast.warning("No hay datos en ninguno de los módulos seleccionados.");
      return;
    }
    exportToXLSX(sheets, `transtubari_reporte_${startDate}_${endDate}`);
    toast.success("Excel descargado.");
  };

  const handleExportXLSXModule = (module: ReportModule) => {
    if (!data) return;
    const rows = data[module] ?? [];
    if (rows.length === 0) {
      toast.warning(`No hay datos de ${MODULE_LABELS[module]}.`);
      return;
    }
    exportToXLSX([{ name: MODULE_LABELS[module], rows }], `transtubari_${module}_${startDate}_${endDate}`);
    toast.success(`Excel de ${MODULE_LABELS[module]} descargado.`);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground md:text-2xl">Reportes y exportaciones</h2>
        <p className="text-sm text-muted-foreground">
          Consulta y descarga datos consolidados de los 5 módulos en CSV o Excel.
        </p>
      </header>

      {/* Filtros */}
      <section className="panel-surface space-y-5 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Filter className="h-4 w-4 text-primary" />
          Filtros
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              size="sm"
              variant="outline"
              onClick={() => applyPreset(p)}
              className="h-8 text-xs"
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="start-date" className="text-xs">
              <Calendar className="mr-1 inline h-3 w-3" />
              Desde
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end-date" className="text-xs">
              <Calendar className="mr-1 inline h-3 w-3" />
              Hasta
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-filter" className="text-xs">
              <Users className="mr-1 inline h-3 w-3" />
              Trabajador (solo fichajes y partes)
            </Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="user-filter">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {workers?.map((w) => (
                  <SelectItem key={w.user_id} value={w.user_id}>
                    {w.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Módulos a incluir</Label>
          <div className="flex flex-wrap gap-3">
            {MODULES.map((m) => (
              <label
                key={m}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  selectedModules.has(m) ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-accent/50",
                )}
              >
                <Checkbox checked={selectedModules.has(m)} onCheckedChange={() => toggleModule(m)} />
                {MODULE_LABELS[m]}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
          <Button
            onClick={() => refetch()}
            disabled={modulesArr.length === 0 || isFetching}
            variant="default"
          >
            {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
            Aplicar filtros
          </Button>
          <Button
            onClick={handleExportXLSXAll}
            disabled={!data || totalRows === 0}
            variant="outline"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Descargar todo en Excel
          </Button>
          {data ? (
            <Badge variant="secondary" className="ml-auto">
              {totalRows} filas en total
            </Badge>
          ) : null}
        </div>
      </section>

      {/* Resultados por módulo */}
      <section className="grid gap-4 md:grid-cols-2">
        {modulesArr.map((m) => {
          const rows = data?.[m] ?? [];
          const isGasolina = m === "gasolina";
          return (
            <div key={m} className="panel-surface flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{MODULE_LABELS[m]}</h3>
                  <p className="text-xs text-muted-foreground">
                    {isFetching && !data
                      ? "Cargando…"
                      : isGasolina
                      ? "Datos almacenados localmente — exportación pendiente."
                      : `${rows.length} registro${rows.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                <Badge variant={rows.length > 0 ? "default" : "outline"}>{rows.length}</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportCSV(m)}
                  disabled={!data || rows.length === 0}
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportXLSXModule(m)}
                  disabled={!data || rows.length === 0}
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  Excel
                </Button>
              </div>
            </div>
          );
        })}
        {modulesArr.length === 0 ? (
          <div className="panel-surface col-span-full p-8 text-center text-sm text-muted-foreground">
            Selecciona al menos un módulo para generar reportes.
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default ReportsView;
