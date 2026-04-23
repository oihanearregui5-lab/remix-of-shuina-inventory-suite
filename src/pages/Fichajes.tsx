import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Filter, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import PageHeader from "@/components/shared/PageHeader";
import FichajeStatusCard from "@/components/fichajes/FichajeStatusCard";
import FichajeHistoryList from "@/components/fichajes/FichajeHistoryList";

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  latitude_in: number | null;
  longitude_in: number | null;
  latitude_out: number | null;
  longitude_out: number | null;
  notes: string | null;
}

const Fichajes = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [historyFilter, setHistoryFilter] = useState<"all" | "open" | "closed">("all");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) fetchEntries();
  }, [user]);

  const fetchEntries = async () => {
    const { data } = await supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", user!.id)
      .order("clock_in", { ascending: false })
      .limit(30);

    if (data) {
      setEntries(data);
      const open = data.find((e) => !e.clock_out);
      setActiveEntry(open ?? null);
    }
  };

  const getLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 10000 }
      );
    });
  };

  const handleClockIn = async () => {
    setLoading(true);
    const loc = await getLocation();
    const { error } = await supabase.from("time_entries").insert({
      user_id: user!.id,
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
  };

  const handleClockOut = async () => {
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
  };

  const formatDuration = (clockIn: string, clockOut: string | null) => {
    const end = clockOut ? new Date(clockOut) : new Date();
    const mins = differenceInMinutes(end, new Date(clockIn));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const todayEntries = entries.filter((entry) => new Date(entry.clock_in).toDateString() === new Date().toDateString());
  const workedTodayMinutes = todayEntries.reduce(
    (total, entry) => total + Math.max(0, differenceInMinutes(entry.clock_out ? new Date(entry.clock_out) : new Date(), new Date(entry.clock_in))),
    0
  );
  const workedTodayLabel = `${Math.floor(workedTodayMinutes / 60)}h ${workedTodayMinutes % 60}m`;
  const currentSessionLabel = activeEntry ? formatDuration(activeEntry.clock_in, null) : "Sin jornada activa";
  const lastMovementLabel = entries[0]
    ? `${entries[0].clock_out ? "Salida" : "Entrada"} ${format(new Date(entries[0].clock_out ?? entries[0].clock_in), "HH:mm")}`
    : "Sin registros";
  const filteredEntries = entries.filter((entry) => {
    if (historyFilter === "open") return !entry.clock_out;
    if (historyFilter === "closed") return !!entry.clock_out;
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="Fichaje móvil"
        title="Fichar en un toque"
        description="Abre, comprueba tu estado y registra la jornada sin pasos extra. Todo lo importante queda visible en la primera pantalla."
      />

      <FichajeStatusCard
        active={!!activeEntry}
        loading={loading}
        currentTime={currentTime}
        workedTodayLabel={workedTodayLabel}
        currentSessionLabel={currentSessionLabel}
        lastMovementLabel={lastMovementLabel}
        onPrimaryAction={activeEntry ? handleClockOut : handleClockIn}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Calendar className="h-4.5 w-4.5" /> Historial
          </h2>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Button size="sm" variant={historyFilter === "all" ? "default" : "outline"} onClick={() => setHistoryFilter("all")}>Todo</Button>
            <Button size="sm" variant={historyFilter === "open" ? "default" : "outline"} onClick={() => setHistoryFilter("open")}>Activos</Button>
            <Button size="sm" variant={historyFilter === "closed" ? "default" : "outline"} onClick={() => setHistoryFilter("closed")}>Cerrados</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-muted/25 p-1.5">
          <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3 shadow-[var(--shadow-soft)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Estado actual</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{activeEntry ? "Jornada en marcha" : "Esperando próximo fichaje"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Tiempo hoy</p>
              <p className="text-sm font-semibold text-foreground">{workedTodayLabel}</p>
            </div>
          </div>
        </div>

        <FichajeHistoryList entries={filteredEntries} />
      </div>
    </div>
  );
};

export default Fichajes;
