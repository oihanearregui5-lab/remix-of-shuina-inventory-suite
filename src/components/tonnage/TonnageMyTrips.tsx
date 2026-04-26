import { useMemo } from "react";
import { Truck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import EmptyState from "@/components/shared/EmptyState";
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

const TonnageMyTrips = () => {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const { trucks, zones, trips, loading } = useTonnage(today);
  const todayStr = format(today, "yyyy-MM-dd");

  const todayTrips = useMemo(
    () =>
      trips
        .filter((t) => t.trip_date === todayStr)
        .sort((a, b) => (b.trip_time || "").localeCompare(a.trip_time || "") || b.created_at.localeCompare(a.created_at)),
    [trips, todayStr],
  );

  const myTodayTrips = useMemo(
    () => todayTrips.filter((t) => t.created_by_user_id === user?.id),
    [todayTrips, user],
  );

  const todayTotalKg = todayTrips.reduce((acc, t) => acc + Number(t.weight_kg), 0);
  const myTotalKg = myTodayTrips.reduce((acc, t) => acc + Number(t.weight_kg), 0);

  const zoneById = useMemo(() => new Map(zones.map((z) => [z.id, z.label])), [zones]);

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
            <p className="text-xs text-muted-foreground">Más recientes primero</p>
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
              const isMine = trip.created_by_user_id === user?.id;
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

export default TonnageMyTrips;
