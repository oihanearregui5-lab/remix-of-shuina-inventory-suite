import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, LogOut, Menu, RefreshCcw, Search, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationsBell from "@/components/shared/NotificationsBell";
import GlobalSearchDialog from "@/components/shared/GlobalSearchDialog";
import MyAccountDialog from "@/components/layout/MyAccountDialog";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { useNotificationSound } from "@/hooks/useNotificationSound";

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

const COLLAPSED_KEY = "transtubari-sidebar-collapsed";

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
    const unique = [...preferred, current].filter(
      (section, index, array) => section && array.findIndex((item) => item?.key === section.key) === index,
    );
    return unique.slice(0, 5);
  }, [currentSection, visibleSections]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      }
      return next;
    });
  };

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

  const openAccountSettings = () => {
    onSectionChange("account" as T);
  };

  const navigation = (isCollapsedDesktop: boolean, showCollapseToggle: boolean) => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "flex-none border-b border-sidebar-border/70 py-5",
          isCollapsedDesktop ? "px-3" : "px-5",
        )}
      >
        <div className={cn("flex items-center", isCollapsedDesktop ? "justify-center" : "justify-between")}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/60">
            <img src="/favicon.svg" alt="Abeja Transtubari" className="h-8 w-8 object-contain" />
          </div>
          {showCollapseToggle && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={isCollapsedDesktop ? "Expandir menú" : "Plegar menú"}
              title={isCollapsedDesktop ? "Expandir menú" : "Plegar menú"}
              className={cn(
                "hidden md:inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                isCollapsedDesktop && "mt-2",
              )}
            >
              {isCollapsedDesktop ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto py-4", isCollapsedDesktop ? "px-2" : "px-3")}>
        {!isCollapsedDesktop && (
          <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/70">
            Navegación
          </div>
        )}
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
                title={isCollapsedDesktop ? section.label : undefined}
                className={cn(
                  "group flex w-full items-start rounded-lg text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  isCollapsedDesktop ? "justify-center px-2 py-2" : "gap-3 px-3 py-3",
                  isActive
                    ? "bg-sidebar-primary/18 text-sidebar-foreground shadow-[var(--shadow-soft)] ring-1 ring-sidebar-primary/20"
                    : "text-sidebar-foreground/90 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-transparent transition-colors",
                    !isCollapsedDesktop && "mt-0.5",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "bg-sidebar-accent/80 text-sidebar-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {!isCollapsedDesktop && (
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{section.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-sidebar-foreground/75">
                      {section.description}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div
        className={cn(
          "flex-none space-y-2 border-t border-sidebar-border/70 py-4",
          isCollapsedDesktop ? "px-2" : "px-4",
        )}
      >
        {/* Bloque de usuario → abre Mi cuenta */}
        <button
          type="button"
          onClick={() => setAccountDialogOpen(true)}
          className={cn(
            "flex w-full items-center rounded-lg bg-sidebar-accent/55 transition-colors hover:bg-sidebar-accent/75",
            isCollapsedDesktop ? "justify-center px-2 py-2" : "gap-3 px-3 py-3",
          )}
          title="Mi cuenta"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-sidebar-primary/20 text-sidebar-foreground">
            <UserCircle className="h-5 w-5" />
          </span>
          {!isCollapsedDesktop && (
            <span className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{profileName ?? "Usuario"}</p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                {workspaceMode === "admin" ? "Administración" : "Trabajador"}
              </p>
            </span>
          )}
        </button>
      </div>
    </div>
  );

  const desktopWidth = collapsed ? "md:w-[68px]" : "md:w-[320px]";

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
          className={cn(
            "hidden md:flex md:h-screen md:flex-col md:border-r md:border-sidebar-border/60 md:bg-sidebar md:sticky md:top-0 transition-[width] duration-200",
            desktopWidth,
          )}
          aria-label="Navegación principal"
        >
          {navigation(collapsed, true)}
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
          {navigation(false, false)}
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
                <div className="min-w-0 space-y-1">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground md:text-lg">
                      {activeSection?.label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground md:hidden">
                      {activeSection?.description}
                    </p>
                    <p className="hidden truncate text-sm text-muted-foreground md:block">
                      {activeSection?.description}
                    </p>
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
                {/* En móvil: botón Mi cuenta en lugar de Cerrar sesión suelto */}
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Mi cuenta"
                  className="md:hidden"
                  onClick={() => setAccountDialogOpen(true)}
                >
                  <UserCircle className="h-4 w-4" />
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
      <MyAccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        profileName={profileName}
        workspaceMode={workspaceMode}
        canChangeWorkspace={Boolean(onChangeWorkspace)}
        onChangeWorkspace={onChangeWorkspace}
        onOpenAccountSettings={openAccountSettings}
        onSignOut={onSignOut}
        availableSections={visibleSections.map((s) => ({ key: s.key, label: s.label }))}
      />
    </div>
  );
};

export default AppShell;
