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
    <header className="space-y-2.5">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="hidden flex-wrap items-center gap-1 text-xs font-medium text-muted-foreground md:flex">
          {breadcrumbs.map((item, index) => (
            <span key={`${item}-${index}`} className="inline-flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              <span>{item}</span>
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>}
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
            <p className="max-w-2xl text-sm leading-5 text-muted-foreground md:text-base">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
};

export default PageHeader;
