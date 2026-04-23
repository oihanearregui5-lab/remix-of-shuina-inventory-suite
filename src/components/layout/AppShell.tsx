import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Bell, ChevronRight, LogOut, Menu, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AppShellSection<T extends string> {
  key: T;
  label: string;
  description: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  workspace?: "worker" | "admin" | "shared";
  mobilePrimary?: boolean;
}

interface AppShellProps<T extends string> {
  mobileMenuOpen: boolean;
  onMobileMenuOpenChange: (open: boolean) => void;
  currentSection: T;
  onSectionChange: (section: T) => void;
  sections: AppShellSection<T>[];
  canViewAdmin: boolean;
  isAdmin: boolean;
  workspaceMode: "worker" | "admin";
  onWorkspaceModeChange?: (mode: "worker" | "admin") => void;
  profileName?: string | null;
  onSignOut: () => void | Promise<void>;
  children: React.ReactNode;
}

const AppShell = <T extends string>({ mobileMenuOpen, onMobileMenuOpenChange, currentSection, onSectionChange, sections, canViewAdmin, isAdmin, workspaceMode, onWorkspaceModeChange, profileName, onSignOut, children }: AppShellProps<T>) => {
  const visibleSections = useMemo(() => sections.filter((section) => !section.adminOnly || isAdmin), [isAdmin, sections]);
  const activeSection = visibleSections.find((section) => section.key === currentSection) ?? visibleSections[0];
  const mobilePrimarySections = useMemo(() => {
    const pinned = visibleSections.filter((section) => section.mobilePrimary);
    const current = visibleSections.find((section) => section.key === currentSection);
    const unique = [...pinned, current].filter((section, index, array) => section && array.findIndex((item) => item?.key === section.key) === index);
    return unique.slice(0, 4);
  }, [currentSection, visibleSections]);

  const navigation = (
    <>
      <div className="border-b border-sidebar-border/70 px-5 py-5">
          <div className="space-y-3">
            <div className="flex flex-col items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/60">
                <img src="/favicon.svg" alt="Abeja Transtubari" className="h-8 w-8 object-contain" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs uppercase tracking-[0.16em] text-sidebar-foreground/60">Sistema de Fichajes</p>
              <p className="mt-1 text-sm font-semibold text-sidebar-foreground">{workspaceMode === "admin" ? "Modo administración" : "Modo trabajador"}</p>
            </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">Áreas de trabajo</div>
        <div className="space-y-5">
          {[
            { key: "shared", label: workspaceMode === "admin" ? "Base operativa" : "Uso diario" },
            { key: workspaceMode, label: workspaceMode === "admin" ? "Gestión y control" : "Trabajo y seguimiento" },
          ].map((group) => {
            const groupSections = visibleSections.filter((section) => (section.workspace ?? "shared") === group.key || ((section.workspace ?? "shared") === "shared" && group.key === "shared"));
            if (!groupSections.length) return null;

            return (
              <div key={group.key} className="space-y-2">
                <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40">{group.label}</div>
                <nav className="space-y-1.5">
                  {groupSections.map((section) => {
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
            );
          })}
        </div>
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
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/92 backdrop-blur-xl">
            <div className="flex min-h-[68px] items-center justify-between gap-3 px-4 md:min-h-[72px] md:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <Button variant="outline" size="icon" className="md:hidden" onClick={() => onMobileMenuOpenChange(true)} aria-label="Abrir navegación">
                  <Menu className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="hidden md:inline-flex" aria-label="Panel activo">
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
                <div className="min-w-0 space-y-1">
                  <div className="hidden flex-wrap items-center gap-1 text-xs text-muted-foreground md:flex">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-card">
                      <img src="/favicon.svg" alt="Abeja Transtubari" className="h-3.5 w-3.5 object-contain" />
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>{activeSection?.label}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground md:text-lg">{activeSection?.label}</p>
                    <p className="truncate text-xs text-muted-foreground md:hidden">{activeSection?.description}</p>
                    <p className="hidden truncate text-sm text-muted-foreground md:block">{activeSection?.description}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canViewAdmin && onWorkspaceModeChange ? (
                  <div className="hidden items-center gap-1 rounded-full border border-border/70 bg-card p-1 md:flex">
                    <button
                      type="button"
                      onClick={() => onWorkspaceModeChange("worker")}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                        workspaceMode === "worker" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      Trabajador
                    </button>
                    <button
                      type="button"
                      onClick={() => onWorkspaceModeChange("admin")}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                        workspaceMode === "admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      Administración
                    </button>
                  </div>
                ) : null}
                <div className="hidden rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground lg:flex">Operación en tiempo real</div>
                <Button variant="outline" size="icon" aria-label="Notificaciones" className="hidden md:inline-flex">
                  <Bell className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" aria-label="Cerrar sesión" className="md:hidden" onClick={() => void onSignOut()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>
          <main className="app-safe-bottom flex-1 px-4 pt-4 md:px-8 md:py-8">
            <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-4 md:gap-8">
              {canViewAdmin && onWorkspaceModeChange ? (
                <div className="flex items-center gap-2 overflow-x-auto md:hidden">
                  <button
                    type="button"
                    onClick={() => onWorkspaceModeChange("worker")}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      workspaceMode === "worker" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                    )}
                  >
                    👷 Trabajador
                  </button>
                  <button
                    type="button"
                    onClick={() => onWorkspaceModeChange("admin")}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      workspaceMode === "admin" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                    )}
                  >
                    🛠️ Administración
                  </button>
                </div>
              ) : null}
              {children}
            </div>
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur-xl md:hidden">
        <div className={cn("grid gap-2", mobilePrimarySections.length > 3 ? "grid-cols-4" : "grid-cols-3")}>
          {mobilePrimarySections.map((section) => {
            const isActive = section.key === currentSection;
            const Icon = section.icon;

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => onSectionChange(section.key)}
                className={cn(
                  "flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]" : "bg-card text-muted-foreground"
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                <span className="truncate">{section.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppShell;
