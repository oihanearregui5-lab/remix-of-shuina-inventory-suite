import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Filter, Minus, Package, Plus, Truck } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useTonnage, formatKg, type TripType } from "@/hooks/useTonnage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ALL = "__all__";

const TonnageHistory = () => {
  const { user } = useAuth();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [filterDate, setFilterDate] = useState<string>(todayStr);
  const monthDate = useMemo(() => startOfMonth(new Date(filterDate + "T00:00")), [filterDate]);
  const { trucks, trips, loading } = useTonnage(monthDate);
  const [typeFilter, setTypeFilter] = useState<TripType | typeof ALL>(ALL);
  const [driverNames, setDriverNames] = useState<Map<string, string>>(new Map());

  const isToday = filterDate === todayStr;
  const todayTrips = useMemo(() => trips.filter((t) => t.trip_date === todayStr), [trips, todayStr]);
  const myTodayTrips = useMemo(
    () => todayTrips.filter((t) => (t.driver_user_id ?? t.created_by_user_id) === user?.id),
    [todayTrips, user?.id],
  );
  const todayTotalKg = todayTrips.reduce((acc, t) => acc + Number(t.weight_kg), 0);
  const myTotalKg = myTodayTrips.reduce((acc, t) => acc + Number(t.weight_kg), 0);

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

  // ===== Materiales del día (totales editables al final del día) =====
  // Las cantidades se almacenan en el PRIMER viaje del día como "snapshot diario".
  const allDayTrips = useMemo(
    () => trips
      .filter((t) => t.trip_date === filterDate)
      .sort((a, b) => (a.trip_time || "").localeCompare(b.trip_time || "")),
    [trips, filterDate],
  );
  const anchorTrip = allDayTrips[0] ?? null;

  const [matTortas, setMatTortas] = useState(0);
  const [matArenasA, setMatArenasA] = useState(0);
  const [matArenasB, setMatArenasB] = useState(0);
  const [matSulfatos, setMatSulfatos] = useState(0);
  const [savingMaterials, setSavingMaterials] = useState(false);

  useEffect(() => {
    setMatTortas(Number(anchorTrip?.qty_tortas || 0));
    setMatArenasA(Number(anchorTrip?.qty_arenas_a || 0));
    setMatArenasB(Number(anchorTrip?.qty_arenas_b || 0));
    setMatSulfatos(Number(anchorTrip?.qty_sulfatos || 0));
  }, [anchorTrip?.id]);

  const saveMaterials = async () => {
    if (!anchorTrip) {
      toast.error("Aún no hay viajes registrados este día");
      return;
    }
    setSavingMaterials(true);
    const { error } = await (supabase as any)
      .from("tonnage_trips")
      .update({
        qty_tortas: matTortas,
        qty_arenas_a: matArenasA,
        qty_arenas_b: matArenasB,
        qty_sulfatos: matSulfatos,
      })
      .eq("id", anchorTrip.id);
    setSavingMaterials(false);
    if (error) {
      toast.error("No se pudo guardar el resumen de materiales");
      return;
    }
    toast.success("Materiales del día guardados");
  };


  return (
    <div className="space-y-3">
      {isToday && (
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
      )}
      <section className="panel-surface flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 min-w-[180px]">
          <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> Fecha
          </Label>
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-10" />
        </div>
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
      </section>

      <section className="panel-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground capitalize">
              {format(new Date(filterDate + "T00:00"), "EEEE d 'de' MMMM yyyy", { locale: es })}
            </p>
            <p className="text-xs text-muted-foreground">
              {dayTrips.length} viaje{dayTrips.length !== 1 ? "s" : ""}
              {" · "}{tolvaCount} de tolva facturable{tolvaCount !== 1 ? "s" : ""}
              {" · "}{formatKg(totalKg)} kg
            </p>
          </div>
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

      {/* Resumen de materiales del día (se introduce al final del día) */}
      <section className="panel-surface p-4">
        <header className="mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Materiales del día</h3>
            <p className="text-[11px] text-muted-foreground">
              Indica las unidades totales transportadas en la jornada. Se rellena al cerrar el día.
            </p>
          </div>
        </header>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { key: "tortas", label: "Tortas", value: matTortas, set: setMatTortas, color: "bg-primary/15 text-primary" },
            { key: "arenas_a", label: "Arenas A", value: matArenasA, set: setMatArenasA, color: "bg-warning/20 text-foreground" },
            { key: "arenas_b", label: "Arenas B", value: matArenasB, set: setMatArenasB, color: "bg-warning/30 text-foreground" },
            { key: "sulfatos", label: "Sulfatos", value: matSulfatos, set: setMatSulfatos, color: "bg-success/15 text-success" },
          ].map((m) => (
            <div key={m.key} className="rounded-2xl border border-border bg-background p-3">
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", m.color)}>
                {m.label}
              </span>
              <div className="mt-2 flex items-center justify-between gap-1">
                <Button type="button" size="icon" variant="outline" className="h-9 w-9"
                  onClick={() => m.set(Math.max(0, m.value - 1))} disabled={m.value === 0}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input type="number" min="0" step="1"
                  value={m.value === 0 ? "" : m.value}
                  placeholder="0"
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    m.set(isNaN(n) || n < 0 ? 0 : n);
                  }}
                  className="h-9 flex-1 text-center text-lg font-semibold [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                />
                <Button type="button" size="icon" variant="outline" className="h-9 w-9"
                  onClick={() => m.set(m.value + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          onClick={() => void saveMaterials()}
          disabled={!anchorTrip || savingMaterials}
          className="mt-3 w-full bg-success text-white hover:bg-success/90"
        >
          {savingMaterials ? "Guardando…" : anchorTrip ? "Guardar materiales del día" : "Sin viajes registrados aún"}
        </Button>
      </section>
    </div>
  );
};

export default TonnageHistory;
