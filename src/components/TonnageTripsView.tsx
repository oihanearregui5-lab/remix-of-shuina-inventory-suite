import { useMemo, useState } from "react";
import { Clock, PackageOpen, Plus, Scale, Truck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { useUIMode } from "@/hooks/useUIMode";
import { useAuth } from "@/hooks/useAuth";
import { useTonnage, formatKg, type TonnageMaterial } from "@/hooks/useTonnage";
import { cn } from "@/lib/utils";

const materialLabel: Record<TonnageMaterial, string> = {
  arenas: "Arenas",
  tortas: "Tortas",
  sulfatos: "Sulfatos",
};

const materialTone: Record<TonnageMaterial, string> = {
  arenas: "bg-warning/20 text-foreground",
  tortas: "bg-primary/15 text-primary",
  sulfatos: "bg-success/15 text-success",
};

const TonnageTripsView = () => {
  const { user } = useAuth();
  const { isSimple } = useUIMode();
  const today = useMemo(() => new Date(), []);
  const { trucks, trips, loading, addTrip } = useTonnage(today);

  const [truckId, setTruckId] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [tripTime, setTripTime] = useState<string>(() => format(new Date(), "HH:mm"));
  const [saving, setSaving] = useState(false);

  const selectedTruck = trucks.find((t) => t.id === truckId);

  // Viajes del día ordenados por hora descendente (los más recientes arriba)
  const todayStr = format(today, "yyyy-MM-dd");
  const todayTrips = useMemo(
    () =>
      trips
        .filter((t) => t.trip_date === todayStr)
        .sort((a, b) => (b.trip_time || "").localeCompare(a.trip_time || "") || b.created_at.localeCompare(a.created_at)),
    [trips, todayStr],
  );

  // Mis viajes de hoy
  const myTodayTrips = useMemo(
    () => todayTrips.filter((t) => t.created_by_user_id === user?.id),
    [todayTrips, user],
  );

  const todayTotalKg = todayTrips.reduce((acc, t) => acc + Number(t.weight_kg), 0);
  const myTotalKg = myTodayTrips.reduce((acc, t) => acc + Number(t.weight_kg), 0);

  const handleSubmit = async () => {
    if (!truckId) {
      return;
    }
    const kg = parseFloat(weightKg.replace(",", "."));
    if (isNaN(kg) || kg <= 0) {
      return;
    }
    setSaving(true);
    const ok = await addTrip({
      truck_id: truckId,
      trip_date: todayStr,
      trip_time: tripTime || null,
      weight_kg: kg,
    });
    setSaving(false);
    if (ok) {
      setWeightKg("");
      setTripTime(format(new Date(), "HH:mm"));
    }
  };

  const trucksByMaterial = useMemo(() => {
    const result: Record<TonnageMaterial, typeof trucks> = { arenas: [], tortas: [], sulfatos: [] };
    trucks.forEach((t) => result[t.material].push(t));
    return result;
  }, [trucks]);

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        eyebrow="Toneladas"
        title="Registrar viaje"
        description={`${format(today, "EEEE d 'de' MMMM", { locale: es })} — ${todayTrips.length} viajes del equipo hoy`}
      />

      {/* Formulario de nuevo viaje */}
      <section className="panel-surface p-5">
        <div className="space-y-4">
          {/* Selector de camión */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4 text-primary" /> Camión
            </Label>
            <Select value={truckId} onValueChange={setTruckId}>
              <SelectTrigger className="h-14 text-base">
                <SelectValue placeholder="Elige el camión" />
              </SelectTrigger>
              <SelectContent>
                {(["arenas", "tortas", "sulfatos"] as TonnageMaterial[]).map((mat) =>
                  trucksByMaterial[mat].length > 0 ? (
                    <div key={mat}>
                      <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {materialLabel[mat]}
                      </div>
                      {trucksByMaterial[mat].map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="font-medium">#{t.truck_number}</span> · {t.label}
                        </SelectItem>
                      ))}
                    </div>
                  ) : null,
                )}
                {trucks.length === 0 && (
                  <div className="p-3 text-sm text-muted-foreground">
                    No hay camiones. Administración debe crearlos primero.
                  </div>
                )}
              </SelectContent>
            </Select>
            {selectedTruck && (
              <div className="flex items-center gap-2">
                <PackageOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Material fijo:</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", materialTone[selectedTruck.material])}>
                  {materialLabel[selectedTruck.material]}
                </span>
              </div>
            )}
          </div>

          {/* Peso */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Scale className="h-4 w-4 text-primary" /> Peso (kg)
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              step="10"
              min="0"
              placeholder="28500"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="h-14 text-lg font-semibold"
            />
          </div>

          {/* Hora */}
          {!isSimple && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-primary" /> Hora
              </Label>
              <Input type="time" value={tripTime} onChange={(e) => setTripTime(e.target.value)} className="h-12" />
            </div>
          )}

          {/* Botón grande de guardar */}
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!truckId || !weightKg || saving}
            className="h-16 w-full text-base font-bold uppercase tracking-wide bg-success text-white hover:bg-success/90 md:text-lg"
          >
            <Plus className="h-5 w-5" />
            {saving ? "Guardando…" : "Registrar viaje"}
          </Button>
        </div>
      </section>

      {/* Totales del día */}
      {!isSimple && (
        <section className="grid grid-cols-2 gap-3">
          <div className="panel-surface p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Mi aportación hoy</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatKg(myTotalKg)} <span className="text-sm text-muted-foreground font-normal">kg</span></p>
            <p className="text-xs text-muted-foreground">{myTodayTrips.length} viaje{myTodayTrips.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="panel-surface p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total del equipo hoy</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatKg(todayTotalKg)} <span className="text-sm text-muted-foreground font-normal">kg</span></p>
            <p className="text-xs text-muted-foreground">{todayTrips.length} viaje{todayTrips.length !== 1 ? "s" : ""}</p>
          </div>
        </section>
      )}

      {/* Lista de viajes de hoy */}
      <section className="panel-surface p-5">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Viajes de hoy</p>
            <p className="text-xs text-muted-foreground">Últimos primero</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {todayTrips.length} total
          </span>
        </header>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />)}
          </div>
        ) : todayTrips.length === 0 ? (
          <EmptyState icon={Truck} title="Sin viajes" description="Registra el primer viaje del día arriba." />
        ) : (
          <ul className="divide-y divide-border">
            {todayTrips.map((trip) => {
              const truck = trucks.find((t) => t.id === trip.truck_id);
              const isMine = trip.created_by_user_id === user?.id;
              return (
                <li key={trip.id} className="flex items-center gap-3 py-3">
                  <div className={cn("flex h-10 w-10 flex-none items-center justify-center rounded-xl text-xs font-bold", materialTone[trip.material_snapshot])}>
                    #{truck?.truck_number ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {truck?.label ?? "Camión eliminado"}
                      </p>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", materialTone[trip.material_snapshot])}>
                        {materialLabel[trip.material_snapshot]}
                      </span>
                      {isMine && <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">· tú</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {trip.trip_time ? trip.trip_time.slice(0, 5) : "—"} · {formatKg(Number(trip.weight_kg))} kg
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default TonnageTripsView;
