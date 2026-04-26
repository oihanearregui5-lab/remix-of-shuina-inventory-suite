import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ClockEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  latitude_in: number | null;
  longitude_in: number | null;
  latitude_out: number | null;
  longitude_out: number | null;
  notes: string | null;
}

const getLocation = (): Promise<{ lat: number; lng: number } | null> =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 10000 },
    );
  });

export const useClockEntry = () => {
  const { user } = useAuth();
  const [activeEntry, setActiveEntry] = useState<ClockEntry | null>(null);
  const [entries, setEntries] = useState<ClockEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("time_entries")
      .select("id, clock_in, clock_out, latitude_in, longitude_in, latitude_out, longitude_out, notes")
      .eq("user_id", user.id)
      .order("clock_in", { ascending: false })
      .limit(30);
    if (data) {
      setEntries(data as ClockEntry[]);
      const open = (data as ClockEntry[]).find((e) => !e.clock_out);
      setActiveEntry(open ?? null);
    }
    setInitialLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  // Realtime: refresca al haber cambios en time_entries propios
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`time-entries-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_entries", filter: `user_id=eq.${user.id}` },
        () => void fetchEntries(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, fetchEntries]);

  const clockIn = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const loc = await getLocation();
    const { error } = await supabase.from("time_entries").insert({
      user_id: user.id,
      clock_in: new Date().toISOString(),
      latitude_in: loc?.lat ?? null,
      longitude_in: loc?.lng ?? null,
    });
    if (error) {
      toast.error("Error al fichar entrada");
    } else {
      toast.success("✅ Entrada fichada");
      await fetchEntries();
    }
    setLoading(false);
  }, [user, fetchEntries]);

  const clockOut = useCallback(async () => {
    if (!activeEntry) return;
    setLoading(true);
    const loc = await getLocation();
    const { error } = await supabase
      .from("time_entries")
      .update({
        clock_out: new Date().toISOString(),
        latitude_out: loc?.lat ?? null,
        longitude_out: loc?.lng ?? null,
      })
      .eq("id", activeEntry.id);
    if (error) {
      toast.error("Error al fichar salida");
    } else {
      toast.success("✅ Salida fichada");
      await fetchEntries();
    }
    setLoading(false);
  }, [activeEntry, fetchEntries]);

  const toggleClock = useCallback(async () => {
    if (activeEntry) return clockOut();
    return clockIn();
  }, [activeEntry, clockIn, clockOut]);

  return {
    activeEntry,
    entries,
    loading,
    initialLoading,
    clockIn,
    clockOut,
    toggleClock,
    refetch: fetchEntries,
  };
};

export default useClockEntry;
