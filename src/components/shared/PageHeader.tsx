import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
  eyebrow?: string;
  breadcrumbs?: string[];
  actions?: ReactNode;
}

const PageHeader = ({ title, description, eyebrow, breadcrumbs, actions }: PageHeaderProps) => {
  return (
    <header className="space-y-3">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs font-medium text-muted-foreground">
          {breadcrumbs.map((item, index) => (
            <span key={`${item}-${index}`} className="inline-flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              <span>{item}</span>
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
      </div>
    </header>
  );
};

export default PageHeader;
