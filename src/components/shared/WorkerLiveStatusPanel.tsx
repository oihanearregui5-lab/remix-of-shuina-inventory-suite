import { useEffect, useMemo, useState } from "react";
import { Activity, ChevronDown, ChevronUp, Clock3, PauseCircle, UserRound } from "lucide-react";
import type { WorkerLiveStatusItem } from "@/hooks/useWorkerLiveStatus";
import { cn } from "@/lib/utils";

interface WorkerLiveStatusPanelProps {
  items: WorkerLiveStatusItem[];
  loading?: boolean;
  title?: string;
  description?: string;
  compact?: boolean;
  onSelectWorker?: (staffId: string) => void;
}

const iconByPresence = {
  working: Activity,
  paused: PauseCircle,
  off: Clock3,
};

const WorkerLiveStatusPanel = ({
  items,
  loading = false,
  title = "Trabajadores en tiempo real",
  description = "Verde = activo (jornada abierta). Gris = fuera de jornada.",
  compact = false,
  onSelectWorker,
}: WorkerLiveStatusPanelProps) => {
  // En móvil usamos clic simple (no hay doble clic táctil); en desktop doble clic
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: none)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const handleInteract = (id: string) => onSelectWorker?.(id);

  // Colapsable: por defecto colapsado si todos están fuera. Se persiste la decisión del usuario.
  const allOff = useMemo(() => items.length > 0 && items.every((i) => i.presence === "off"), [items]);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("transtubari-team-status-collapsed");
    if (stored === "1") return true;
    if (stored === "0") return false;
    return false; // sin preferencia: empieza expandido en primer render, useEffect ajusta
  });
  useEffect(() => {
    // Si nunca eligió, sincroniza con allOff (colapsa cuando no hay nadie activo)
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("transtubari-team-status-collapsed") : null;
    if (stored === null && allOff) setCollapsed(true);
  }, [allOff]);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") window.localStorage.setItem("transtubari-team-status-collapsed", next ? "1" : "0");
      return next;
    });
  };

  const activeCount = items.filter((i) => i.presence === "working").length;

  return (
    <section className="panel-surface p-4 md:p-5">
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {activeCount > 0 && (
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive animate-pulse">
                {activeCount} activo{activeCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {!compact && !collapsed ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">{items.length} personas</span>
          {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {collapsed ? null : (
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted/60" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border bg-background px-4 py-6 text-sm text-muted-foreground">
            No hay trabajadores activos en el directorio.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const Icon = iconByPresence[item.presence];
              const isWorking = item.presence === "working";
              const isClickable = Boolean(onSelectWorker);

              const commonClasses = cn(
                "block w-full rounded-xl border bg-background px-4 py-3 text-left transition-colors",
                isWorking ? "border-destructive/30 bg-destructive/5" : "border-border",
                isClickable && "hover:border-primary/40 hover:bg-muted/40 cursor-pointer",
              );

              const content = (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      {/* Punto rojo parpadeante para ACTIVO */}
                      {isWorking && (
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                        </span>
                      )}
                      <p className="truncate text-base font-semibold text-foreground">{item.name}</p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider",
                          isWorking
                            ? "bg-destructive text-destructive-foreground"
                            : item.presence === "paused"
                            ? "bg-warning/20 text-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.statusLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{item.detail}</p>
                    {item.sinceLabel ? <p className="mt-0.5 text-xs text-muted-foreground">{item.sinceLabel}</p> : null}
                  </div>
                  <div className="rounded-lg bg-muted p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              );

              if (!isClickable) {
                return <article key={item.id} className={commonClasses}>{content}</article>;
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={isTouch ? () => handleInteract(item.id) : undefined}
                  onDoubleClick={!isTouch ? () => handleInteract(item.id) : undefined}
                  title={isTouch ? "Pulsa para ver ficha completa" : "Doble clic para ver ficha completa"}
                  className={commonClasses}
                >
                  {content}
                </button>
              );
            })}
          </div>
        )}
      </div>
      )}
    </section>
  );
};

export default WorkerLiveStatusPanel;
