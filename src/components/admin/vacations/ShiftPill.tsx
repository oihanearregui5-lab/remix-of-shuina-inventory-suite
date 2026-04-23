import { cn } from "@/lib/utils";
import { getContrastTextColor } from "./vacation-utils";
import type { DayShifts } from "@/lib/transtubari-parser";
import type { ShiftCode } from "./journeys-constants";
import type { DisplayWorker } from "./useWorkerLookups";

interface Props {
  shifts: DayShifts | null;
  code: ShiftCode;
  compact?: boolean;
  selectedWorkerId: string | null;
  getDisplayWorker: (workerId: string | null | undefined) => DisplayWorker | null;
  onClickWorker: (workerId: string) => void;
}

const ShiftPill = ({ shifts, code, compact = false, selectedWorkerId, getDisplayWorker, onClickWorker }: Props) => {
  const workerId = shifts?.[code] ?? null;

  if (!workerId || (selectedWorkerId && selectedWorkerId !== workerId)) {
    return <span className={cn("italic text-muted-foreground", compact ? "text-xs" : "text-[10px]")}>—</span>;
  }

  const worker = getDisplayWorker(workerId);
  if (!worker) return <span className="text-xs text-muted-foreground">—</span>;

  const spec = shifts?.[`${code}_spec`] as string | undefined;

  return (
    <button
      type="button"
      onClick={() => onClickWorker(worker.id)}
      className={cn(
        "flex max-w-full items-center gap-2 rounded-md font-bold",
        compact ? "w-full justify-center px-3 py-2 text-sm" : "px-2 py-1 text-[10px]",
      )}
      style={{ backgroundColor: worker.color, color: getContrastTextColor(worker.color) }}
    >
      <span className="truncate">{worker.name}</span>
      {spec ? <span className="rounded-sm bg-background/25 px-1.5 py-0.5 text-[9px] font-extrabold uppercase">{spec}</span> : null}
    </button>
  );
};

export default ShiftPill;