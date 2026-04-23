import { Clock3, MinusCircle, PlusCircle, Scale } from "lucide-react";
import type { HoursBalanceSummary } from "@/lib/time-balance";
import { formatMinutes } from "@/lib/time-balance";

interface HoursBalancePanelProps {
  summary: HoursBalanceSummary;
  title?: string;
  description?: string;
  compact?: boolean;
}

const HoursBalancePanel = ({
  summary,
  title = "Balance de horas",
  description = "Cálculo automático con objetivo de 8h por día laborable.",
  compact = false,
}: HoursBalancePanelProps) => {
  return (
    <section className="panel-surface p-4 md:p-5">
      <div className="flex items-start gap-2">
        <Scale className="mt-0.5 h-4.5 w-4.5 text-primary" />
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {!compact ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <Clock3 className="h-4 w-4" /> Trabajadas
          </div>
          <p className="mt-2 text-lg font-semibold text-foreground">{formatMinutes(summary.workedMinutes)}</p>
        </div>
        <div className="rounded-xl border border-border bg-background px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Objetivo</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{formatMinutes(summary.expectedMinutes)}</p>
        </div>
        <div className="rounded-xl border border-border bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <PlusCircle className="h-4 w-4" /> Extra
          </div>
          <p className="mt-2 text-lg font-semibold text-foreground">{formatMinutes(summary.overtimeMinutes)}</p>
        </div>
        <div className="rounded-xl border border-border bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <MinusCircle className="h-4 w-4" /> Faltantes
          </div>
          <p className="mt-2 text-lg font-semibold text-foreground">{formatMinutes(summary.missingMinutes)}</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-muted/45 px-4 py-3 text-sm text-muted-foreground">
        Balance actual: <span className="font-semibold text-foreground">{formatMinutes(summary.balanceMinutes)}</span> · {summary.workedDays} días con registro
      </div>
    </section>
  );
};

export default HoursBalancePanel;