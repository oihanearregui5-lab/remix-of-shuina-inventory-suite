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
        "group relative overflow-hidden rounded-lg border border-border/80 bg-card px-5 py-4 text-left shadow-[var(--shadow-soft)] transition-all duration-200",
        "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/20 before:to-transparent",
        onClick && "hover:-translate-y-0.5 hover:border-border hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active && "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="space-y-1">
            <p className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{value}</p>
            {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
          </div>
        </div>
        <div className={cn("inline-flex h-11 w-11 items-center justify-center rounded-lg ring-1", toneClassMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
};

export default MetricCard;
