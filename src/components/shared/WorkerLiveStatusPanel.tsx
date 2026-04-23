import { Activity, Clock3, PauseCircle, UserRound } from "lucide-react";
import type { WorkerLiveStatusItem } from "@/hooks/useWorkerLiveStatus";

interface WorkerLiveStatusPanelProps {
  items: WorkerLiveStatusItem[];
  loading?: boolean;
  title?: string;
  description?: string;
  compact?: boolean;
}

const badgeClasses: Record<WorkerLiveStatusItem["presence"], string> = {
  working: "bg-primary/10 text-primary",
  paused: "bg-secondary/25 text-secondary-foreground",
  off: "bg-muted text-muted-foreground",
};

const iconByPresence = {
  working: Activity,
  paused: PauseCircle,
  off: Clock3,
};

const WorkerLiveStatusPanel = ({
  items,
  loading = false,
  title = "Estado en tiempo real",
  description = "Quién está trabajando, quién sigue con la jornada abierta y quién está fuera.",
  compact = false,
}: WorkerLiveStatusPanelProps) => {
  return (
    <section className="panel-surface p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <UserRound className="h-4.5 w-4.5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
          </div>
          {!compact ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">{items.length} personas</div>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted/60" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border bg-background px-4 py-6 text-sm text-muted-foreground">
            Todavía no hay trabajadores enlazados para mostrar estado en vivo.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = iconByPresence[item.presence];
              return (
                <article key={item.id} className="rounded-xl border border-border bg-background px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-foreground">{item.name}</p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClasses[item.presence]}`}>
                          {item.statusLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-foreground">{item.detail}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.sinceLabel}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default WorkerLiveStatusPanel;