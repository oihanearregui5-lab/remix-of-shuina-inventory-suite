import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Truck, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import EmptyState from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useTonnage, formatKg, type TonnageMaterial, type TonnageTrip } from "@/hooks/useTonnage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const materialTone: Record<TonnageMaterial, string> = {
  arenas: "bg-warning/20 text-foreground",
  tortas: "bg-primary/15 text-primary",
  sulfatos: "bg-success/15 text-success",
};

const TonnageMyTrips = () => {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const { trucks, zones, trips, loading, updateTrip, deleteTrip } = useTonnage(today);
  const todayStr = format(today, "yyyy-MM-dd");

  const [editTrip, setEditTrip] = useState<TonnageTrip | null>(null);
  const [editForm, setEditForm] = useState({
    weight_kg: "",
    trip_time: "",
    qty_tortas: 0,
    qty_arenas_a: 0,
    qty_arenas_b: 0,
    qty_sulfatos: 0,
    truck_id: "",
    load_zone_id: "",
    unload_zone_id: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const todayTrips = useMemo(
    () =>
      trips
        .filter((t) => t.trip_date === todayStr)
        .sort((a, b) => (b.trip_time || "").localeCompare(a.trip_time || "") || b.created_at.localeCompare(a.created_at)),
    [trips, todayStr],
  );

  const myTodayTrips = useMemo(
    () => todayTrips.filter((t) => (t.driver_user_id ?? t.created_by_user_id) === user?.id),
    [todayTrips, user],
  );

  // Cargar nombres de conductores (perfiles) para los viajes de hoy
  const [driverNames, setDriverNames] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const ids = Array.from(
      new Set(
        todayTrips
          .flatMap((t) => [t.driver_user_id, t.created_by_user_id])
          .filter(Boolean) as string[],
      ),
    );
    if (ids.length === 0) {
      setDriverNames(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      if (cancelled) return;
      const map = new Map<string, string>();
      ((data ?? []) as Array<{ user_id: string; full_name: string }>).forEach((p) => {
        map.set(p.user_id, p.full_name || "Sin nombre");
      });
      setDriverNames(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [todayTrips]);


  const todayTotalKg = todayTrips.reduce((acc, t) => acc + Number(t.weight_kg), 0);
  const myTotalKg = myTodayTrips.reduce((acc, t) => acc + Number(t.weight_kg), 0);

  const zoneById = useMemo(() => new Map(zones.map((z) => [z.id, z.label])), [zones]);
  const loadZones = useMemo(() => zones.filter((z) => z.zone_type !== "descarga"), [zones]);
  const unloadZones = useMemo(() => zones.filter((z) => z.zone_type !== "carga"), [zones]);

  const openEdit = (trip: TonnageTrip) => {
    setEditTrip(trip);
    setEditForm({
      weight_kg: String(trip.weight_kg),
      trip_time: trip.trip_time ? trip.trip_time.slice(0, 5) : "",
      qty_tortas: Number(trip.qty_tortas || 0),
      qty_arenas_a: Number(trip.qty_arenas_a || 0),
      qty_arenas_b: Number(trip.qty_arenas_b || 0),
      qty_sulfatos: Number(trip.qty_sulfatos || 0),
      truck_id: trip.truck_id,
      load_zone_id: trip.load_zone_id || "",
      unload_zone_id: trip.unload_zone_id || "",
    });
  };

  const saveEdit = async () => {
    if (!editTrip) return;
    const kg = parseFloat(editForm.weight_kg.replace(",", "."));
    if (isNaN(kg) || kg <= 0) return;
    setSavingEdit(true);
    const ok = await updateTrip(editTrip.id, {
      truck_id: editForm.truck_id,
      weight_kg: kg,
      trip_time: editForm.trip_time || null,
      qty_tortas: editForm.qty_tortas,
      qty_arenas_a: editForm.qty_arenas_a,
      qty_arenas_b: editForm.qty_arenas_b,
      qty_sulfatos: editForm.qty_sulfatos,
      load_zone_id: editForm.load_zone_id || null,
      unload_zone_id: editForm.unload_zone_id || null,
    });
    setSavingEdit(false);
    if (ok) setEditTrip(null);
  };

  const handleDelete = async (trip: TonnageTrip) => {
    if (!window.confirm(`¿Eliminar el viaje de las ${trip.trip_time?.slice(0, 5) || "—"} (${formatKg(Number(trip.weight_kg))} kg)?`)) return;
    await deleteTrip(trip.id);
  };

  return (
    <div className="space-y-3">
      <header className="grid grid-cols-2 gap-3">
        <div className="panel-surface p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Mi aportación hoy</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {formatKg(myTotalKg)} <span className="text-sm font-normal text-muted-foreground">kg</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {myTodayTrips.length} viaje{myTodayTrips.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="panel-surface p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total del equipo hoy</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {formatKg(todayTotalKg)} <span className="text-sm font-normal text-muted-foreground">kg</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {todayTrips.length} viaje{todayTrips.length !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      <section className="panel-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {format(today, "EEEE d 'de' MMMM", { locale: es })}
            </p>
            <p className="text-xs text-muted-foreground">Más recientes primero · Pulsa el lápiz para editar</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {todayTrips.length} total
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : todayTrips.length === 0 ? (
          <EmptyState icon={Truck} title="Sin viajes" description="Cuando alguien registre el primer viaje aparecerá aquí." />
        ) : (
          <ul className="divide-y divide-border">
            {todayTrips.map((trip) => {
              const truck = trucks.find((t) => t.id === trip.truck_id);
              const driverId = trip.driver_user_id ?? trip.created_by_user_id;
              const isMine = driverId === user?.id;
              const loadLabel = trip.load_zone_id ? zoneById.get(trip.load_zone_id) : null;
              const unloadLabel = trip.unload_zone_id ? zoneById.get(trip.unload_zone_id) : null;
              const matChips: Array<{ label: string; qty: number; tone: string }> = [];
              if (trip.qty_tortas > 0) matChips.push({ label: "Tortas", qty: trip.qty_tortas, tone: materialTone.tortas });
              if (trip.qty_arenas_a > 0) matChips.push({ label: "Arenas A", qty: trip.qty_arenas_a, tone: materialTone.arenas });
              if (trip.qty_arenas_b > 0) matChips.push({ label: "Arenas B", qty: trip.qty_arenas_b, tone: materialTone.arenas });
              if (trip.qty_sulfatos > 0) matChips.push({ label: "Sulfatos", qty: trip.qty_sulfatos, tone: materialTone.sulfatos });

              return (
                <li key={trip.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-10 w-10 flex-none items-center justify-center rounded-xl text-xs font-bold", materialTone[trip.material_snapshot])}>
                      #{truck?.truck_number ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {truck?.label ?? "Camión eliminado"}
                        </p>
                        {isMine && <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">· tú</span>}
                      </div>
                      {(() => {
                        const driverName = driverId
                          ? isMine
                            ? "Tú"
                            : driverNames.get(driverId) || "Conductor"
                          : null;
                        return driverName ? (
                          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-foreground">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {driverName}
                          </p>
                        ) : null;
                      })()}
                      <p className="text-xs text-muted-foreground">
                        {trip.trip_time ? trip.trip_time.slice(0, 5) : "—"} · {formatKg(Number(trip.weight_kg))} kg
                        {loadLabel && <> · de <span className="font-medium text-foreground">{loadLabel}</span></>}
                        {unloadLabel && <> a <span className="font-medium text-foreground">{unloadLabel}</span></>}
                      </p>
                      {matChips.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {matChips.map((c) => (
                            <span key={c.label} className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", c.tone)}>
                              {c.qty} × {c.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-none items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => openEdit(trip)}
                        title="Editar viaje"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => void handleDelete(trip)}
                        title="Eliminar viaje"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Dialog de edición */}
      <Dialog open={editTrip !== null} onOpenChange={(o) => !o && setEditTrip(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar viaje</DialogTitle>
            <DialogDescription>Modifica los datos y pulsa guardar.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Camión</Label>
              <Select value={editForm.truck_id} onValueChange={(v) => setEditForm((f) => ({ ...f, truck_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {trucks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>#{t.truck_number} · {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1.5 block text-xs font-medium">Peso (kg)</Label>
                <Input
                  type="number"
                  step="10"
                  value={editForm.weight_kg}
                  onChange={(e) => setEditForm((f) => ({ ...f, weight_kg: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-medium">Hora</Label>
                <Input
                  type="time"
                  value={editForm.trip_time}
                  onChange={(e) => setEditForm((f) => ({ ...f, trip_time: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-medium">Materiales (cantidad)</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "qty_tortas", label: "Tortas" },
                  { key: "qty_arenas_a", label: "Arenas A" },
                  { key: "qty_arenas_b", label: "Arenas B" },
                  { key: "qty_sulfatos", label: "Sulfatos" },
                ].map((m) => (
                  <div key={m.key} className="flex items-center gap-1.5">
                    <span className="w-16 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{m.label}</span>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={(editForm as any)[m.key] || 0}
                      onChange={(e) => setEditForm((f) => ({ ...f, [m.key]: parseFloat(e.target.value) || 0 }))}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1.5 block text-xs font-medium">Carga</Label>
                <Select value={editForm.load_zone_id} onValueChange={(v) => setEditForm((f) => ({ ...f, load_zone_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {loadZones.map((z) => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-medium">Descarga</Label>
                <Select value={editForm.unload_zone_id} onValueChange={(v) => setEditForm((f) => ({ ...f, unload_zone_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {unloadZones.map((z) => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => void saveEdit()} disabled={savingEdit}>
                Guardar cambios
              </Button>
              <Button variant="outline" onClick={() => setEditTrip(null)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TonnageMyTrips;
