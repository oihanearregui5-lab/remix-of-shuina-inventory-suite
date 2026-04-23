import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { TranstubariData } from "@/lib/transtubari-parser";
import { SHIFT_CODES, WEEKDAYS_SHORT, getShiftsFor } from "../journeys-constants";
import { getMonthMatrix, toDateKey } from "../vacation-utils";

interface Props {
  data: TranstubariData;
  year: number;
  holidaysByDate: Map<string, { label: string; color: string | null }>;
  selectedWorkerId: string | null;
  onSelectMonth: (monthDate: Date) => void;
}

const YearView = ({ data, year, holidaysByDate, selectedWorkerId, onSelectMonth }: Props) => {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, monthIndex) => {
        const monthDate = new Date(year, monthIndex, 1);
        return (
          <button
            key={monthIndex}
            type="button"
            onClick={() => onSelectMonth(monthDate)}
            className="rounded-xl border border-border bg-muted/30 p-3 text-left"
          >
            <p className="mb-3 text-center text-sm font-bold capitalize text-foreground">{format(monthDate, "MMMM", { locale: es })}</p>
            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-semibold text-muted-foreground">
              {WEEKDAYS_SHORT.map((day) => (
                <span key={`${monthIndex}-${day}`}>{day}</span>
              ))}
            </div>
            <div className="mt-2 space-y-1">
              {getMonthMatrix(monthDate).map((week, index) => (
                <div key={index} className="grid grid-cols-7 gap-1">
                  {week.map((date) => {
                    const key = toDateKey(date);
                    const holiday = holidaysByDate.get(key);
                    const isCurrentMonth = date.getMonth() === monthIndex;
                    const shifts = getShiftsFor(data, date);
                    const hasShift = SHIFT_CODES.some(
                      (code) => Boolean(shifts?.[code]) && (!selectedWorkerId || shifts?.[code] === selectedWorkerId),
                    );

                    return (
                      <div
                        key={key}
                        className={cn(
                          "flex aspect-square items-center justify-center rounded text-[10px] font-semibold",
                          !isCurrentMonth && "text-transparent",
                          holiday && "bg-destructive text-destructive-foreground",
                          !holiday && hasShift && "bg-primary/10 text-foreground",
                          !holiday && !hasShift && (date.getDay() === 0 || date.getDay() === 6) && "text-muted-foreground",
                        )}
                      >
                        {date.getDate()}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default YearView;