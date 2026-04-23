import { BookOpenText, FileSpreadsheet, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkerItem } from "./vacation-types";

export interface GenericSummary {
  annualHours: number;
  vacationDays: number;
  dailyHours: number;
  holidayCount: number;
  laborableDays: number;
}

export interface MonthReadingItem {
  worker: {
    id: string;
    name: string;
    color: string;
  };
  stats: {
    assignments: number;
    nights: number;
    special: number;
  };
}

export interface WarningItem {
  id: string;
  name?: string;
  note?: string;
  display_name?: string;
  extra_vacation_reason?: string | null;
}

interface Props {
  open: boolean;
  genericSummary: GenericSummary;
  monthReading: MonthReadingItem[];
  warnings: WarningItem[];
  onClose: () => void;
}

const JourneysSidePanel = ({ open, genericSummary, monthReading, warnings, onClose }: Props) => {
  return (
    <aside className={cn("fixed right-0 top-24 z-40 h-[75vh] w-[340px] max-w-[90vw] translate-x-full overflow-y-auto rounded-l-xl border border-border bg-card p-5 shadow-2xl transition-transform", open && "translate-x-0")}>
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-bold text-foreground">Panel lateral</h4>
        <button type="button" onClick={onClose} className="text-lg text-muted-foreground">✕</button>
      </div>
      <section className="border-b border-dashed border-border pb-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><FileSpreadsheet className="h-4 w-4 text-primary" /> Hoja genérico</div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Horas convenio</span><b className="text-foreground">{genericSummary.annualHours.toLocaleString("es-ES")} h</b></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Vacaciones estándar</span><b className="text-foreground">{genericSummary.vacationDays} días</b></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Horas por día</span><b className="text-foreground">{genericSummary.dailyHours} h</b></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Festivos contemplados</span><b className="text-foreground">{genericSummary.holidayCount}</b></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Total laborables año</span><b className="text-foreground">{genericSummary.laborableDays} días</b></div>
        </div>
      </section>
      <section className="border-b border-dashed border-border py-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><BookOpenText className="h-4 w-4 text-primary" /> Lectura del mes</div>
        <div className="space-y-3">
          {monthReading.map(({ worker, stats }) => (
            <div key={worker.id} className="flex items-center gap-3 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: worker.color }} />
              <div>
                <p className="font-semibold text-foreground">{worker.name.toUpperCase()}</p>
                <p className="text-muted-foreground">{stats.assignments} turnos · {stats.nights} noches · {stats.special} especiales</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="pt-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><TriangleAlert className="h-4 w-4 text-primary" /> Avisos</div>
        <div className="space-y-2">
          {warnings.length === 0 ? <p className="text-sm text-muted-foreground">Sin avisos activos.</p> : warnings.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="font-medium text-foreground">{"name" in item ? item.name : item.display_name}</span>
              <span className="text-muted-foreground">{"note" in item ? item.note : item.extra_vacation_reason ?? "Inactivo"}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
};

export default JourneysSidePanel;