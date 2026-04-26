import { useEffect, useMemo, useState } from "react";
import { Factory, Mountain } from "lucide-react";
import { addMonths, format, getDaysInMonth, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useTonnage } from "@/hooks/useTonnage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const ALL_VALUE = "__all__";

const TonnageZoneTracking = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const { zones, trips } = useTonnage(currentMonth);

  const [filterDay, setFilterDay] = useState<string>(ALL_VALUE);
  const [filterDriverId, setFilterDriverId] = useState<string>(ALL_VALUE);

  const [driverNames, setDriverNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const loadDrivers = async () => {
      const ids = Array.from(new Set(trips.map((t) => t.created_by_user_id).filter(Boolean) as string[]));
      if (ids.length === 0) return;
      const { data } = await (supabase as any).from("profiles").select("user_id, full_name").in("user_id", ids);
      const m = new Map<string, string>();
      ((data ?? []) as Array<{ user_id: string; full_name: string }>).forEach((row) => {
        m.set(row.user_id, row.full_name || "Sin nombre");
      });
      setDriverNames(m);
    };
    void loadDrivers();
  }, [trips]);

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      if (filterDay !== ALL_VALUE) {
        const day = new Date(t.trip_date).getDate();
        if (day !== parseInt(filterDay, 10)) return false;
      }
      if (filterDriverId !== ALL_VALUE && t.created_by_user_id !== filterDriverId) return false;
      return true;
    });
  }, [trips, filterDay, filterDriverId]);

  // Conteo por zona de carga
  const zoneCounts = useMemo(() => {
    return zones.map((z) => {
      const count = filteredTrips.filter((t) => t.load_zone_id === z.id).length;
      return { ...z, count };
    });
  }, [zones, filteredTrips]);

  // Destinos: salinas vs acopio
  // Usamos el LABEL de la zona para distinguir; cualquiera que contenga "salina" cuenta como Salinas, "acopio" como Acopio.
  const destinationCounts = useMemo(() => {
    let salinas = 0;
    let acopio = 0;
    filteredTrips.forEach((t) => {
      if (!t.unload_zone_id) return;
      const zone = zones.find((z) => z.id === t.unload_zone_id);
      if (!zone) return;
      const lbl = zone.label.toLowerCase();
      if (lbl.includes("salina") || lbl === "tolva") salinas += 1;
      else if (lbl.includes("acopio")) acopio += 1;
    });
    return { salinas, acopio };
  }, [filteredTrips, zones]);

  const monthIdx = currentMonth.getMonth();
  const year = currentMonth.getFullYear();
  const daysInMonth = getDaysInMonth(currentMonth);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <section className="panel-surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(monthIdx)} onValueChange={(v) => setCurrentMonth(new Date(year, parseInt(v, 10), 1))}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setCurrentMonth(new Date(parseInt(v, 10), monthIdx, 1))}>
            <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDay} onValueChange={setFilterDay}>
            <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos los días</SelectItem>
              {Array.from({ length: daysInMonth }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDriverId} onValueChange={setFilterDriverId}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos los trabajadores</SelectItem>
              {Array.from(driverNames.entries()).map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* KPI grande */}
      <section className="panel-surface flex flex-col items-center justify-center bg-primary text-primary-foreground p-6">
        <p className="text-base italic">Viajes</p>
        <p className="mt-2 text-6xl font-bold leading-none">{filteredTrips.length}</p>
        <p className="mt-2 text-xs opacity-80">{format(currentMonth, "MMMM yyyy", { locale: es })}</p>
      </section>

      {/* Zonas de carga en burbujas estilo PowerBI */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Por zona de carga</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {zoneCounts
            .filter((z) => z.zone_type === "carga" || z.zone_type === "ambas")
            .map((z) => (
              <div key={z.id} className="text-center">
                <div className="rounded-3xl bg-primary px-3 py-3 text-primary-foreground">
                  <p className="text-sm font-semibold uppercase">{z.label}</p>
                </div>
                <div className="mx-auto mt-1.5 inline-block min-w-[44px] rounded-2xl border border-warning/40 bg-background px-3 py-1 text-lg font-bold text-foreground shadow-sm">
                  {z.count}
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Destinos: Salinas y Acopio */}
      <section className="grid grid-cols-2 gap-3">
        <div className="panel-surface flex items-center gap-4 p-6">
          <Factory className="h-16 w-16 text-warning" strokeWidth={1.5} />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destino</p>
            <p className="text-xl font-bold text-foreground">Salinas / Tolva</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/30 text-2xl font-bold text-foreground">
            {destinationCounts.salinas}
          </div>
        </div>
        <div className="panel-surface flex items-center gap-4 p-6">
          <Mountain className="h-16 w-16 text-warning" strokeWidth={1.5} />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destino</p>
            <p className="text-xl font-bold text-foreground">Acopio</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/30 text-2xl font-bold text-foreground">
            {destinationCounts.acopio}
          </div>
        </div>
      </section>

      <p className="text-center text-[11px] text-muted-foreground">
        Las zonas se gestionan desde la subpestaña "Camiones" → sección Zonas.
      </p>
    </div>
  );
};

export default TonnageZoneTracking;
