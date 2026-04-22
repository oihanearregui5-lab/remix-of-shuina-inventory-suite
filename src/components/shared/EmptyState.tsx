import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const EmptyState = ({ icon: Icon, title, description }: EmptyStateProps) => {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 px-5 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-[var(--shadow-soft)]">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mx-auto mt-4 max-w-sm space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

export default EmptyState;
