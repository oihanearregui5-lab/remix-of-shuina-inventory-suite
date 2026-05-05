import { ClipboardList } from "lucide-react";
import { isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { TranstubariData } from "@/lib/transtubari-parser";
import { SHIFT_CODES, WEEKDAYS_SHORT, getShiftsFor } from "../journeys-constants";
import { toDateKey } from "../vacation-utils";
import ShiftPill from "../ShiftPill";
import type { DisplayWorker } from "../useWorkerLookups";
import type { JourneyOverride } from "../useJourneyOverrides";
import type { ShiftCode } from "../journeys-constants";

interface Props {
  data: TranstubariData;
  monthGrid: Date[][];
  currentMonth: Date;
  holidaysByDate: Map<string, { label: string; color: string | null }>;
  selectedWorkerId: string | null;
  summaryLabel: string;
  getDisplayWorker: (workerId: string | null | undefined) => DisplayWorker | null;
  onClickWorker: (workerId: string) => void;
  editMode?: boolean;
  allWorkers?: DisplayWorker[];
  getOverride?: (date: string, shift: ShiftCode) => JourneyOverride | null;
  onAssign?: (date: string, shift: ShiftCode, staffMemberId: string, color?: string | null) => Promise<void>;
  onClear?: (date: string, shift: ShiftCode) => Promise<void>;
  onRestore?: (date: string, shift: ShiftCode) => Promise<void>;
}

const MonthView = ({ data, monthGrid, currentMonth, holidaysByDate, selectedWorkerId, summaryLabel, getDisplayWorker, onClickWorker, editMode, allWorkers, getOverride, onAssign, onClear, onRestore }: Props) => {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-2 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
        <h4 className="flex items-center gap-2 text-sm md:text-base font-bold text-foreground">
          <ClipboardList className="h-4 w-4 text-primary" /> Planificación mensual
        </h4>
        <p className="text-[11px] md:text-xs text-muted-foreground">{summaryLabel}</p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {WEEKDAYS_SHORT.map((day) => (
          <div key={day} className="py-1">{day}</div>
        ))}
      </div>
      {monthGrid.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-1">
          {week.map((date) => {
            const key = toDateKey(date);
            const holiday = holidaysByDate.get(key);
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isCurrentDay = isSameDay(date, new Date());
            const shifts = getShiftsFor(data, date);

            return (
              <div
                key={key}
                className={cn(
                  "grid min-h-[80px] grid-rows-[24px_1fr] overflow-hidden rounded-md md:rounded-lg border bg-card md:min-h-[118px]",
                  !isCurrentMonth && "opacity-35",
                  isWeekend && "bg-muted/30",
                  holiday ? "border-destructive" : "border-border",
                  isCurrentDay && "ring-2 ring-secondary",
                )}
              >
                <div className={cn("flex items-center justify-between px-1.5 md:px-2 text-[10px] md:text-[11px] font-bold", holiday ? "bg-destructive text-destructive-foreground" : isCurrentDay ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground")}>
                  <span>{date.getDate()}</span>
                  <span className="hidden truncate text-[10px] md:inline">{holiday?.label ?? ""}</span>
                </div>
                {(!shifts || (!shifts.M && !shifts.T && !shifts.N)) && holiday ? (
                  <div className="flex h-full items-center justify-center px-1 text-center text-[9px] md:text-[10px] font-medium uppercase tracking-wider italic text-muted-foreground">
                    {holiday.label}
                  </div>
                ) : (
                  <div className="grid grid-rows-3">
                    {SHIFT_CODES.map((code) => (
                      <div key={`${key}-${code}`} className="grid grid-cols-[14px_1fr] md:grid-cols-[18px_1fr] items-center gap-1 md:gap-2 border-t border-dashed border-border px-1 md:px-2 py-0.5 md:py-1 first:border-t-0">
                        <span className="text-[8px] md:text-[9px] font-bold text-muted-foreground">{code}</span>
                        <ShiftPill
                          shifts={shifts}
                          code={code}
                          selectedWorkerId={selectedWorkerId}
                          getDisplayWorker={getDisplayWorker}
                          onClickWorker={onClickWorker}
                          date={date}
                          editMode={editMode}
                          override={getOverride?.(key, code) ?? null}
                          allWorkers={allWorkers}
                          onAssign={onAssign}
                          onClear={onClear}
                          onRestore={onRestore}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default MonthView;