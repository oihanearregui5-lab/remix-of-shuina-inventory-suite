import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type TonnageMaterial = "arenas" | "tortas" | "sulfatos";

export interface TonnageTruck {
  id: string;
  truck_number: number;
  label: string;
  material: TonnageMaterial;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
}

export interface TonnageTrip {
  id: string;
  truck_id: string;
  trip_date: string;
  trip_time: string | null;
  weight_kg: number;
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
  notes?: string | null;
}

export const useTonnage = (monthDate: Date) => {
  const { user } = useAuth();
  const db = supabase as any;
  const [trucks, setTrucks] = useState<TonnageTruck[]>([]);
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

  const loadTrips = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from("tonnage_trips")
      .select("id, truck_id, trip_date, trip_time, weight_kg, material_snapshot, notes, created_by_user_id, created_at")
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
  }, [loadTrucks]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  // Realtime: que aparezcan los viajes de otros trabajadores sin refrescar
  useEffect(() => {
    const channel = supabase
      .channel("tonnage-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tonnage_trips" }, () => void loadTrips())
      .on("postgres_changes", { event: "*", schema: "public", table: "tonnage_trucks" }, () => void loadTrucks())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadTrips, loadTrucks]);

  const addTrip = useCallback(
    async (input: TonnageTripInput) => {
      if (!user) return false;
      const { error } = await db.from("tonnage_trips").insert({
        truck_id: input.truck_id,
        trip_date: input.trip_date,
        trip_time: input.trip_time || null,
        weight_kg: input.weight_kg,
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

  return { trucks, trips, loading, addTrip, updateTrip, deleteTrip, reload: loadTrips };
};

// ========== HELPERS DE AGREGACIÓN ==========

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

export interface MaterialSummary {
  material: TonnageMaterial;
  tripCount: number;
  totalKg: number;
}

export const aggregateTrips = (trucks: TonnageTruck[], trips: TonnageTrip[]) => {
  // mapa día → camión → array de viajes (puede haber varios viajes de un camión en un día)
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

export const computeMaterialSummaries = (trips: TonnageTrip[]): MaterialSummary[] => {
  const mats: TonnageMaterial[] = ["arenas", "tortas", "sulfatos"];
  return mats.map((material) => {
    const mTrips = trips.filter((t) => t.material_snapshot === material);
    return {
      material,
      tripCount: mTrips.length,
      totalKg: mTrips.reduce((acc, t) => acc + Number(t.weight_kg), 0),
    };
  });
};

export const formatKg = (kg: number) => kg.toLocaleString("es-ES", { maximumFractionDigits: 0 });
export const formatTons = (kg: number) => (kg / 1000).toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
