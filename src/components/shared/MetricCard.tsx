import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "secondary" | "success" | "warning" | "info" | "danger";
  active?: boolean;
  onClick?: () => void;
}

const toneClassMap = {
  primary: "text-primary bg-primary/10 ring-primary/15",
  secondary: "text-secondary-foreground bg-secondary/30 ring-secondary/25",
  success: "text-success bg-success/12 ring-success/15",
  warning: "text-foreground bg-warning/15 ring-warning/20",
  info: "text-info bg-info/12 ring-info/20",
  danger: "text-destructive bg-destructive/10 ring-destructive/15",
};

const MetricCard = ({ title, value, hint, icon: Icon, tone = "primary", active = false, onClick }: MetricCardProps) => {
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group overflow-hidden rounded-xl border border-border/80 bg-card px-4 py-3.5 text-left shadow-[var(--shadow-soft)] transition-all duration-200 md:px-5",
        onClick && "hover:border-border hover:bg-muted/25 hover:shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active && "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
            <div className="space-y-0.5">
              <p className="text-lg font-bold tracking-tight text-foreground md:text-2xl">{value}</p>
              {hint ? <p className="text-xs leading-4 text-muted-foreground">{hint}</p> : null}
          </div>
        </div>
         <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 md:h-10 md:w-10", toneClassMap[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </Comp>
  );
};

export default MetricCard;
