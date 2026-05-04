import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { TranstubariData } from "@/lib/transtubari-parser";
import { SHIFT_CODES, SHIFT_HOURS, SHIFT_TITLES, getShiftsFor } from "../journeys-constants";
import { toDateKey } from "../vacation-utils";
import ShiftPill from "../ShiftPill";
import type { DisplayWorker } from "../useWorkerLookups";
import type { JourneyOverride } from "../useJourneyOverrides";
import type { ShiftCode } from "../journeys-constants";

interface Props {
  data: TranstubariData;
  weekDays: Date[];
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

const WeekView = ({ data, weekDays, holidaysByDate, selectedWorkerId, getDisplayWorker, onClickWorker, editMode, allWorkers, getOverride, onAssign, onClear, onRestore }: Props) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="grid min-w-[980px]" style={{ gridTemplateColumns: "90px repeat(7, minmax(0, 1fr))" }}>
        <div className="bg-muted" />
        {weekDays.map((date) => {
          const holiday = holidaysByDate.get(toDateKey(date));
          const current = isSameDay(date, new Date());
          return (
            <div
              key={date.toISOString()}
              className={cn(
                "border-l border-border px-3 py-3 text-center",
                holiday ? "bg-destructive text-destructive-foreground" : current ? "bg-secondary text-secondary-foreground" : "bg-muted",
              )}
            >
              <div className="text-[11px] uppercase tracking-[0.14em]">{format(date, "EEE", { locale: es })}</div>
              <div className="mt-1 text-xl font-extrabold">{format(date, "d")}</div>
            </div>
          );
        })}

        {SHIFT_CODES.map((code) => (
          <div key={code} className="contents">
            <div className="border-t border-border bg-muted px-3 py-4 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {SHIFT_TITLES[code]}
              <div className="mt-1 text-[10px] font-medium normal-case tracking-normal">{SHIFT_HOURS[code]}</div>
            </div>
            {weekDays.map((date) => {
              const dShifts = getShiftsFor(data, date);
              const dHoliday = holidaysByDate.get(toDateKey(date));
              const isClosure = (!dShifts || (!dShifts.M && !dShifts.T && !dShifts.N)) && dHoliday;
              return (
                <div
                  key={`${code}-${date.toISOString()}`}
                  className={cn(
                    "flex min-h-[72px] items-center justify-center border-l border-t border-border px-3 py-3",
                    (date.getDay() === 0 || date.getDay() === 6) && "bg-muted/20",
                    isSameDay(date, new Date()) && "bg-secondary/20",
                  )}
                >
                  {isClosure ? (
                    code === "M" ? (
                      <span className="text-center text-[10px] font-medium uppercase tracking-wider italic text-muted-foreground">
                        {dHoliday!.label}
                      </span>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">—</span>
                    )
                  ) : (
                    <ShiftPill
                      shifts={dShifts}
                      code={code}
                      compact
                      selectedWorkerId={selectedWorkerId}
                      getDisplayWorker={getDisplayWorker}
                      onClickWorker={onClickWorker}
                      date={date}
                      editMode={editMode}
                      override={getOverride?.(toDateKey(date), code) ?? null}
                      allWorkers={allWorkers}
                      onAssign={onAssign}
                      onClear={onClear}
                      onRestore={onRestore}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeekView;