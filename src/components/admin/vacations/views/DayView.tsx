import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { TranstubariData } from "@/lib/transtubari-parser";
import { SHIFT_CODES, SHIFT_HOURS, SHIFT_TITLES, getShiftsFor } from "../journeys-constants";
import { toDateKey } from "../vacation-utils";
import ShiftPill from "../ShiftPill";
import type { DisplayWorker } from "../useWorkerLookups";
import type { JourneyOverride } from "../useJourneyOverrides";
import type { ShiftCode } from "../journeys-constants";

interface Props {
  data: TranstubariData;
  anchorDate: Date;
  holidaysByDate: Map<string, { label: string; color: string | null }>;
  selectedWorkerId: string | null;
  getDisplayWorker: (workerId: string | null | undefined) => DisplayWorker | null;
  onClickWorker: (workerId: string) => void;
  editMode?: boolean;
  allWorkers?: DisplayWorker[];
  getOverride?: (date: string, shift: ShiftCode) => JourneyOverride | null;
  onAssign?: (date: string, shift: ShiftCode, staffMemberId: string, color?: string | null) => Promise<void>;
  onClear?: (date: string, shift: ShiftCode) => Promise<void>;
  onRestore?: (date: string, shift: ShiftCode) => Promise<void>;
}

const DayView = ({ data, anchorDate, holidaysByDate, selectedWorkerId, getDisplayWorker, onClickWorker, editMode, allWorkers, getOverride, onAssign, onClear, onRestore }: Props) => {
  const holiday = holidaysByDate.get(toDateKey(anchorDate));

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h4 className="text-2xl font-extrabold capitalize text-foreground">{format(anchorDate, "d 'de' MMMM yyyy", { locale: es })}</h4>
          <p className="text-sm text-muted-foreground">
            {format(anchorDate, "EEEE", { locale: es })}
            {holiday ? ` · Festivo: ${holiday.label}` : ""}
          </p>
        </div>
      </div>
      {(() => {
        const dShifts = getShiftsFor(data, anchorDate);
        const isClosure = (!dShifts || (!dShifts.M && !dShifts.T && !dShifts.N)) && holiday;
        if (isClosure) {
          return (
            <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-10 text-center">
              <p className="text-lg font-bold uppercase tracking-[0.18em] text-destructive">{holiday!.label}</p>
              <p className="mt-2 text-sm text-muted-foreground">Sin turnos asignados este día.</p>
            </div>
          );
        }
        return (
          <div className="grid gap-4 md:grid-cols-3">
            {SHIFT_CODES.map((code) => (
              <div key={code} className="rounded-xl border border-border bg-muted/30 p-6 text-center">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">{SHIFT_TITLES[code]}</p>
                <p className="mt-2 text-xs text-muted-foreground">{SHIFT_HOURS[code]}</p>
                <div className="mt-6">
                  <ShiftPill
                    shifts={dShifts}
                    code={code}
                    compact
                    selectedWorkerId={selectedWorkerId}
                    getDisplayWorker={getDisplayWorker}
                    onClickWorker={onClickWorker}
                    date={anchorDate}
                    editMode={editMode}
                    override={getOverride?.(toDateKey(anchorDate), code) ?? null}
                    allWorkers={allWorkers}
                    onAssign={onAssign}
                    onClear={onClear}
                    onRestore={onRestore}
                  />
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
};

export default DayView;