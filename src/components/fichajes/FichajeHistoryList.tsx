import { Calendar, MapPin } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import EmptyState from "@/components/shared/EmptyState";

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

interface FichajeHistoryListProps {
  entries: TimeEntry[];
}

const formatDuration = (clockIn: string, clockOut: string | null) => {
  const end = clockOut ? new Date(clockOut) : new Date();
  const mins = differenceInMinutes(end, new Date(clockIn));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const FichajeHistoryList = ({ entries }: FichajeHistoryListProps) => {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Aún no hay fichajes"
        description="Tu historial aparecerá aquí en una lista simple para revisar entradas, salidas y duración de cada jornada."
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className="panel-surface w-full px-4 py-3.5 text-left transition-all hover:border-primary/20 hover:bg-muted/20"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {format(new Date(entry.clock_in), "EEEE d MMM", { locale: es })}
              </p>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{format(new Date(entry.clock_in), "HH:mm")}</span>
                <span>→</span>
                <span>{entry.clock_out ? format(new Date(entry.clock_out), "HH:mm") : "En curso"}</span>
              </div>
              {entry.latitude_in && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> GPS registrado
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border/80 bg-background px-2.5 py-2 text-right shadow-[var(--shadow-soft)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tiempo</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatDuration(entry.clock_in, entry.clock_out)}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default FichajeHistoryList;