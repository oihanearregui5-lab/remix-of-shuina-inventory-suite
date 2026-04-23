import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getWorkerMonthShifts, getWorkerYearStats, type TranstubariData, type Worker as ExcelWorker } from "@/lib/transtubari-parser";
import { getMonthMatrix, toDateKey } from "./vacation-utils";

interface AppWorkerLike {
  id: string;
  annual_contract_hours?: number;
}

interface Props {
  data: TranstubariData;
  worker: ExcelWorker;
  appWorker: AppWorkerLike | null;
  currentMonth: Date;
  anchorYear: number;
  holidaysByDate: Map<string, { label: string; color: string | null }>;
  onClose: () => void;
  onOpenWorkerProfile: (workerId: string) => void;
}

const WorkerModal = ({ data, worker, appWorker, currentMonth, anchorYear, holidaysByDate, onClose, onOpenWorkerProfile }: Props) => {
  const modalStats = getWorkerYearStats(data, worker.id);
  const modalMonthShifts = getWorkerMonthShifts(data, worker.id, currentMonth.getMonth() + 1);

  const renderWorkerYear = () =>
    Array.from({ length: 12 }, (_, monthIndex) => {
      const monthDate = new Date(anchorYear, monthIndex, 1);
      const weeks = getMonthMatrix(monthDate);
      const monthShifts = new Set(getWorkerMonthShifts(data, worker.id, monthIndex + 1).map((item) => item.day));

      return (
        <div key={monthIndex} className="rounded-lg border border-border bg-card p-3">
          <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{format(monthDate, "MMM", { locale: es })}</p>
          <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-semibold text-muted-foreground">
            {["L", "M", "X", "J", "V", "S", "D"].map((day) => <span key={`${monthIndex}-${day}`}>{day}</span>)}
          </div>
          <div className="mt-1 space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={`${monthIndex}-${weekIndex}`} className="grid grid-cols-7 gap-1">
                {week.map((date) => {
                  const isCurrentMonth = date.getMonth() === monthIndex;
                  const key = toDateKey(date);
                  const holiday = holidaysByDate.get(key);
                  const active = monthShifts.has(date.getDate()) && isCurrentMonth;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-[3px] text-[9px] font-semibold",
                        !isCurrentMonth && "invisible",
                        holiday && "bg-destructive text-destructive-foreground",
                        !holiday && active && "text-primary-foreground",
                        !holiday && !active && (date.getDay() === 0 || date.getDay() === 6) && "text-muted-foreground",
                      )}
                      style={active ? { backgroundColor: worker.color } : undefined}
                    >
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      );
    });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-primary/35 px-4 py-8 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="grid gap-4 border-b border-border px-6 py-6 md:grid-cols-[auto_1fr_auto] md:items-center" style={{ background: `linear-gradient(120deg, hsl(var(--primary)) 0%, ${worker.color} 180%)` }}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/20 text-2xl font-extrabold text-white">{worker.initials.slice(0, 1)}</div>
          <div>
            <h4 className="text-2xl font-extrabold text-white">{worker.name}</h4>
            <p className="mt-1 text-sm text-white/80">Turno por defecto: {worker.defaultShift || "No definido"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {appWorker?.id ? <Button type="button" variant="secondary" size="sm" onClick={() => onOpenWorkerProfile(appWorker.id)}>Abrir ficha completa</Button> : null}
            <button type="button" onClick={onClose} className="ml-auto text-xl text-white/90">✕</button>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-background p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Horas anuales</p><p className="mt-2 text-2xl font-extrabold text-foreground">{(worker.annualHours || appWorker?.annual_contract_hours || 0).toFixed(0)} h</p></div>
            <div className="rounded-xl border border-border bg-background p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Turnos asignados</p><p className="mt-2 text-2xl font-extrabold text-foreground">{modalStats.totalShifts}</p></div>
            <div className="rounded-xl border border-border bg-background p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Horas estimadas</p><p className="mt-2 text-2xl font-extrabold text-foreground">{modalStats.totalHours} h</p></div>
            <div className="rounded-xl border border-border bg-background p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Turnos especiales</p><p className="mt-2 text-2xl font-extrabold text-foreground">{modalStats.specialShifts}</p></div>
          </div>
          <div className="mb-6 rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-bold text-foreground">Mes activo</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {modalMonthShifts.length === 0 ? <span className="text-sm text-muted-foreground">Sin turnos este mes.</span> : modalMonthShifts.map((item) => (
                <span key={`${item.day}-${item.shift}`} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">{item.day} · {item.shift}{item.spec ? ` · ${item.spec}` : ""}</span>
              ))}
            </div>
          </div>
          <h5 className="mb-3 text-sm font-bold text-foreground">Calendario anual · {worker.name}</h5>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{renderWorkerYear()}</div>
        </div>
      </div>
    </div>
  );
};

export default WorkerModal;