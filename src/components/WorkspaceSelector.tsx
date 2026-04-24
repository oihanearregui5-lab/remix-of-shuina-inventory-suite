import { HardHat, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceSelectorProps {
  profileName?: string | null;
  canViewAdmin: boolean;
  onSelect: (mode: "worker" | "admin") => void;
  onSignOut: () => void | Promise<void>;
}

const WorkspaceSelector = ({ profileName, canViewAdmin, onSelect, onSignOut }: WorkspaceSelectorProps) => {
  const greeting = profileName ? `Hola ${profileName.split(" ")[0]}` : "Hola";

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 md:gap-10 md:py-12">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-card">
              <img src="/favicon.svg" alt="Transtubari" className="h-7 w-7 object-contain" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Transtubari</p>
              <p className="text-base font-semibold text-foreground md:text-lg">{greeting}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="rounded-full border border-border/70 bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground md:text-sm"
          >
            Cerrar sesión
          </button>
        </header>

        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">¿Qué quieres hacer hoy?</h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">Elige el espacio en el que vas a trabajar.</p>
        </div>

        <div className="grid flex-1 gap-4 md:grid-cols-2 md:gap-6">
          {/* TRABAJADOR */}
          <button
            type="button"
            onClick={() => onSelect("worker")}
            className={cn(
              "group flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-border bg-card p-6 text-center transition-all",
              "hover:border-primary hover:bg-primary/5 hover:shadow-[var(--shadow-soft)]",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
              "md:min-h-[360px] md:gap-6 md:p-10",
            )}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground md:h-28 md:w-28">
              <HardHat className="h-10 w-10 md:h-14 md:w-14" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground md:text-2xl">Trabajador</p>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                Fichajes, tareas, partes y equipo
              </p>
            </div>
          </button>

          {/* ADMINISTRACIÓN */}
          <button
            type="button"
            onClick={() => {
              if (!canViewAdmin) return;
              onSelect("admin");
            }}
            disabled={!canViewAdmin}
            className={cn(
              "group relative flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-border bg-card p-6 text-center transition-all",
              canViewAdmin
                ? "hover:border-secondary hover:bg-secondary/10 hover:shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary/30"
                : "cursor-not-allowed opacity-70",
              "md:min-h-[360px] md:gap-6 md:p-10",
            )}
          >
            <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Lock className="h-3 w-3" />
              {canViewAdmin ? "Restringido" : "Sin acceso"}
            </div>
            <div
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary/15 text-secondary-foreground transition-colors md:h-28 md:w-28",
                canViewAdmin && "group-hover:bg-secondary group-hover:text-secondary-foreground",
              )}
            >
              <ShieldCheck className="h-10 w-10 md:h-14 md:w-14" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground md:text-2xl">Administración</p>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                {canViewAdmin
                  ? "Control global, revisión y gestión"
                  : "Solo personal autorizado puede entrar"}
              </p>
            </div>
            {/* TODO: añadir PIN/código de acceso antes de entrar a Administración */}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Puedes cambiar de espacio en cualquier momento desde el menú lateral.
        </p>
      </div>
    </div>
  );
};

export default WorkspaceSelector;
