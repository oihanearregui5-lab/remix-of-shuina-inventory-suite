import { Loader2, LogIn, LogOut, TimerReset } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FichajeStatusCardProps {
  active: boolean;
  loading: boolean;
  currentTime: Date;
  workedTodayLabel: string;
  currentSessionLabel: string;
  lastMovementLabel: string;
  onPrimaryAction: () => void;
}

const FichajeStatusCard = ({ active, loading, currentTime, workedTodayLabel, currentSessionLabel, lastMovementLabel, onPrimaryAction }: FichajeStatusCardProps) => {
  const Icon = loading ? Loader2 : active ? LogOut : LogIn;

  return (
    <section
      className={cn(
        "panel-surface relative overflow-hidden px-4 pb-24 pt-5 sm:px-5",
        active && "border-destructive/20 bg-destructive/5"
      )}
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em]",
                active
                  ? "border-destructive/25 bg-destructive/10 text-destructive"
                  : "border-border bg-background text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                  active ? "bg-destructive text-destructive-foreground" : "bg-muted text-foreground"
                )}
              >
                {active ? "ON" : "OFF"}
              </span>
              {active ? "Trabajando ahora" : "Fuera de jornada"}
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{format(currentTime, "HH:mm:ss")}</p>
              <p className="text-sm text-muted-foreground">{format(currentTime, "EEEE, d 'de' MMMM", { locale: es })}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background px-3 py-2 text-right shadow-[var(--shadow-soft)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Hoy</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{workedTodayLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/80 bg-background px-3 py-3 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sesión actual</p>
            <p className="mt-1 text-base font-semibold text-foreground">{currentSessionLabel}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background px-3 py-3 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Último movimiento</p>
            <p className="mt-1 text-base font-semibold text-foreground">{lastMovementLabel}</p>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4 sm:px-5">
        <Button
          type="button"
          size="xl"
          variant={active ? "destructive" : "default"}
          onClick={onPrimaryAction}
          disabled={loading}
          className={cn(
            "pointer-events-auto h-16 w-full rounded-2xl text-base font-semibold shadow-[var(--shadow-elevated)]",
            !active && "bg-primary text-primary-foreground"
          )}
        >
          <Icon className={cn("h-5 w-5", loading && "animate-spin")} />
          {loading ? "Procesando..." : active ? "Fichar salida" : "Fichar entrada"}
        </Button>
      </div>

      <div className="absolute right-4 top-4 hidden rounded-full border border-border/80 bg-background/80 p-2 text-muted-foreground md:flex">
        <TimerReset className="h-4 w-4" />
      </div>
    </section>
  );
};

export default FichajeStatusCard;