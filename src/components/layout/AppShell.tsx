import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Bell, ChevronRight, LogOut, Menu, PanelLeftClose, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AppShellSection<T extends string> {
  key: T;
  label: string;
  description: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface AppShellProps<T extends string> {
  mobileMenuOpen: boolean;
  onMobileMenuOpenChange: (open: boolean) => void;
  currentSection: T;
  onSectionChange: (section: T) => void;
  sections: AppShellSection<T>[];
  canViewAdmin: boolean;
  profileName?: string | null;
  onSignOut: () => void | Promise<void>;
  children: React.ReactNode;
}

const AppShell = <T extends string>({ mobileMenuOpen, onMobileMenuOpenChange, currentSection, onSectionChange, sections, canViewAdmin, profileName, onSignOut, children }: AppShellProps<T>) => {
  const visibleSections = useMemo(() => sections.filter((section) => !section.adminOnly || canViewAdmin), [canViewAdmin, sections]);
  const activeSection = visibleSections.find((section) => section.key === currentSection) ?? visibleSections[0];

  const navigation = (
    <>
      <div className="border-b border-sidebar-border/70 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sidebar-primary/90 shadow-[var(--shadow-soft)]">
            <Truck className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-[0.12em] text-sidebar-foreground">TRANSTUBARI</p>
            <p className="truncate text-xs text-sidebar-foreground/60">Sistema de Fichajes</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">Áreas de trabajo</div>
        <nav className="space-y-1.5">
          {visibleSections.map((section) => {
            const isActive = section.key === currentSection;
            const Icon = section.icon;

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => onSectionChange(section.key)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  isActive ? "bg-sidebar-primary/18 text-sidebar-foreground shadow-[var(--shadow-soft)] ring-1 ring-sidebar-primary/20" : "text-sidebar-foreground/72 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground"
                )}
              >
                <span className={cn("mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-transparent transition-colors", isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-sidebar-accent/80 text-sidebar-foreground/85")}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{section.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-sidebar-foreground/55">{section.description}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-border/70 px-4 py-4">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-sidebar-accent/55 px-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{profileName ?? "Usuario"}</p>
            <p className="truncate text-xs text-sidebar-foreground/55">Acceso operativo activo</p>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-sidebar-foreground/70 hover:bg-sidebar-primary/15 hover:text-sidebar-foreground" onClick={() => void onSignOut()} title="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen w-full bg-background">
      {mobileMenuOpen && <button type="button" aria-label="Cerrar navegación" className="fixed inset-0 z-40 bg-foreground/15 backdrop-blur-sm md:hidden" onClick={() => onMobileMenuOpenChange(false)} />}
      <div className="flex min-h-screen w-full">
        <aside className="hidden md:flex md:w-[320px] md:flex-col md:border-r md:border-sidebar-border/60 md:bg-sidebar">{navigation}</aside>
        <div className={cn("fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-[340px] -translate-x-full flex-col border-r border-sidebar-border/60 bg-sidebar transition-transform duration-300 md:hidden", mobileMenuOpen && "translate-x-0")}>{navigation}</div>
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/88 backdrop-blur-xl">
            <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 md:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <Button variant="outline" size="icon" className="md:hidden" onClick={() => onMobileMenuOpenChange(true)} aria-label="Abrir navegación">
                  <Menu className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="hidden md:inline-flex" aria-label="Panel activo">
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    <span>Transtubari</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>{activeSection?.label}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground md:text-lg">{activeSection?.label}</p>
                    <p className="hidden truncate text-sm text-muted-foreground md:block">{activeSection?.description}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex">Operación en tiempo real</div>
                <Button variant="outline" size="icon" aria-label="Notificaciones">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppShell;
