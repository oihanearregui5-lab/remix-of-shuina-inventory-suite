import { Eye, LogOut, RefreshCcw, Sparkles, UserCircle } from "lucide-react";
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

interface MyAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileName?: string | null;
  workspaceMode: "worker" | "admin";
  canChangeWorkspace: boolean;
  onChangeWorkspace?: () => void;
  onOpenAccountSettings: () => void;
  onSignOut: () => void | Promise<void>;
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
}: MyAccountDialogProps) => {
  const { isSimple, toggleMode } = useUIMode();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
            Editar
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
