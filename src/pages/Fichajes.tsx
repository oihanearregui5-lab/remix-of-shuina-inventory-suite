import { useEffect, useState } from "react";
import { Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, differenceInMinutes } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import FichajeStatusCard from "@/components/fichajes/FichajeStatusCard";
import FichajeHistoryList from "@/components/fichajes/FichajeHistoryList";
import SmartRemindersPanel from "@/components/shared/SmartRemindersPanel";
import { useSmartReminders } from "@/hooks/useSmartReminders";
import HoursBalancePanel from "@/components/shared/HoursBalancePanel";
import { summarizeCurrentMonth } from "@/lib/time-balance";
import { useClockEntry } from "@/hooks/useClockEntry";
import { useUIMode } from "@/hooks/useUIMode";

const Fichajes = () => {
  const { reminders } = useSmartReminders();
  const { isSimple } = useUIMode();
  const { activeEntry, entries, loading, toggleClock } = useClockEntry();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [historyFilter, setHistoryFilter] = useState<"all" | "open" | "closed">("all");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    0,
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
  // En modo simple solo los últimos 3 cerrados
  const simpleEntries = entries.filter((entry) => entry.clock_out).slice(0, 3);
  const monthlyHoursSummary = summarizeCurrentMonth(entries);

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader eyebrow="Fichaje" title="Fichar rápido" description="Mira tu estado y pulsa una vez." />

      {!isSimple && (
        <SmartRemindersPanel
          reminders={reminders.filter((reminder) => reminder.section === "fichajes" || reminder.section === "workReports")}
          compact
        />
      )}

      <FichajeStatusCard
        active={!!activeEntry}
        loading={loading}
        currentTime={currentTime}
        workedTodayLabel={workedTodayLabel}
        currentSessionLabel={currentSessionLabel}
        lastMovementLabel={lastMovementLabel}
        onPrimaryAction={toggleClock}
      />

      {!isSimple && (
        <HoursBalancePanel
          summary={monthlyHoursSummary}
          title="Balance automático"
          description="Horas trabajadas este mes frente al objetivo de 8h por día laborable."
          compact
        />
      )}

      {isSimple ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Calendar className="h-4 w-4" /> Últimos fichajes
          </h2>
          <FichajeHistoryList entries={simpleEntries} />
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Calendar className="h-4 w-4" /> Historial
            </h2>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Button size="sm" variant={historyFilter === "all" ? "default" : "outline"} onClick={() => setHistoryFilter("all")}>Todo</Button>
              <Button size="sm" variant={historyFilter === "open" ? "default" : "outline"} onClick={() => setHistoryFilter("open")}>Abiertos</Button>
              <Button size="sm" variant={historyFilter === "closed" ? "default" : "outline"} onClick={() => setHistoryFilter("closed")}>Cerrados</Button>
            </div>
          </div>

          <FichajeHistoryList entries={filteredEntries} />
        </section>
      )}
    </div>
  );
};

export default Fichajes;
