import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { ChevronLeft, ChevronRight, Download, Pencil, Plus, Trash2, X } from "lucide-react";
import { addMonths, format, getDaysInMonth, startOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  computeDailySummaries,
  computeTruckSummaries,
  formatKg,
  formatTons,
  useTonnage,
  type TonnageMaterial,
  type TonnageTrip,
  type TonnageTruck,
} from "@/hooks/useTonnage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const materialBg: Record<TonnageMaterial, string> = {
  arenas: "bg-warning/15",
  tortas: "bg-primary/10",
  sulfatos: "bg-success/15",
};

interface CellDialogProps {
  open: boolean;
  date: string | null;
  truck: TonnageTruck | null;
  trips: TonnageTrip[];
  onOpenChange: (open: boolean) => void;
  onAdd: (truckId: string, date: string, kg: number, time: string | null) => Promise<void>;
  onUpdate: (tripId: string, kg: number, time: string | null) => Promise<void>;
  onDelete: (tripId: string) => Promise<void>;
}

const CellDialog = ({ open, date, truck, trips, onOpenChange, onAdd, onUpdate, onDelete }: CellDialogProps) => {
  const [newKg, setNewKg] = useState<string>("");
  const [newTime, setNewTime] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKg, setEditKg] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("");

  const cellTrips = useMemo(
    () => trips.filter((t) => t.trip_date === date && t.truck_id === truck?.id),
    [trips, date, truck],
  );

  const totalKg = cellTrips.reduce((acc, t) => acc + Number(t.weight_kg), 0);

  const handleAdd = async () => {
    if (!truck || !date) return;
    const kg = parseFloat(newKg.replace(",", "."));
    if (isNaN(kg) || kg <= 0) return;
    await onAdd(truck.id, date, kg, newTime || null);
    setNewKg("");
    setNewTime("");
  };

  const startEdit = (trip: TonnageTrip) => {
    setEditingId(trip.id);
    setEditKg(String(trip.weight_kg));
    setEditTime(trip.trip_time ? trip.trip_time.slice(0, 5) : "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const kg = parseFloat(editKg.replace(",", "."));
    if (isNaN(kg) || kg <= 0) return;
    await onUpdate(editingId, kg, editTime || null);
    setEditingId(null);
  };

  const parsedDate = date ? new Date(date) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {truck && (
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold", materialBg[truck.material])}>
                #{truck.truck_number}
              </div>
            )}
            <div>
              <DialogTitle>
                {truck?.label || "Camión"} · {parsedDate ? format(parsedDate, "d 'de' MMMM", { locale: es }) : ""}
              </DialogTitle>
              <DialogDescription>
                {cellTrips.length} viaje{cellTrips.length !== 1 ? "s" : ""} · {formatKg(totalKg)} kg total
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-border p-1">
          {cellTrips.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Sin viajes este día</p>
          ) : (
            cellTrips.map((trip) => (
              <div key={trip.id} className="flex items-center gap-2 rounded-lg bg-muted/30 p-2">
                {editingId === trip.id ? (
                  <>
                    <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="h-9 w-28" />
                    <Input type="number" step="10" value={editKg} onChange={(e) => setEditKg(e.target.value)} className="h-9 flex-1" placeholder="kg" />
                    <Button size="sm" className="h-9" onClick={() => void saveEdit()}>OK</Button>
                    <Button size="sm" variant="ghost" className="h-9 px-2" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="w-14 text-xs font-medium text-muted-foreground">
                      {trip.trip_time ? trip.trip_time.slice(0, 5) : "—"}
                    </span>
                    <span className="flex-1 text-sm font-semibold">{formatKg(Number(trip.weight_kg))} kg</span>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEdit(trip)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (window.confirm("¿Eliminar este viaje?")) void onDelete(trip.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="rounded-xl border-2 border-dashed border-border p-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Añadir viaje</Label>
          <div className="mt-2 flex items-center gap-2">
            <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="h-10 w-28" />
            <Input type="number" step="10" placeholder="kg" value={newKg} onChange={(e) => setNewKg(e.target.value)} className="h-10 flex-1" />
            <Button type="button" className="h-10" onClick={() => void handleAdd()} disabled={!newKg}>
              <Plus className="h-4 w-4" /> Añadir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TonnageMonthlyTable = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const { trucks, trips, loading, addTrip, updateTrip, deleteTrip } = useTonnage(currentMonth);

  const [cellDialog, setCellDialog] = useState<{ date: string; truckId: string } | null>(null);

  const daysInMonth = getDaysInMonth(currentMonth);
  const year = currentMonth.getFullYear();
  const monthIdx = currentMonth.getMonth();
  const monthLabel = MONTHS[monthIdx];

  const dailySummaries = useMemo(() => computeDailySummaries(trips), [trips]);
  const truckSummaries = useMemo(() => computeTruckSummaries(trucks, trips), [trucks, trips]);

  const cellMap = useMemo(() => {
    const map = new Map<string, Map<string, { kg: number; count: number }>>();
    trips.forEach((trip) => {
      if (!map.has(trip.trip_date)) map.set(trip.trip_date, new Map());
      const dayMap = map.get(trip.trip_date)!;
      const existing = dayMap.get(trip.truck_id) ?? { kg: 0, count: 0 };
      existing.kg += Number(trip.weight_kg);
      existing.count += 1;
      dayMap.set(trip.truck_id, existing);
    });
    return map;
  }, [trips]);

  // Cantidades de material por día (suma de qty_arenas_a + qty_arenas_b, qty_tortas, qty_sulfatos)
  const materialDayMap = useMemo(() => {
    const map = new Map<string, { arenas: number; tortas: number; sulfatos: number }>();
    trips.forEach((trip) => {
      const cur = map.get(trip.trip_date) ?? { arenas: 0, tortas: 0, sulfatos: 0 };
      cur.arenas += Number(trip.qty_arenas_a || 0) + Number(trip.qty_arenas_b || 0);
      cur.tortas += Number(trip.qty_tortas || 0);
      cur.sulfatos += Number(trip.qty_sulfatos || 0);
      map.set(trip.trip_date, cur);
    });
    return map;
  }, [trips]);

  const materialTotals = useMemo(() => {
    let arenas = 0, tortas = 0, sulfatos = 0;
    materialDayMap.forEach((v) => { arenas += v.arenas; tortas += v.tortas; sulfatos += v.sulfatos; });
    return { arenas, tortas, sulfatos, total: arenas + tortas + sulfatos };
  }, [materialDayMap]);

  const totalViajes = trips.length;
  const totalKg = trips.reduce((acc, t) => acc + Number(t.weight_kg), 0);
  const avgKg = totalViajes > 0 ? totalKg / totalViajes : 0;

  const exportExcel = () => {
    // Construye los datos como array de arrays (más fácil para hojas tipo plantilla)
    const aoa: (string | number)[][] = [];

    // Cabecera (fila 1): título del mes
    aoa.push([`${monthLabel.toUpperCase()} ${year}`]);
    // Fila vacía
    aoa.push([]);
    // Cabecera (fila 3): "Día" + nombres de camiones + métricas
    const header = ["Día", ...trucks.map((t) => `#${t.truck_number} ${t.label}`), "Nº VIAJES", "Peso total", "Media"];
    aoa.push(header);

    // Filas día a día
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = format(new Date(year, monthIdx, day), "yyyy-MM-dd");
      const dayCells = cellMap.get(dateStr);
      const row: (string | number)[] = [day];
      let dayTotal = 0;
      let dayCount = 0;
      for (const truck of trucks) {
        const cell = dayCells?.get(truck.id);
        if (cell) {
          row.push(Math.round(cell.kg));
          dayTotal += cell.kg;
          dayCount += cell.count;
        } else {
          row.push("");
        }
      }
      row.push(dayCount);
      row.push(Math.round(dayTotal));
      row.push(dayCount > 0 ? Math.round(dayTotal / dayCount) : "");
      aoa.push(row);
    }

    // Fila final: totales
    const totalRow: (string | number)[] = ["Total"];
    for (const ts of truckSummaries) totalRow.push(Math.round(ts.totalKg));
    totalRow.push(totalViajes);
    totalRow.push(Math.round(totalKg));
    totalRow.push(totalViajes > 0 ? Math.round(avgKg) : "");
    aoa.push(totalRow);

    // Crear libro
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Anchos de columna
    const colWidths = [{ wch: 6 }, ...trucks.map(() => ({ wch: 12 })), { wch: 10 }, { wch: 12 }, { wch: 10 }];
    ws["!cols"] = colWidths;

    // Combinar la fila del título
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${monthLabel.slice(0, 3).toUpperCase()} ${String(year).slice(-2)}`);

    // Descargar
    XLSX.writeFile(wb, `Toneladas_${monthLabel}_${year}.xlsx`);
    toast.success("Excel exportado");
  };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="panel-surface p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Viajes</p>
          <p className="mt-1 text-2xl font-bold">{totalViajes}</p>
        </div>
        <div className="panel-surface p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Toneladas</p>
          <p className="mt-1 text-2xl font-bold">{formatTons(totalKg)}</p>
        </div>
        <div className="panel-surface p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Media / viaje</p>
          <p className="mt-1 text-2xl font-bold">{totalViajes > 0 ? `${formatKg(avgKg)} kg` : "—"}</p>
        </div>
        <div className="panel-surface p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Camiones</p>
          <p className="mt-1 text-2xl font-bold">{trucks.length}</p>
        </div>
      </section>

      <section className="panel-surface flex flex-wrap items-center gap-2 p-3">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((d) => subMonths(d, 1))} className="h-9 w-9">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Select value={String(monthIdx)} onValueChange={(v) => setCurrentMonth(new Date(year, parseInt(v, 10), 1))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setCurrentMonth(new Date(parseInt(v, 10), monthIdx, 1))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((d) => addMonths(d, 1))} className="h-9 w-9">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={exportExcel} className="ml-auto">
          <Download className="h-4 w-4" /> Exportar Excel
        </Button>
      </section>

      {trucks.length === 0 ? (
        <section className="panel-surface p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no hay camiones. Ve a la subpestaña <span className="font-semibold text-foreground">Camiones</span> para añadir el primero.
          </p>
        </section>
      ) : (
        <section className="panel-surface overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b-2 border-border">
                  <th className="sticky left-0 z-20 border-r border-border bg-background px-2 py-2 text-left font-semibold">Día</th>
                  {trucks.map((truck) => (
                    <th key={truck.id} className={cn("min-w-[70px] border-r border-border px-1 py-2 text-center font-semibold", materialBg[truck.material])}>
                      <div className="text-[11px] font-bold">#{truck.truck_number}</div>
                      <div className="truncate text-[9px] font-normal text-muted-foreground" title={truck.label}>
                        {truck.label.slice(0, 10)}
                      </div>
                    </th>
                  ))}
                  <th className="min-w-[60px] border-l-2 border-border bg-muted/50 px-2 py-2 text-center font-semibold">Viajes</th>
                  <th className="min-w-[80px] bg-muted/50 px-2 py-2 text-center font-semibold">Total</th>
                  <th className="min-w-[70px] bg-muted/50 px-2 py-2 text-center font-semibold">Media</th>
                  <th className="min-w-[60px] border-l-2 border-border bg-warning/15 px-2 py-2 text-center font-semibold" title="Arenas">Arenas</th>
                  <th className="min-w-[60px] bg-primary/10 px-2 py-2 text-center font-semibold" title="Tortas">Tortas</th>
                  <th className="min-w-[60px] bg-success/15 px-2 py-2 text-center font-semibold" title="Sulfatos">Sulfatos</th>
                  <th className="min-w-[60px] bg-muted/50 px-2 py-2 text-center font-semibold">Σ</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateStr = format(new Date(year, monthIdx, day), "yyyy-MM-dd");
                  const dayCells = cellMap.get(dateStr);
                  const daySum = dailySummaries.find((d) => d.date === dateStr);
                  return (
                    <tr key={day} className="border-b border-border hover:bg-muted/30">
                      <td className="sticky left-0 z-10 border-r border-border bg-background px-2 py-1.5 text-left font-semibold">{day}</td>
                      {trucks.map((truck) => {
                        const cell = dayCells?.get(truck.id);
                        return (
                          <td key={truck.id} className={cn("border-r border-border p-0 text-center", cell && materialBg[truck.material])}>
                            <button
                              type="button"
                              onClick={() => setCellDialog({ date: dateStr, truckId: truck.id })}
                              className={cn(
                                "block h-full w-full px-1 py-1.5 transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset",
                                !cell && "text-muted-foreground/40",
                              )}
                              title={cell ? `${cell.count} viaje${cell.count > 1 ? "s" : ""} · clic para editar` : "Añadir viaje"}
                            >
                              {cell ? (
                                <>
                                  <div className="text-[11px] font-semibold">{formatKg(cell.kg)}</div>
                                  {cell.count > 1 && <div className="text-[9px] text-muted-foreground">{cell.count}v</div>}
                                </>
                              ) : (
                                <span className="text-lg">·</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="border-l-2 border-border bg-muted/20 px-2 py-1.5 text-center font-semibold">{daySum?.tripCount ?? ""}</td>
                      <td className="bg-muted/20 px-2 py-1.5 text-right font-semibold">{daySum ? formatKg(daySum.totalKg) : ""}</td>
                      <td className="bg-muted/20 px-2 py-1.5 text-right text-muted-foreground">{daySum && daySum.tripCount > 0 ? formatKg(daySum.avgKg) : ""}</td>
                      {(() => {
                        const m = materialDayMap.get(dateStr);
                        const arenas = m?.arenas ?? 0;
                        const tortas = m?.tortas ?? 0;
                        const sulfatos = m?.sulfatos ?? 0;
                        const sum = arenas + tortas + sulfatos;
                        return (
                          <>
                            <td className="border-l-2 border-border bg-warning/10 px-2 py-1.5 text-center">{arenas || ""}</td>
                            <td className="bg-primary/5 px-2 py-1.5 text-center">{tortas || ""}</td>
                            <td className="bg-success/10 px-2 py-1.5 text-center">{sulfatos || ""}</td>
                            <td className="bg-muted/30 px-2 py-1.5 text-center font-semibold">{sum || ""}</td>
                          </>
                        );
                      })()}
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-border bg-primary/5 font-bold">
                  <td className="sticky left-0 z-10 border-r-2 border-border bg-primary/5 px-2 py-2 text-left uppercase">Total</td>
                  {truckSummaries.map((ts) => (
                    <td key={ts.truckId} className={cn("border-r border-border px-1 py-2 text-center text-[11px]", materialBg[ts.material])}>
                      <div>{ts.tripCount}v</div>
                      <div className="text-[10px] font-normal text-muted-foreground">{formatKg(ts.totalKg)}</div>
                    </td>
                  ))}
                  <td className="border-l-2 border-border bg-primary/10 px-2 py-2 text-center">{totalViajes}</td>
                  <td className="bg-primary/10 px-2 py-2 text-right">{formatKg(totalKg)}</td>
                  <td className="bg-primary/10 px-2 py-2 text-right">{totalViajes > 0 ? formatKg(avgKg) : "—"}</td>
                  <td className="border-l-2 border-border bg-warning/20 px-2 py-2 text-center">{materialTotals.arenas || ""}</td>
                  <td className="bg-primary/15 px-2 py-2 text-center">{materialTotals.tortas || ""}</td>
                  <td className="bg-success/20 px-2 py-2 text-center">{materialTotals.sulfatos || ""}</td>
                  <td className="bg-muted/50 px-2 py-2 text-center">{materialTotals.total || ""}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <CellDialog
        open={cellDialog !== null}
        date={cellDialog?.date ?? null}
        truck={trucks.find((t) => t.id === cellDialog?.truckId) ?? null}
        trips={trips}
        onOpenChange={(o) => !o && setCellDialog(null)}
        onAdd={async (truckId, date, kg, time) => {
          await addTrip({ truck_id: truckId, trip_date: date, weight_kg: kg, trip_time: time });
        }}
        onUpdate={async (tripId, kg, time) => {
          await updateTrip(tripId, { weight_kg: kg, trip_time: time });
        }}
        onDelete={async (tripId) => {
          await deleteTrip(tripId);
        }}
      />
    </div>
  );
};

export default TonnageMonthlyTable;
