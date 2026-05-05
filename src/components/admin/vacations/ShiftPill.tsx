import { useMemo, useState } from "react";
import { Eraser, RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getContrastTextColor, toDateKey } from "./vacation-utils";
import type { DayShifts } from "@/lib/transtubari-parser";
import type { ShiftCode } from "./journeys-constants";
import type { DisplayWorker } from "./useWorkerLookups";
import type { JourneyOverride } from "./useJourneyOverrides";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface Props {
  shifts: DayShifts | null;
  code: ShiftCode;
  compact?: boolean;
  selectedWorkerId: string | null;
  getDisplayWorker: (workerId: string | null | undefined) => DisplayWorker | null;
  onClickWorker: (workerId: string) => void;
  // Edit support
  date?: Date;
  editMode?: boolean; // Si true, la celda es editable (popover). Si false, sólo lectura.
  override?: JourneyOverride | null;
  allWorkers?: DisplayWorker[];
  onAssign?: (date: string, shift: ShiftCode, staffMemberId: string, color?: string | null) => Promise<void>;
  onClear?: (date: string, shift: ShiftCode) => Promise<void>;
  onRestore?: (date: string, shift: ShiftCode) => Promise<void>;
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
  onRestore,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  // Resolución del trabajador efectivo:
  // - Si hay override: gana siempre (incluso con staff_member_id null = vacío explícito).
  // - Si no hay override: cae al Excel.
  const hasOverride = override !== null;
  const effectiveWorkerId = hasOverride ? override?.staff_member_id ?? null : shifts?.[code] ?? null;
  const isFiltered = Boolean(selectedWorkerId && selectedWorkerId !== effectiveWorkerId);

  const worker = effectiveWorkerId ? getDisplayWorker(effectiveWorkerId) : null;
  const spec = shifts?.[`${code}_spec`] as string | undefined;

  const baseSize = compact ? "w-full justify-center px-3 py-2 text-sm" : "px-2 py-1 text-[10px]";

  // Turno compartido: id con "/" (ej: "andriy/silvio")
  const isShared = typeof effectiveWorkerId === "string" && effectiveWorkerId.includes("/");
  const sharedWorkers = isShared
    ? effectiveWorkerId!.split("/").map((s) => {
        const id = s.trim().toLowerCase();
        return { id, w: getDisplayWorker(id) };
      })
    : [];

  const filteredWorkers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allWorkers;
    return allWorkers.filter((w) => w.name.toLowerCase().includes(q));
  }, [allWorkers, query]);

  const renderSharedPill = () => (
    <span
      className={cn("flex max-w-full items-center gap-1.5 rounded-md bg-muted font-bold", baseSize)}
      title={`Turno compartido: ${sharedWorkers.map((s) => s.w?.name ?? s.id).join(" / ")}`}
    >
      <span className="flex -space-x-1">
        {sharedWorkers.map((s, i) => (
          <span
            key={i}
            className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-extrabold ring-1 ring-card"
            style={{ backgroundColor: s.w?.color ?? "hsl(var(--muted))", color: s.w ? getContrastTextColor(s.w.color) : "inherit" }}
          >
            {(s.w?.name ?? s.id).charAt(0).toUpperCase()}
          </span>
        ))}
      </span>
      <span className="truncate text-[10px] font-semibold text-foreground">
        {sharedWorkers.map((s) => (s.w?.name ?? s.id).split(" ")[0]).join("/")}
      </span>
    </span>
  );

  const SHIFT_TITLES: Record<ShiftCode, string> = { M: "Mañana", T: "Tarde", N: "Noche" } as Record<ShiftCode, string>;

  const renderWorkerPill = (w: DisplayWorker, asButton: boolean) => {
    const textColor = getContrastTextColor(w.color);
    const title = `${w.name} · ${SHIFT_TITLES[code] ?? code}${spec ? ` (${spec})` : ""}`;
    const firstName = w.name?.split(" ")[0] ?? w.name;

    if (compact) {
      const Inner = (
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold leading-none"
          style={{ backgroundColor: w.color, color: textColor }}
          title={title}
        >
          {code}
        </span>
      );
      return asButton ? (
        <button type="button" onClick={() => onClickWorker(w.id)} className="inline-flex items-center justify-center">
          {Inner}
        </button>
      ) : (
        Inner
      );
    }

    const content = (
      <span
        className={cn("inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium")}
        style={{ backgroundColor: `${w.color}26` }}
        title={title}
      >
        <span
          className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-extrabold leading-none"
          style={{ backgroundColor: w.color, color: textColor }}
        >
          {code}
        </span>
        <span className="truncate text-[11px] font-semibold text-foreground">{firstName}</span>
        {spec ? (
          <span className="rounded-sm bg-foreground/10 px-1 py-0.5 text-[9px] font-extrabold uppercase text-foreground">
            {spec}
          </span>
        ) : null}
      </span>
    );

    return asButton ? (
      <button type="button" onClick={() => onClickWorker(w.id)} className="flex max-w-full items-center">
        {content}
      </button>
    ) : (
      content
    );
  };

  const renderPill = () => {
    if (isShared) return renderSharedPill();
    if (!worker || isFiltered) {
      return <span className={cn("italic text-muted-foreground", compact ? "text-xs" : "text-[10px]")}>—</span>;
    }
    return renderWorkerPill(worker, false);
  };

  // Modo solo-lectura: clic abre la ficha del trabajador.
  if (!editMode || !date || !onAssign) {
    if (isShared) return renderSharedPill();
    if (!worker || isFiltered) {
      return <span className={cn("italic text-muted-foreground", compact ? "text-xs" : "text-[10px]")}>—</span>;
    }
    return renderWorkerPill(worker, true);
  }

  const dateKey = toDateKey(date);

  const handleAssign = async (workerId: string, color?: string | null) => {
    setBusy(true);
    setOpen(false); // Cierra al instante: la celda ya cambió por el optimistic update.
    try {
      await onAssign(dateKey, code, workerId, color);
    } finally {
      setBusy(false);
      setQuery("");
    }
  };

  const handleClear = async () => {
    if (!onClear) return;
    setBusy(true);
    setOpen(false);
    try {
      await onClear(dateKey, code);
    } finally {
      setBusy(false);
      setQuery("");
    }
  };

  const handleRestore = async () => {
    if (!onRestore) return;
    setBusy(true);
    setOpen(false);
    try {
      await onRestore(dateKey, code);
    } finally {
      setBusy(false);
      setQuery("");
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={busy}
          className={cn(
            "w-full rounded-md border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5",
            "transition-colors",
          )}
        >
          {renderPill()}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="mb-2 flex items-center gap-1.5 rounded-md border border-border bg-background px-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar trabajador…"
            autoFocus
            className="h-8 border-0 px-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleClear()}
          className="mb-1 flex w-full items-center gap-2 rounded-md border border-dashed border-border px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Eraser className="h-3.5 w-3.5" /> Dejar en blanco
        </button>
        <div className="max-h-56 space-y-0.5 overflow-y-auto">
          {filteredWorkers.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">Sin coincidencias.</p>
          ) : (
            filteredWorkers.map((w) => (
              <button
                key={w.id}
                type="button"
                disabled={busy}
                onClick={() => w.assignmentId && void handleAssign(w.assignmentId, w.color)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                  effectiveWorkerId === w.assignmentId && "bg-muted/60",
                )}
              >
                <span
                  className="h-4 w-4 flex-shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: w.color }}
                />
                <span className="flex-1 truncate">{w.name}</span>
              </button>
            ))
          )}
        </div>
        {hasOverride && onRestore ? (
          <div className="mt-2 border-t border-border pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRestore()}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restaurar valor del Excel
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

export default ShiftPill;
