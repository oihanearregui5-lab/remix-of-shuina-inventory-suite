import { ArrowDown, ArrowUp, Bell, BellOff, Eye, EyeOff, LogOut, RefreshCcw, RotateCcw, Sparkles, UserCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useUIMode } from "@/hooks/useUIMode";
import { useNavPreferences, type NavScope } from "@/hooks/useNavPreferences";
import { isNotificationSoundEnabled, setNotificationSoundEnabled } from "@/hooks/useNotificationSound";

interface SectionItem {
  key: string;
  label: string;
}

interface MyAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileName?: string | null;
  workspaceMode: "worker" | "admin";
  canChangeWorkspace: boolean;
  onChangeWorkspace?: () => void;
  onOpenAccountSettings: () => void;
  onSignOut: () => void | Promise<void>;
  /** Lista de secciones que el usuario puede ver (según rol/workspace). */
  availableSections?: SectionItem[];
}

const MyAccountDialog = ({
  open,
  onOpenChange,
  profileName,
  workspaceMode,
  canChangeWorkspace,
  onChangeWorkspace,
  onOpenAccountSettings,
  onSignOut,
  availableSections = [],
}: MyAccountDialogProps) => {
  const { isSimple, toggleMode } = useUIMode();
  // Usamos el SCOPE del espacio activo. Cada espacio tiene sus propias prefs.
  const scope: NavScope = workspaceMode;
  const { prefs, toggleHidden, moveSection, reset } = useNavPreferences(scope);
  const [soundOn, setSoundOn] = useState(isNotificationSoundEnabled());

  const allKeys = availableSections.map((s) => s.key);

  // Construir orden actual aplicando preferencias al instante (sin draft).
  const orderedSections = useMemo(() => {
    const ordered: string[] = [];
    for (const k of prefs.order) {
      if (allKeys.includes(k) && !ordered.includes(k)) ordered.push(k);
    }
    for (const k of allKeys) {
      if (!ordered.includes(k)) ordered.push(k);
    }
    return ordered.map((k) => availableSections.find((s) => s.key === k)!).filter(Boolean);
  }, [availableSections, prefs.order, allKeys]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mi cuenta</DialogTitle>
          <DialogDescription>
            Tu identidad y opciones rápidas de la app.
          </DialogDescription>
        </DialogHeader>

        {/* Tarjeta de identidad */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground">{profileName ?? "Usuario"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {workspaceMode === "admin" ? "Administración" : "Trabajador"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onOpenAccountSettings();
            }}
          >
            Entrar
          </Button>
        </div>

        {/* Vista sencilla */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            {isSimple ? <Eye className="h-4 w-4 text-primary" /> : <Sparkles className="h-4 w-4 text-primary" />}
            <div>
              <p className="text-sm font-semibold text-foreground">Vista sencilla</p>
              <p className="text-xs text-muted-foreground">
                Botones grandes y solo lo esencial.
              </p>
            </div>
          </div>
          <Switch checked={isSimple} onCheckedChange={() => toggleMode()} />
        </div>

        {/* Sonido de notificaciones */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            {soundOn ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="text-sm font-semibold text-foreground">Sonido de notificaciones</p>
              <p className="text-xs text-muted-foreground">
                Suena un aviso suave al recibir un mensaje nuevo.
              </p>
            </div>
          </div>
          <Switch
            checked={soundOn}
            onCheckedChange={(v) => {
              setSoundOn(v);
              setNotificationSoundEnabled(v);
            }}
          />
        </div>

        {/* Cambiar espacio */}
        {canChangeWorkspace && onChangeWorkspace && (
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onChangeWorkspace();
            }}
            className="w-full justify-start gap-2"
          >
            <RefreshCcw className="h-4 w-4" /> Cambiar espacio de trabajo
          </Button>
        )}

        {/* Personalizar menú */}
        {availableSections.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Personalizar menú</p>
                <p className="text-xs text-muted-foreground">
                  Oculta o reordena las secciones — los cambios se aplican al instante.
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground/70">
                  Espacio: <span className="font-semibold">{workspaceMode === "admin" ? "Administración" : "Trabajador"}</span>
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => reset()} className="gap-1 text-xs" title="Restaurar predeterminado">
                <RotateCcw className="h-3.5 w-3.5" /> Restaurar
              </Button>
            </div>
            <ul className="space-y-1.5">
              {orderedSections.map((section, index) => {
                const isHidden = prefs.hidden.includes(section.key);
                return (
                  <li
                    key={section.key}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-1.5"
                  >
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveSection(section.key, "up", allKeys)}
                        disabled={index === 0}
                        aria-label={`Subir ${section.label}`}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(section.key, "down", allKeys)}
                        disabled={index === orderedSections.length - 1}
                        aria-label={`Bajar ${section.label}`}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                    <span className={`flex-1 text-sm ${isHidden ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {section.label}
                    </span>
                    {isHidden ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-primary" />}
                    <Switch
                      checked={!isHidden}
                      onCheckedChange={() => toggleHidden(section.key)}
                      aria-label={isHidden ? `Mostrar ${section.label}` : `Ocultar ${section.label}`}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              void onSignOut();
            }}
            className="w-full gap-2"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MyAccountDialog;
