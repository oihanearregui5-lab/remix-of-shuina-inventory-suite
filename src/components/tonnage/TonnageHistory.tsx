import { useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Filter, Truck } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { useTonnage, formatKg, type TripType } from "@/hooks/useTonnage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL = "__all__";

const TonnageHistory = () => {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [filterDate, setFilterDate] = useState<string>(todayStr);
  const monthDate = useMemo(() => new Date(filterDate + "T00:00"), [filterDate]);
  const { trucks, trips, loading } = useTonnage(monthDate);
  const [typeFilter, setTypeFilter] = useState<TripType | typeof ALL>(ALL);
  const [driverNames, setDriverNames] = useState<Map<string, string>>(new Map());

  const dayTrips = useMemo(
    () => trips
      .filter((t) => t.trip_date === filterDate)
      .filter((t) => typeFilter === ALL || t.trip_type === typeFilter)
      .sort((a, b) => (b.trip_time || "").localeCompare(a.trip_time || "")),
    [trips, filterDate, typeFilter],
  );

  useEffect(() => {
    const ids = Array.from(new Set(dayTrips.flatMap((t) => [t.driver_user_id, t.created_by_user_id]).filter(Boolean) as string[]));
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).from("profiles").select("user_id, full_name").in("user_id", ids);
      if (cancelled) return;
      const m = new Map<string, string>();
      ((data ?? []) as Array<{ user_id: string; full_name: string }>).forEach((p) => m.set(p.user_id, p.full_name || "Sin nombre"));
      setDriverNames(m);
    })();
    return () => { cancelled = true; };
  }, [dayTrips]);

  const totalKg = dayTrips.reduce((acc, t) => acc + Number(t.weight_kg), 0);
  const tolvaCount = dayTrips.filter((t) => t.trip_type === "tolva").length;
  const acopioCount = dayTrips.filter((t) => t.trip_type === "acopio").length;

  // Materiales del día: suma de kg por material (a partir del camión que hizo el viaje)
  const materialTotals = useMemo(() => {
    const acc = { arenas: 0, tortas: 0, sulfatos: 0 } as Record<"arenas" | "tortas" | "sulfatos", number>;
    dayTrips.forEach((t) => {
      const truck = trucks.find((tr) => tr.id === t.truck_id);
      const mat = (t.material_snapshot || truck?.material) as "arenas" | "tortas" | "sulfatos" | undefined;
      if (mat && mat in acc) acc[mat] += Number(t.weight_kg) || 0;
    });
    return acc;
  }, [dayTrips, trucks]);

  const shiftDay = (delta: number) => {
    const next = addDays(new Date(filterDate + "T00:00"), delta);
    setFilterDate(format(next, "yyyy-MM-dd"));
  };

  return (
    <div className="space-y-3">
      {/* KPIs globales del día (todos los conductores) */}
      <header className="grid grid-cols-3 gap-3">
        <div className="panel-surface p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total del equipo</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {formatKg(totalKg)} <span className="text-sm font-normal text-muted-foreground">kg</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {dayTrips.length} viaje{dayTrips.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="panel-surface p-4">
          <p className="text-xs uppercase tracking-wider text-success">Tolva (facturable)</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{tolvaCount}</p>
          <p className="text-xs text-muted-foreground">viaje{tolvaCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="panel-surface p-4">
          <p className="text-xs uppercase tracking-wider text-warning-foreground">Acopio</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{acopioCount}</p>
          <p className="text-xs text-muted-foreground">viaje{acopioCount !== 1 ? "s" : ""}</p>
        </div>
      </header>

      <section className="panel-surface flex flex-wrap items-end gap-3 p-4">
        <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => shiftDay(-1)} title="Día anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-[180px]">
          <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> Fecha
          </Label>
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-10" />
        </div>
        <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => shiftDay(1)} title="Día siguiente">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-[180px]">
          <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Tipo
          </Label>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="tolva">Tolva (facturables)</SelectItem>
              <SelectItem value="acopio">Acopio</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filterDate !== todayStr && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setFilterDate(todayStr)}>
            Volver a hoy
          </Button>
        )}
      </section>

      <section className="panel-surface p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-foreground capitalize">
            {format(new Date(filterDate + "T00:00"), "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
          <p className="text-xs text-muted-foreground">
            Historial global · todos los conductores ven todos los viajes
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />)}
          </div>
        ) : dayTrips.length === 0 ? (
          <EmptyState icon={Truck} title="Sin viajes" description="Cambia la fecha o el filtro." />
        ) : (
          <ul className="divide-y divide-border">
            {dayTrips.map((t) => {
              const truck = trucks.find((tr) => tr.id === t.truck_id);
              const driverId = t.driver_user_id ?? t.created_by_user_id;
              const driver = driverId ? driverNames.get(driverId) : null;
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-muted text-[10px] font-bold">
                    {truck?.label?.slice(0, 4) ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {truck?.label ?? "Camión"} · {formatKg(Number(t.weight_kg))} kg
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.trip_time?.slice(0, 5) || "—"}{driver ? ` · ${driver}` : ""}
                    </p>
                  </div>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    t.trip_type === "tolva" ? "bg-success/15 text-success" : "bg-warning/20 text-foreground",
                  )}>
                    {t.trip_type ?? "tolva"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Materiales del día (resumen por material para añadir al final del día) */}
      <section className="panel-surface p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-foreground">Materiales del día</p>
          <p className="text-xs text-muted-foreground">
            Total transportado por material · súmalo a tu reporte de fin de jornada
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(["arenas", "tortas", "sulfatos"] as const).map((mat) => (
            <div key={mat} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {mat === "arenas" ? "Arenas" : mat === "tortas" ? "Tortas" : "Sulfatos"}
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {formatKg(materialTotals[mat])}
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">kg</span>
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TonnageHistory;
