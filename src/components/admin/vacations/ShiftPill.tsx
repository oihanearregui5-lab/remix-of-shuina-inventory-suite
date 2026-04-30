import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getContrastTextColor, toDateKey } from "./vacation-utils";
import type { DayShifts } from "@/lib/transtubari-parser";
import type { ShiftCode } from "./journeys-constants";
import type { DisplayWorker } from "./useWorkerLookups";
import type { JourneyOverride } from "./useJourneyOverrides";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface Props {
  shifts: DayShifts | null;
  code: ShiftCode;
  compact?: boolean;
  selectedWorkerId: string | null;
  getDisplayWorker: (workerId: string | null | undefined) => DisplayWorker | null;
  onClickWorker: (workerId: string) => void;
  // Edit mode
  date?: Date;
  editMode?: boolean;
  override?: JourneyOverride | null;
  allWorkers?: DisplayWorker[];
  onAssign?: (date: string, shift: ShiftCode, staffMemberId: string, color?: string | null) => Promise<void>;
  onClear?: (date: string, shift: ShiftCode) => Promise<void>;
}

const ShiftPill = ({
  shifts,
  code,
  compact = false,
  selectedWorkerId,
  getDisplayWorker,
  onClickWorker,
  date,
  editMode = false,
  override = null,
  allWorkers = [],
  onAssign,
  onClear,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Override has priority over Excel
  const effectiveWorkerId = override?.staff_member_id ?? shifts?.[code] ?? null;
  const isFiltered = Boolean(selectedWorkerId && selectedWorkerId !== effectiveWorkerId);

  const worker = effectiveWorkerId ? getDisplayWorker(effectiveWorkerId) : null;
  const spec = shifts?.[`${code}_spec`] as string | undefined;

  const baseSize = compact ? "w-full justify-center px-3 py-2 text-sm" : "px-2 py-1 text-[10px]";

  const renderContent = () => {
    if (!worker || isFiltered) {
      return (
        <span className={cn("italic text-muted-foreground", compact ? "text-xs" : "text-[10px]")}>—</span>
      );
    }
    return (
      <span
        className={cn("flex max-w-full items-center gap-2 rounded-md font-bold", baseSize)}
        style={{ backgroundColor: worker.color, color: getContrastTextColor(worker.color) }}
      >
        <span className="truncate">{worker.name}</span>
        {spec ? (
          <span className="rounded-sm bg-background/25 px-1.5 py-0.5 text-[9px] font-extrabold uppercase">
            {spec}
          </span>
        ) : null}
      </span>
    );
  };

  if (!editMode || !date || !onAssign) {
    if (!worker || isFiltered) {
      return <span className={cn("italic text-muted-foreground", compact ? "text-xs" : "text-[10px]")}>—</span>;
    }
    return (
      <button
        type="button"
        onClick={() => onClickWorker(worker.id)}
        className={cn("flex max-w-full items-center gap-2 rounded-md font-bold", baseSize)}
        style={{ backgroundColor: worker.color, color: getContrastTextColor(worker.color) }}
      >
        <span className="truncate">{worker.name}</span>
        {spec ? (
          <span className="rounded-sm bg-background/25 px-1.5 py-0.5 text-[9px] font-extrabold uppercase">
            {spec}
          </span>
        ) : null}
      </button>
    );
  }

  const dateKey = toDateKey(date);

  const handleAssign = async (workerId: string, color?: string | null) => {
    setBusy(true);
    try {
      await onAssign(dateKey, code, workerId, color);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (!onClear) return;
    setBusy(true);
    try {
      await onClear(dateKey, code);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full rounded-md border-2 border-dashed border-primary/60 hover:border-primary",
            "transition-colors",
          )}
        >
          {renderContent()}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Asignar trabajador
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {allWorkers.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No hay trabajadores disponibles.</p>
          ) : (
            allWorkers.map((w) => (
              <button
                key={w.id}
                type="button"
                disabled={busy}
                onClick={() => w.assignmentId && void handleAssign(w.assignmentId, w.color)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span
                  className="h-5 w-5 flex-shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: w.color }}
                />
                <span className="flex-1 truncate">{w.name}</span>
              </button>
            ))
          )}
        </div>
        {(override || effectiveWorkerId) && onClear ? (
          <div className="mt-2 border-t border-border pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => void handleClear()}
            >
              <Trash2 className="h-4 w-4" /> Vaciar este turno
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

export default ShiftPill;
