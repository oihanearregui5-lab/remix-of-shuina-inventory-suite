import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// ============================================================
// TIPOS
// ============================================================

// Mantenemos TonnageMaterial para compatibilidad con código existente
export type TonnageMaterial = "arenas" | "tortas" | "sulfatos";

export type ZoneType = "carga" | "descarga" | "ambas";

export interface TonnageTruck {
  id: string;
  truck_number: number;
  label: string;
  material: TonnageMaterial;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
}

export interface TonnageZone {
  id: string;
  label: string;
  zone_type: ZoneType;
  sort_order: number;
  is_active: boolean;
}

export interface TonnageTrip {
  id: string;
  truck_id: string;
  trip_date: string;
  trip_time: string | null;
  weight_kg: number;
  // Cantidades por material — un viaje puede llevar varios
  qty_tortas: number;
  qty_arenas_a: number;
  qty_arenas_b: number;
  qty_sulfatos: number;
  // Zonas
  load_zone_id: string | null;
  unload_zone_id: string | null;
  // Compatibilidad con la primera versión
  material_snapshot: TonnageMaterial;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
}

export interface TonnageTripInput {
  truck_id: string;
  trip_date: string;
  trip_time?: string | null;
  weight_kg: number;
  qty_tortas?: number;
  qty_arenas_a?: number;
  qty_arenas_b?: number;
  qty_sulfatos?: number;
  load_zone_id?: string | null;
  unload_zone_id?: string | null;
  notes?: string | null;
}

// ============================================================
// HOOK
// ============================================================
export const useTonnage = (monthDate: Date) => {
  const { user } = useAuth();
  const db = supabase as any;
  const [trucks, setTrucks] = useState<TonnageTruck[]>([]);
  const [zones, setZones] = useState<TonnageZone[]>([]);
  const [trips, setTrips] = useState<TonnageTrip[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStart = useMemo(() => format(startOfMonth(monthDate), "yyyy-MM-dd"), [monthDate]);
  const monthEnd = useMemo(() => format(endOfMonth(monthDate), "yyyy-MM-dd"), [monthDate]);

  const loadTrucks = useCallback(async () => {
    const { data, error } = await db
      .from("tonnage_trucks")
      .select("id, truck_number, label, material, is_active, sort_order, notes")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("truck_number", { ascending: true });
    if (error) {
      toast.error("No se pudieron cargar los camiones");
      return;
    }
    setTrucks((data ?? []) as TonnageTruck[]);
  }, [db]);

  const loadZones = useCallback(async () => {
    const { data, error } = await db
      .from("tonnage_zones")
      .select("id, label, zone_type, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) {
      // Si la tabla no existe aún (migración no aplicada) seguimos con array vacío
      console.warn("tonnage_zones no disponible aún:", error.message);
      return;
    }
    setZones((data ?? []) as TonnageZone[]);
  }, [db]);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from("tonnage_trips")
      .select(
        "id, truck_id, trip_date, trip_time, weight_kg, qty_tortas, qty_arenas_a, qty_arenas_b, qty_sulfatos, load_zone_id, unload_zone_id, material_snapshot, notes, created_by_user_id, created_at",
      )
      .gte("trip_date", monthStart)
      .lte("trip_date", monthEnd)
      .order("trip_date", { ascending: true })
      .order("trip_time", { ascending: true });
    if (error) {
      toast.error("No se pudieron cargar los viajes");
      setLoading(false);
      return;
    }
    setTrips((data ?? []) as TonnageTrip[]);
    setLoading(false);
  }, [db, monthStart, monthEnd]);

  useEffect(() => {
    void loadTrucks();
    void loadZones();
  }, [loadTrucks, loadZones]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("tonnage-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tonnage_trips" }, () => void loadTrips())
      .on("postgres_changes", { event: "*", schema: "public", table: "tonnage_trucks" }, () => void loadTrucks())
      .on("postgres_changes", { event: "*", schema: "public", table: "tonnage_zones" }, () => void loadZones())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadTrips, loadTrucks, loadZones]);

  const addTrip = useCallback(
    async (input: TonnageTripInput) => {
      if (!user) return false;
      const { error } = await db.from("tonnage_trips").insert({
        truck_id: input.truck_id,
        trip_date: input.trip_date,
        trip_time: input.trip_time || null,
        weight_kg: input.weight_kg,
        qty_tortas: input.qty_tortas ?? 0,
        qty_arenas_a: input.qty_arenas_a ?? 0,
        qty_arenas_b: input.qty_arenas_b ?? 0,
        qty_sulfatos: input.qty_sulfatos ?? 0,
        load_zone_id: input.load_zone_id || null,
        unload_zone_id: input.unload_zone_id || null,
        notes: input.notes?.trim() || null,
        created_by_user_id: user.id,
      });
      if (error) {
        toast.error("No se pudo guardar el viaje");
        return false;
      }
      toast.success("✅ Viaje registrado");
      await loadTrips();
      return true;
    },
    [db, loadTrips, user],
  );

  const updateTrip = useCallback(
    async (tripId: string, changes: Partial<TonnageTripInput>) => {
      const payload: Record<string, unknown> = {};
      if (changes.truck_id !== undefined) payload.truck_id = changes.truck_id;
      if (changes.trip_date !== undefined) payload.trip_date = changes.trip_date;
      if (changes.trip_time !== undefined) payload.trip_time = changes.trip_time || null;
      if (changes.weight_kg !== undefined) payload.weight_kg = changes.weight_kg;
      if (changes.qty_tortas !== undefined) payload.qty_tortas = changes.qty_tortas;
      if (changes.qty_arenas_a !== undefined) payload.qty_arenas_a = changes.qty_arenas_a;
      if (changes.qty_arenas_b !== undefined) payload.qty_arenas_b = changes.qty_arenas_b;
      if (changes.qty_sulfatos !== undefined) payload.qty_sulfatos = changes.qty_sulfatos;
      if (changes.load_zone_id !== undefined) payload.load_zone_id = changes.load_zone_id || null;
      if (changes.unload_zone_id !== undefined) payload.unload_zone_id = changes.unload_zone_id || null;
      if (changes.notes !== undefined) payload.notes = changes.notes?.trim() || null;

      const { error } = await db.from("tonnage_trips").update(payload).eq("id", tripId);
      if (error) {
        toast.error("No se pudo actualizar el viaje");
        return false;
      }
      toast.success("Viaje actualizado");
      await loadTrips();
      return true;
    },
    [db, loadTrips],
  );

  const deleteTrip = useCallback(
    async (tripId: string) => {
      const { error } = await db.from("tonnage_trips").delete().eq("id", tripId);
      if (error) {
        toast.error("No se pudo eliminar el viaje");
        return false;
      }
      toast.success("Viaje eliminado");
      await loadTrips();
      return true;
    },
    [db, loadTrips],
  );

  return { trucks, zones, trips, loading, addTrip, updateTrip, deleteTrip, reload: loadTrips };
};

// ============================================================
// HELPERS DE AGREGACIÓN
// ============================================================

export interface DailySummary {
  day: number;
  date: string;
  tripCount: number;
  totalKg: number;
  avgKg: number;
}

export interface TruckColumnSummary {
  truckId: string;
  truckNumber: number;
  label: string;
  material: TonnageMaterial;
  tripCount: number;
  totalKg: number;
  avgKg: number;
}

export interface MaterialQuantitiesSummary {
  tortas: number;
  arenas_a: number;
  arenas_b: number;
  sulfatos: number;
  totalUnits: number; // suma total
}

export interface ZoneSummary {
  zoneId: string;
  label: string;
  tripCount: number;
}

export interface DriverSummary {
  userId: string;
  name: string;
  tripCount: number;
}

export const aggregateTrips = (trucks: TonnageTruck[], trips: TonnageTrip[]) => {
  const byDayByTruck = new Map<string, Map<string, TonnageTrip[]>>();
  const byDay = new Map<string, TonnageTrip[]>();
  const byTruck = new Map<string, TonnageTrip[]>();

  trips.forEach((trip) => {
    if (!byDayByTruck.has(trip.trip_date)) byDayByTruck.set(trip.trip_date, new Map());
    const truckMap = byDayByTruck.get(trip.trip_date)!;
    if (!truckMap.has(trip.truck_id)) truckMap.set(trip.truck_id, []);
    truckMap.get(trip.truck_id)!.push(trip);

    if (!byDay.has(trip.trip_date)) byDay.set(trip.trip_date, []);
    byDay.get(trip.trip_date)!.push(trip);

    if (!byTruck.has(trip.truck_id)) byTruck.set(trip.truck_id, []);
    byTruck.get(trip.truck_id)!.push(trip);
  });

  return { byDayByTruck, byDay, byTruck };
};

export const computeDailySummaries = (trips: TonnageTrip[]): DailySummary[] => {
  const byDay = new Map<string, TonnageTrip[]>();
  trips.forEach((t) => {
    if (!byDay.has(t.trip_date)) byDay.set(t.trip_date, []);
    byDay.get(t.trip_date)!.push(t);
  });
  return Array.from(byDay.entries())
    .map(([date, dayTrips]) => {
      const totalKg = dayTrips.reduce((acc, t) => acc + Number(t.weight_kg), 0);
      const tripCount = dayTrips.length;
      return {
        day: new Date(date).getDate(),
        date,
        tripCount,
        totalKg,
        avgKg: tripCount > 0 ? totalKg / tripCount : 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const computeTruckSummaries = (trucks: TonnageTruck[], trips: TonnageTrip[]): TruckColumnSummary[] => {
  return trucks.map((truck) => {
    const truckTrips = trips.filter((t) => t.truck_id === truck.id);
    const totalKg = truckTrips.reduce((acc, t) => acc + Number(t.weight_kg), 0);
    const tripCount = truckTrips.length;
    return {
      truckId: truck.id,
      truckNumber: truck.truck_number,
      label: truck.label,
      material: truck.material,
      tripCount,
      totalKg,
      avgKg: tripCount > 0 ? totalKg / tripCount : 0,
    };
  });
};

export const computeMaterialQuantities = (trips: TonnageTrip[]): MaterialQuantitiesSummary => {
  const tortas = trips.reduce((acc, t) => acc + Number(t.qty_tortas || 0), 0);
  const arenas_a = trips.reduce((acc, t) => acc + Number(t.qty_arenas_a || 0), 0);
  const arenas_b = trips.reduce((acc, t) => acc + Number(t.qty_arenas_b || 0), 0);
  const sulfatos = trips.reduce((acc, t) => acc + Number(t.qty_sulfatos || 0), 0);
  return {
    tortas,
    arenas_a,
    arenas_b,
    sulfatos,
    totalUnits: tortas + arenas_a + arenas_b + sulfatos,
  };
};

export const computeZoneSummaries = (
  trips: TonnageTrip[],
  zones: TonnageZone[],
  field: "load_zone_id" | "unload_zone_id",
): ZoneSummary[] => {
  return zones.map((zone) => {
    const tripCount = trips.filter((t) => t[field] === zone.id).length;
    return { zoneId: zone.id, label: zone.label, tripCount };
  });
};

export const computeDriverSummaries = (
  trips: TonnageTrip[],
  driverNames: Map<string, string>,
): DriverSummary[] => {
  const counts = new Map<string, number>();
  trips.forEach((trip) => {
    if (!trip.created_by_user_id) return;
    counts.set(trip.created_by_user_id, (counts.get(trip.created_by_user_id) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([userId, tripCount]) => ({
      userId,
      name: driverNames.get(userId) || "Sin nombre",
      tripCount,
    }))
    .sort((a, b) => b.tripCount - a.tripCount);
};

export const formatKg = (kg: number) => kg.toLocaleString("es-ES", { maximumFractionDigits: 0 });
export const formatTons = (kg: number) =>
  (kg / 1000).toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
