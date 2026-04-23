import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Filter, Users2 } from "lucide-react";
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
  const [workerFilter, setWorkerFilter] = useState("all");
  const [fromDate, setFromDate] = useState(today.slice(0, 8) + "01");
  const [toDate, setToDate] = useState(today);
  const [sourceFilter, setSourceFilter] = useState("all");

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

  return (
    <div className="space-y-4">
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
