import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Clock, MapPin, LogIn, LogOut, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";

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

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Fichajes</h1>
        <p className="text-muted-foreground mt-1">Registro de jornada laboral</p>
      </div>

      <div className="mb-6 flex items-center justify-center">
        <div className={`inline-flex items-center gap-3 rounded-full border px-5 py-2 text-sm font-semibold ${activeEntry ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-card text-muted-foreground"}`}>
          <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ${activeEntry ? "bg-destructive text-destructive-foreground" : "bg-muted text-foreground"}`}>
            {activeEntry ? "ON" : "OFF"}
          </span>
          <span>{activeEntry ? "Activo en plantilla" : "Fuera de servicio"}</span>
        </div>
      </div>

      {/* Clock Card */}
      <div className="bg-card border border-border rounded-xl p-8 mb-6 text-center shadow-sm">
        <div className="text-5xl font-bold text-foreground mb-1 tabular-nums">
          {format(currentTime, "HH:mm:ss")}
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          {format(currentTime, "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </p>

        {activeEntry ? (
          <div>
            <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full text-sm font-medium mb-4">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Trabajando desde {format(new Date(activeEntry.clock_in), "HH:mm")}
              <span className="text-muted-foreground">
                ({formatDuration(activeEntry.clock_in, null)})
              </span>
            </div>
            <br />
            <Button
              onClick={handleClockOut}
              disabled={loading}
              variant="destructive"
              size="lg"
              className="text-base px-8 py-6"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Fichar Salida
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleClockIn}
            disabled={loading}
            size="lg"
            className="text-base px-8 py-6 bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Fichar Entrada
          </Button>
        )}
      </div>

      {/* Recent entries */}
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" /> Registro reciente
      </h2>

      <div className="space-y-3">
        {entries.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No hay fichajes registrados</p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="bg-card border border-border rounded-lg p-4 flex items-center justify-between shadow-sm transition-colors hover:bg-muted/40"
          >
            <div>
              <p className="text-sm text-muted-foreground">
                {format(new Date(entry.clock_in), "EEEE d MMM", { locale: es })}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-foreground font-medium">
                  {format(new Date(entry.clock_in), "HH:mm")}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="text-foreground font-medium">
                  {entry.clock_out
                    ? format(new Date(entry.clock_out), "HH:mm")
                    : "En curso..."}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`text-sm font-semibold ${
                  entry.clock_out ? "text-primary" : "text-success"
                }`}
              >
                {formatDuration(entry.clock_in, entry.clock_out)}
              </span>
              {entry.latitude_in && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" /> GPS
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Fichajes;
