import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Eye, LogOut, Menu, PanelLeftClose, RefreshCcw, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUIMode } from "@/hooks/useUIMode";
import NotificationsBell from "@/components/shared/NotificationsBell";
import GlobalSearchDialog from "@/components/shared/GlobalSearchDialog";

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
  /** Prefetch opcional del chunk de la sección al hover/focus. */
  onSectionPrefetch?: (section: T) => void;
  sections: AppShellSection<T>[];
  canViewAdmin: boolean;
  isAdmin: boolean;
  workspaceMode: "worker" | "admin";
  profileName?: string | null;
  onSignOut: () => void | Promise<void>;
  onChangeWorkspace?: () => void;
  onNotificationNavigate?: (link: string) => void;
  children: React.ReactNode;
}

const AppShell = <T extends string>({
  mobileMenuOpen,
  onMobileMenuOpenChange,
  currentSection,
  onSectionChange,
  onSectionPrefetch,
  sections,
  isAdmin: _isAdmin,
  workspaceMode,
  profileName,
  onSignOut,
  onChangeWorkspace,
  onNotificationNavigate,
  children,
}: AppShellProps<T>) => {
  const visibleSections = useMemo(() => sections, [sections]);
  const activeSection = visibleSections.find((section) => section.key === currentSection) ?? visibleSections[0];
  const mobilePrimarySections = useMemo(() => {
    const preferred = visibleSections.filter((section) => section.mobilePrimary).slice(0, 5);
    const current = visibleSections.find((section) => section.key === currentSection);
    const unique = [...preferred, current].filter((section, index, array) => section && array.findIndex((item) => item?.key === section.key) === index);
    return unique.slice(0, 5);
  }, [currentSection, visibleSections]);
  const { isSimple, toggleMode } = useUIMode();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSearchNavigate = (section: string) => {
    onSectionChange(section as T);
  };

  const navigation = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-none border-b border-sidebar-border/70 px-5 py-5">
        <div className="flex flex-col items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/60">
            <img src="/favicon.svg" alt="Abeja Transtubari" className="h-8 w-8 object-contain" />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/70">Navegación</div>
        <nav className="space-y-1.5" aria-label="Secciones">
          {visibleSections.map((section) => {
            const isActive = section.key === currentSection;
            const Icon = section.icon;

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => onSectionChange(section.key)}
                onMouseEnter={() => onSectionPrefetch?.(section.key)}
                onFocus={() => onSectionPrefetch?.(section.key)}
                onTouchStart={() => onSectionPrefetch?.(section.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  isActive
                    ? "bg-sidebar-primary/18 text-sidebar-foreground shadow-[var(--shadow-soft)] ring-1 ring-sidebar-primary/20"
                    : "text-sidebar-foreground/90 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-transparent transition-colors",
                    isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-sidebar-accent/80 text-sidebar-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{section.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-sidebar-foreground/75">{section.description}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-none space-y-2 border-t border-sidebar-border/70 px-4 py-4">
        {/* Switch modo simple/completo */}
        <button
          type="button"
          onClick={toggleMode}
          aria-pressed={isSimple}
          className="flex w-full items-center justify-between gap-3 rounded-lg bg-sidebar-accent/55 px-3 py-2.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent/75"
          title={isSimple ? "Cambiar a vista completa" : "Cambiar a vista sencilla"}
        >
          <span className="flex items-center gap-2 text-xs font-semibold">
            {isSimple ? <Eye className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {isSimple ? "Vista sencilla" : "Vista completa"}
          </span>
          <span className="rounded-full bg-sidebar-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground">
            {isSimple ? "ON" : "OFF"}
          </span>
        </button>

        {/* Cambiar espacio se gestiona desde el header */}

        {/* Usuario + cerrar sesión */}
        <div className="flex items-center justify-between gap-3 rounded-lg bg-sidebar-accent/55 px-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{profileName ?? "Usuario"}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">
              {workspaceMode === "admin" ? "Administración" : "Trabajador"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-sidebar-foreground/85 hover:bg-sidebar-primary/15 hover:text-sidebar-foreground"
            onClick={() => void onSignOut()}
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-background">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-40 bg-foreground/15 backdrop-blur-sm md:hidden"
          onClick={() => onMobileMenuOpenChange(false)}
        />
      )}
      <div className="flex min-h-screen w-full">
        <aside
          className="hidden md:flex md:h-screen md:w-[320px] md:flex-col md:border-r md:border-sidebar-border/60 md:bg-sidebar md:sticky md:top-0"
          aria-label="Navegación principal"
        >
          {navigation}
        </aside>
        <div
          id="mobile-navigation"
          role="dialog"
          aria-modal={mobileMenuOpen}
          aria-label="Navegación móvil"
          aria-hidden={!mobileMenuOpen}
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-screen w-[88vw] max-w-[340px] -translate-x-full flex-col border-r border-sidebar-border/60 bg-sidebar transition-transform duration-300 md:hidden",
            mobileMenuOpen && "translate-x-0",
          )}
        >
          {navigation}
        </div>
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/92 backdrop-blur-xl">
            <div className="flex min-h-[68px] items-center justify-between gap-3 px-4 md:min-h-[72px] md:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  onClick={() => onMobileMenuOpenChange(true)}
                  aria-label="Abrir navegación"
                  aria-controls="mobile-navigation"
                  aria-expanded={mobileMenuOpen}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="hidden md:inline-flex" aria-label="Panel activo" aria-hidden="true" tabIndex={-1}>
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
                {onChangeWorkspace ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onChangeWorkspace}
                    className="hidden md:inline-flex h-9 items-center gap-2 px-3 text-xs font-semibold"
                    title={`Estás en ${workspaceMode === "admin" ? "Administración" : "Trabajador"} — pulsa para cambiar`}
                    aria-label="Cambiar espacio de trabajo"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    <span>{workspaceMode === "admin" ? "Admin" : "Trabajador"}</span>
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchOpen(true)}
                  className="hidden h-9 items-center gap-2 px-3 text-xs text-muted-foreground md:inline-flex"
                  aria-label="Buscar (Ctrl+K)"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Buscar…</span>
                  <kbd className="ml-2 hidden rounded border border-border/70 bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground lg:inline">⌘K</kbd>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  aria-label="Buscar"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
                <NotificationsBell onNavigate={onNotificationNavigate} />
                <Button variant="outline" size="icon" aria-label="Cerrar sesión" className="md:hidden" onClick={() => void onSignOut()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>
          <main
            id="main-content"
            tabIndex={-1}
            role="main"
            aria-label={activeSection?.label ?? "Contenido principal"}
            className="app-safe-bottom flex-1 px-4 pt-4 md:px-8 md:py-8 focus:outline-none"
          >
            <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-4 md:gap-8">{children}</div>
          </main>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur-xl md:hidden"
        aria-label="Navegación rápida móvil"
      >
        <div
          className={cn(
            "grid gap-2",
            mobilePrimarySections.length >= 5
              ? "grid-cols-5"
              : mobilePrimarySections.length === 4
              ? "grid-cols-4"
              : "grid-cols-3",
          )}
        >
          {mobilePrimarySections.map((section) => {
            const isActive = section.key === currentSection;
            const Icon = section.icon;

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => onSectionChange(section.key)}
                onTouchStart={() => onSectionPrefetch?.(section.key)}
                onFocus={() => onSectionPrefetch?.(section.key)}
                aria-current={isActive ? "page" : undefined}
                aria-label={section.label}
                className={cn(
                  "flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]" : "bg-card text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="truncate">{section.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} onNavigate={handleSearchNavigate} />
    </div>
  );
};

export default AppShell;
