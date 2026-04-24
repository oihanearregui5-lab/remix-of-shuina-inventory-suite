import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { addMonths, format, getDaysInMonth, startOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
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
  useTonnage,
  computeDailySummaries,
  computeTruckSummaries,
  computeMaterialSummaries,
  formatKg,
  formatTons,
  type TonnageMaterial,
  type TonnageTrip,
  type TonnageTruck,
} from "@/hooks/useTonnage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const materialLabel: Record<TonnageMaterial, string> = {
  arenas: "Arenas",
  tortas: "Tortas",
  sulfatos: "Sulfatos",
};

const materialBg: Record<TonnageMaterial, string> = {
  arenas: "bg-warning/15",
  tortas: "bg-primary/10",
  sulfatos: "bg-success/15",
};

const materialDot: Record<TonnageMaterial, string> = {
  arenas: "bg-warning",
  tortas: "bg-primary",
  sulfatos: "bg-success",
};

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ============================================================
// DIÁLOGO: Edición de celda (día × camión) = lista de viajes de ese día para ese camión
// ============================================================
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
                    <Input
                      type="number"
                      step="10"
                      value={editKg}
                      onChange={(e) => setEditKg(e.target.value)}
                      className="h-9 flex-1"
                      placeholder="kg"
                    />
                    <Button size="sm" className="h-9" onClick={() => void saveEdit()}>
                      OK
                    </Button>
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

        {/* Añadir nuevo viaje a esta celda */}
        <div className="rounded-xl border-2 border-dashed border-border p-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Añadir viaje
          </Label>
          <div className="mt-2 flex items-center gap-2">
            <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="h-10 w-28" />
            <Input
              type="number"
              step="10"
              placeholder="kg"
              value={newKg}
              onChange={(e) => setNewKg(e.target.value)}
              className="h-10 flex-1"
            />
            <Button type="button" className="h-10" onClick={() => void handleAdd()} disabled={!newKg}>
              <Plus className="h-4 w-4" /> Añadir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================
// DIÁLOGO: Gestión de camiones
// ============================================================
interface TrucksDialogProps {
  open: boolean;
  trucks: TonnageTruck[];
  onOpenChange: (open: boolean) => void;
  onReload: () => void;
}

const TrucksDialog = ({ open, trucks, onOpenChange, onReload }: TrucksDialogProps) => {
  const db = supabase as any;
  const [form, setForm] = useState<{ truck_number: string; label: string; material: TonnageMaterial }>({
    truck_number: "",
    label: "",
    material: "arenas",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setForm({ truck_number: "", label: "", material: "arenas" });
    setEditingId(null);
  };

  const startEdit = (truck: TonnageTruck) => {
    setForm({ truck_number: String(truck.truck_number), label: truck.label, material: truck.material });
    setEditingId(truck.id);
  };

  const save = async () => {
    const num = parseInt(form.truck_number, 10);
    if (!form.label.trim() || isNaN(num)) {
      toast.error("Rellena número y nombre");
      return;
    }
    setSaving(true);
    const payload = {
      truck_number: num,
      label: form.label.trim(),
      material: form.material,
      sort_order: num,
    };
    const { error } = editingId
      ? await db.from("tonnage_trucks").update(payload).eq("id", editingId)
      : await db.from("tonnage_trucks").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(editingId ? "No se pudo editar el camión" : "No se pudo crear el camión");
      return;
    }
    toast.success(editingId ? "Camión actualizado" : "Camión creado");
    reset();
    onReload();
  };

  const toggleActive = async (truck: TonnageTruck) => {
    const { error } = await db.from("tonnage_trucks").update({ is_active: !truck.is_active }).eq("id", truck.id);
    if (error) return toast.error("No se pudo cambiar el estado");
    onReload();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestión de camiones</DialogTitle>
          <DialogDescription>
            Cada camión tiene un material fijo. Los viajes heredan el material al registrarse.
          </DialogDescription>
        </DialogHeader>

        {/* Formulario */}
        <div className="space-y-3 rounded-xl border-2 border-dashed border-border p-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {editingId ? "Editando camión" : "Nuevo camión"}
          </Label>
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <Input
              type="number"
              placeholder="Nº"
              value={form.truck_number}
              onChange={(e) => setForm((f) => ({ ...f, truck_number: e.target.value }))}
            />
            <Input
              placeholder="Nombre del camión"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </div>
          <Select
            value={form.material}
            onValueChange={(v: TonnageMaterial) => setForm((f) => ({ ...f, material: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arenas">Arenas</SelectItem>
              <SelectItem value="tortas">Tortas</SelectItem>
              <SelectItem value="sulfatos">Sulfatos</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => void save()} disabled={saving}>
              {editingId ? "Guardar cambios" : "Crear camión"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={reset}>
                Cancelar
              </Button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
          {trucks.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No hay camiones aún</p>
          ) : (
            <ul className="divide-y divide-border">
              {trucks.map((t) => (
                <li key={t.id} className={cn("flex items-center gap-2 p-2", !t.is_active && "opacity-50")}>
                  <div className={cn("flex h-9 w-9 flex-none items-center justify-center rounded-lg text-xs font-bold", materialBg[t.material])}>
                    #{t.truck_number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{materialLabel[t.material]}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => void toggleActive(t)}
                  >
                    {t.is_active ? "Desactivar" : "Activar"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================
// VISTA PRINCIPAL ADMIN
// ============================================================
const AdminTonnageView = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const { trucks, trips, loading, addTrip, updateTrip, deleteTrip, reload } = useTonnage(currentMonth);

  const [cellDialog, setCellDialog] = useState<{ date: string; truckId: string } | null>(null);
  const [trucksDialogOpen, setTrucksDialogOpen] = useState(false);

  const { canViewAdmin } = useAuth();

  const daysInMonth = getDaysInMonth(currentMonth);
  const year = currentMonth.getFullYear();
  const monthIdx = currentMonth.getMonth();
  const monthLabel = MONTHS[monthIdx];

  const dailySummaries = useMemo(() => computeDailySummaries(trips), [trips]);
  const truckSummaries = useMemo(() => computeTruckSummaries(trucks, trips), [trucks, trips]);
  const materialSummaries = useMemo(() => computeMaterialSummaries(trips), [trips]);

  // celda[date][truckId] = suma kg
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

  const totalViajes = trips.length;
  const totalKg = trips.reduce((acc, t) => acc + Number(t.weight_kg), 0);
  const avgKg = totalViajes > 0 ? totalKg / totalViajes : 0;

  // Cambio de mes
  const prevMonth = () => setCurrentMonth((d) => subMonths(d, 1));
  const nextMonth = () => setCurrentMonth((d) => addMonths(d, 1));
  const pickMonth = (idx: string) => setCurrentMonth(new Date(year, parseInt(idx, 10), 1));
  const pickYear = (y: string) => setCurrentMonth(new Date(parseInt(y, 10), monthIdx, 1));

  // Export CSV tipo Excel
  const exportCSV = () => {
    const header = ["Día", ...trucks.map((t) => `#${t.truck_number} ${t.label}`), "Nº VIAJES", "Peso total", "Media"];
    const rows: string[] = [header.join(";")];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = format(new Date(year, monthIdx, day), "yyyy-MM-dd");
      const dayCells = cellMap.get(dateStr);
      const cols = [String(day)];
      let dayTotal = 0;
      let dayCount = 0;
      for (const truck of trucks) {
        const cell = dayCells?.get(truck.id);
        if (cell) {
          cols.push(String(Math.round(cell.kg)));
          dayTotal += cell.kg;
          dayCount += cell.count;
        } else {
          cols.push("");
        }
      }
      cols.push(String(dayCount));
      cols.push(String(Math.round(dayTotal)));
      cols.push(dayCount > 0 ? String(Math.round(dayTotal / dayCount)) : "");
      rows.push(cols.join(";"));
    }

    // Fila de totales
    const totalRow = ["Total"];
    for (const ts of truckSummaries) totalRow.push(String(Math.round(ts.totalKg)));
    totalRow.push(String(totalViajes));
    totalRow.push(String(Math.round(totalKg)));
    totalRow.push(totalViajes > 0 ? String(Math.round(avgKg)) : "");
    rows.push(totalRow.join(";"));

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `toneladas_${monthLabel}_${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  if (!canViewAdmin) {
    return (
      <div className="animate-fade-in py-16 text-center">
        <p className="text-muted-foreground">No tienes permisos de administrador</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        eyebrow="Administración · Toneladas"
        title={`${monthLabel} ${year}`}
        description="Tabla tipo Excel. Clic en cualquier celda para ver, editar o añadir viajes."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTrucksDialogOpen(true)}>
              <Settings2 className="h-4 w-4" /> Camiones
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </div>
        }
      />

      {/* Métricas del mes */}
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

      {/* Reparto por material */}
      <section className="panel-surface p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reparto por material</p>
        <div className="grid grid-cols-3 gap-3">
          {materialSummaries.map((m) => (
            <div key={m.material} className={cn("rounded-xl p-3", materialBg[m.material])}>
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", materialDot[m.material])} />
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {materialLabel[m.material]}
                </span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">{m.tripCount} viajes</p>
              <p className="text-xs text-muted-foreground">{formatTons(m.totalKg)} t</p>
            </div>
          ))}
        </div>
      </section>

      {/* Navegador de mes */}
      <section className="panel-surface flex flex-wrap items-center gap-2 p-3">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-9 w-9">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Select value={String(monthIdx)} onValueChange={pickMonth}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={pickYear}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {loading ? "Cargando…" : "Haz clic en una celda para editar"}
        </span>
      </section>

      {/* Tabla principal */}
      {trucks.length === 0 ? (
        <section className="panel-surface p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no hay camiones. Pulsa{" "}
            <span className="font-semibold text-foreground">Camiones</span> arriba para añadir el primero.
          </p>
        </section>
      ) : (
        <section className="panel-surface overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              {/* Cabecera: camiones */}
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b-2 border-border">
                  <th className="sticky left-0 z-20 border-r border-border bg-background px-2 py-2 text-left font-semibold">
                    Día
                  </th>
                  {trucks.map((truck) => (
                    <th
                      key={truck.id}
                      className={cn(
                        "min-w-[70px] border-r border-border px-1 py-2 text-center font-semibold",
                        materialBg[truck.material],
                      )}
                    >
                      <div className="text-[11px] font-bold">#{truck.truck_number}</div>
                      <div className="truncate text-[9px] font-normal text-muted-foreground" title={truck.label}>
                        {truck.label.slice(0, 10)}
                      </div>
                    </th>
                  ))}
                  <th className="min-w-[60px] border-l-2 border-border bg-muted/50 px-2 py-2 text-center font-semibold">
                    Viajes
                  </th>
                  <th className="min-w-[80px] bg-muted/50 px-2 py-2 text-center font-semibold">Total</th>
                  <th className="min-w-[70px] bg-muted/50 px-2 py-2 text-center font-semibold">Media</th>
                </tr>
              </thead>

              {/* Cuerpo: días */}
              <tbody>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateStr = format(new Date(year, monthIdx, day), "yyyy-MM-dd");
                  const dayCells = cellMap.get(dateStr);
                  const daySum = dailySummaries.find((d) => d.date === dateStr);
                  return (
                    <tr key={day} className="border-b border-border hover:bg-muted/30">
                      <td className="sticky left-0 z-10 border-r border-border bg-background px-2 py-1.5 text-left font-semibold">
                        {day}
                      </td>
                      {trucks.map((truck) => {
                        const cell = dayCells?.get(truck.id);
                        return (
                          <td
                            key={truck.id}
                            className={cn(
                              "border-r border-border p-0 text-center",
                              cell && materialBg[truck.material],
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => setCellDialog({ date: dateStr, truckId: truck.id })}
                              className={cn(
                                "block h-full w-full px-1 py-1.5 transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset",
                                !cell && "text-muted-foreground/40",
                              )}
                              title={
                                cell
                                  ? `${cell.count} viaje${cell.count > 1 ? "s" : ""} · clic para editar`
                                  : "Añadir viaje"
                              }
                            >
                              {cell ? (
                                <>
                                  <div className="text-[11px] font-semibold">{formatKg(cell.kg)}</div>
                                  {cell.count > 1 && (
                                    <div className="text-[9px] text-muted-foreground">{cell.count}v</div>
                                  )}
                                </>
                              ) : (
                                <span className="text-lg">·</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="border-l-2 border-border bg-muted/20 px-2 py-1.5 text-center font-semibold">
                        {daySum?.tripCount ?? ""}
                      </td>
                      <td className="bg-muted/20 px-2 py-1.5 text-right font-semibold">
                        {daySum ? formatKg(daySum.totalKg) : ""}
                      </td>
                      <td className="bg-muted/20 px-2 py-1.5 text-right text-muted-foreground">
                        {daySum && daySum.tripCount > 0 ? formatKg(daySum.avgKg) : ""}
                      </td>
                    </tr>
                  );
                })}

                {/* Fila totales */}
                <tr className="border-t-2 border-border bg-primary/5 font-bold">
                  <td className="sticky left-0 z-10 border-r-2 border-border bg-primary/5 px-2 py-2 text-left uppercase">
                    Total
                  </td>
                  {truckSummaries.map((ts) => (
                    <td
                      key={ts.truckId}
                      className={cn("border-r border-border px-1 py-2 text-center text-[11px]", materialBg[ts.material])}
                    >
                      <div>{ts.tripCount}v</div>
                      <div className="text-[10px] font-normal text-muted-foreground">{formatKg(ts.totalKg)}</div>
                    </td>
                  ))}
                  <td className="border-l-2 border-border bg-primary/10 px-2 py-2 text-center">{totalViajes}</td>
                  <td className="bg-primary/10 px-2 py-2 text-right">{formatKg(totalKg)}</td>
                  <td className="bg-primary/10 px-2 py-2 text-right">
                    {totalViajes > 0 ? formatKg(avgKg) : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Diálogo celda */}
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

      {/* Diálogo camiones */}
      <TrucksDialog
        open={trucksDialogOpen}
        trucks={trucks}
        onOpenChange={setTrucksDialogOpen}
        onReload={() => void reload()}
      />
    </div>
  );
};

export default AdminTonnageView;
