import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Filter, Users2, Folder, ArrowLeft, Search, CircleDot } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { FichajeRow, WorkerItem } from "./vacation-types";
import { formatHours } from "./vacation-utils";

interface Props {
  rows: FichajeRow[];
  workers: WorkerItem[];
}

const VacationClockingsSection = ({ rows, workers }: Props) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const [workerFilter, setWorkerFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState(today.slice(0, 8) + "01");
  const [toDate, setToDate] = useState(today);
  const [sourceFilter, setSourceFilter] = useState("all");

  // Folder-mode: if no worker selected yet, show one folder per worker
  const showFolders = workerFilter === "";

  const filteredRows = useMemo(() => rows.filter((row) => {
    const clockDate = row.clock_in.slice(0, 10);
    if (workerFilter !== "all" && row.worker_id !== workerFilter) return false;
    if (sourceFilter !== "all" && row.source !== sourceFilter) return false;
    if (fromDate && clockDate < fromDate) return false;
    if (toDate && clockDate > toDate) return false;
    return true;
  }), [fromDate, rows, sourceFilter, toDate, workerFilter]);

  const totals = useMemo(() => ({
    totalHours: filteredRows.reduce((sum, row) => sum + row.hours, 0),
    records: filteredRows.length,
    workers: new Set(filteredRows.map((row) => row.worker_id ?? row.worker_name)).size,
  }), [filteredRows]);

  const exportRows = (sheetRows: FichajeRow[]) => sheetRows.map((row) => ({
    Trabajador: row.worker_name,
    Fecha: format(new Date(row.clock_in), "yyyy-MM-dd"),
    Entrada: format(new Date(row.clock_in), "HH:mm"),
    Salida: row.clock_out ? format(new Date(row.clock_out), "HH:mm") : "—",
    Horas: Number(row.hours.toFixed(2)),
    Fuente: row.source,
    Nota: row.notes ?? "",
  }));

  const handleDownload = () => {
    const workbook = XLSX.utils.book_new();
    const safeFrom = fromDate || "inicio";
    const safeTo = toDate || "fin";

    if (workerFilter === "all") {
      const summaryRows = workers.map((worker) => {
        const workerRows = filteredRows.filter((row) => row.worker_id === worker.id);
        return {
          Trabajador: worker.display_name,
          Registros: workerRows.length,
          Horas: Number(workerRows.reduce((sum, row) => sum + row.hours, 0).toFixed(2)),
        };
      }).filter((row) => row.Registros > 0);

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Resumen");
      workers.forEach((worker) => {
        const workerRows = filteredRows.filter((row) => row.worker_id === worker.id);
        if (!workerRows.length) return;
        const worksheet = XLSX.utils.json_to_sheet(exportRows(workerRows));
        worksheet["!cols"] = [
          { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 24 },
        ];
        XLSX.utils.book_append_sheet(workbook, worksheet, worker.display_name.slice(0, 31));
      });
    } else {
      const worker = workers.find((item) => item.id === workerFilter);
      const worksheet = XLSX.utils.json_to_sheet(exportRows(filteredRows));
      worksheet["!cols"] = [
        { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 24 },
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, worker?.display_name?.slice(0, 31) ?? "Fichajes");
    }

    const label = workerFilter === "all" ? "Todos" : workers.find((worker) => worker.id === workerFilter)?.display_name ?? "Trabajador";
    XLSX.writeFile(workbook, `Fichajes_${label}_${safeFrom}_a_${safeTo}.xlsx`);
  };

  const workerStats = useMemo(() => {
    return workers.map((worker) => {
      const wrows = rows.filter((r) => r.worker_id === worker.id);
      return {
        id: worker.id,
        name: worker.display_name,
        records: wrows.length,
        hours: wrows.reduce((s, r) => s + r.hours, 0),
        last: wrows[0]?.clock_in ?? null,
      };
    });
  }, [rows, workers]);

  if (showFolders) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Folder className="h-4 w-4 text-primary" /> Carpetas de fichajes por trabajador
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {workerStats.map((w) => (
              <button key={w.id} type="button" onClick={() => setWorkerFilter(w.id)} className="group flex flex-col gap-2 rounded-lg border border-border bg-background p-4 text-left transition hover:border-primary hover:bg-accent">
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">{w.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">{w.records} fichajes · {formatHours(w.hours)}</div>
                {w.last ? (
                  <div className="text-xs text-muted-foreground">Último: {format(new Date(w.last), "dd/MM/yyyy HH:mm")}</div>
                ) : (
                  <div className="text-xs text-muted-foreground">Sin fichajes registrados</div>
                )}
              </button>
            ))}
            <button type="button" onClick={() => setWorkerFilter("all")} className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground">
              <Users2 className="h-5 w-5" /> Ver todos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setWorkerFilter("")}>
          <ArrowLeft className="h-4 w-4" /> Volver a carpetas
        </Button>
        <span className="text-sm text-muted-foreground">
          {workerFilter === "all" ? "Todos los trabajadores" : workers.find((w) => w.id === workerFilter)?.display_name}
        </span>
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Total horas</p><p className="mt-2 text-2xl font-semibold text-foreground">{formatHours(totals.totalHours)}</p></div>
          <div className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Registros</p><p className="mt-2 text-2xl font-semibold text-foreground">{totals.records}</p></div>
          <div className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Trabajadores</p><p className="mt-2 text-2xl font-semibold text-foreground">{totals.workers}</p></div>
          <div className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Periodo</p><p className="mt-2 text-sm font-semibold text-foreground">{fromDate} → {toDate}</p></div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Filter className="h-4 w-4 text-primary" /> Filtros</div>
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Trabajador</span>
              <select value={workerFilter} onChange={(event) => setWorkerFilter(event.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                <option value="all">Todos</option>
                {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.display_name}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm"><span className="text-muted-foreground">Desde</span><Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
              <label className="block space-y-1 text-sm"><span className="text-muted-foreground">Hasta</span><Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Fuente</span>
              <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                <option value="all">Todas</option>
                <option value="app">App</option>
              </select>
            </label>
            <Button onClick={handleDownload} className="w-full"><Download className="h-4 w-4" /> Descargar Excel</Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Users2 className="h-4 w-4 text-primary" /> Fichajes de trabajadores</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trabajador</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead>Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium text-foreground">{row.worker_name}</TableCell>
                <TableCell>{format(new Date(row.clock_in), "dd/MM/yyyy")}</TableCell>
                <TableCell>{format(new Date(row.clock_in), "HH:mm")}</TableCell>
                <TableCell>{row.clock_out ? format(new Date(row.clock_out), "HH:mm") : "—"}</TableCell>
                <TableCell>{formatHours(row.hours)}</TableCell>
                <TableCell>{row.source}</TableCell>
                <TableCell>{row.notes ?? "—"}</TableCell>
              </TableRow>
            ))}
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">No hay fichajes para el filtro actual.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default VacationClockingsSection;
