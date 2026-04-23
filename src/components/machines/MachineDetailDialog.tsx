import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, CircleGauge, Fuel, PlayCircle, ShieldCheck, ShoppingCart, TimerReset, Users, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface MachineDialogNote {
  id: string;
  note: string;
  is_highlight: boolean;
  created_at: string;
}

export interface MachineDialogItem {
  id: string;
  name: string;
  plate: string;
  family: string;
  status: "active" | "maintenance" | "repair" | "inspection";
  priority?: "critical" | "attention" | "stable";
  focus: string[];
  provider: string;
  nextInspection: string;
  nextIvt: string;
  fluids: string[];
  notes: MachineDialogNote[];
  serviceOverview?: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
  }>;
  incidentOverview?: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
  }>;
  usage: {
    totalHours30d: string;
    activeOperator: string;
    activeSince: string;
    operators: number;
    recentTimeline: Array<{
      id: string;
      workerName: string;
      startedAt: string;
      endedAt: string | null;
      durationLabel: string;
      isActive: boolean;
    }>;
  };
}

interface MachineDetailDialogProps {
  open: boolean;
  machine: MachineDialogItem | null;
  onOpenChange: (open: boolean) => void;
}

const statusLabel = {
  active: "Operativa",
  maintenance: "Mantenimiento",
  repair: "Avería",
  inspection: "Inspección",
};

const statusTone = {
  active: "bg-success/15 text-success",
  maintenance: "bg-warning/15 text-foreground",
  repair: "bg-destructive/10 text-destructive",
  inspection: "bg-info/10 text-info",
};

const priorityTone = {
  critical: "bg-destructive/10 text-destructive",
  attention: "bg-warning/15 text-foreground",
  stable: "bg-success/15 text-success",
};

const priorityLabel = {
  critical: "Crítica",
  attention: "Atención",
  stable: "Estable",
};

const MachineDetailDialog = ({ open, machine, onOpenChange }: MachineDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-background">
        {!machine ? null : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl text-foreground">{machine.name}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Ficha técnica e historial interactivo de la unidad seleccionada.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Estado
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[machine.status]}`}>
                  {statusLabel[machine.status]}
                </span>
                {machine.priority && (
                  <span className={`ml-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${priorityTone[machine.priority]}`}>
                    {priorityLabel[machine.priority]}
                  </span>
                )}
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <CircleGauge className="h-4 w-4 text-secondary" /> Matrícula / familia
                </div>
                <p className="font-semibold text-foreground">{machine.plate}</p>
                <p className="text-sm text-muted-foreground">{machine.family}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <ShoppingCart className="h-4 w-4 text-primary" /> Proveedor
                </div>
                <p className="font-semibold text-foreground">{machine.provider}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarClock className="h-4 w-4 text-secondary" /> Próximos hitos
                </div>
                <div className="space-y-2 text-sm text-foreground">
                  <p><span className="text-muted-foreground">Próxima revisión:</span> {machine.nextInspection}</p>
                  <p><span className="text-muted-foreground">Próxima ITV:</span> {machine.nextIvt}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Fuel className="h-4 w-4 text-primary" /> Fluidos y control
                </div>
                <div className="flex flex-wrap gap-2">
                  {machine.fluids.map((item) => (
                    <span key={item} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">{item}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <TimerReset className="h-4 w-4 text-primary" /> Uso 30 días
                </div>
                <p className="text-lg font-semibold text-foreground">{machine.usage.totalHours30d}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <PlayCircle className="h-4 w-4 text-secondary" /> Activa ahora
                </div>
                <p className="font-semibold text-foreground">{machine.usage.activeOperator}</p>
                <p className="text-sm text-muted-foreground">{machine.usage.activeSince}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" /> Operarios
                </div>
                <p className="text-lg font-semibold text-foreground">{machine.usage.operators}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <Wrench className="h-4 w-4 text-warning" /> Puntos a vigilar
              </div>
              <div className="flex flex-wrap gap-2">
                {machine.focus.map((item) => (
                  <span key={item} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">{item}</span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarClock className="h-4 w-4 text-primary" /> Mantenimientos
                </div>
                <div className="space-y-3">
                  {(machine.serviceOverview?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Sin mantenimientos destacados.</p>}
                  {machine.serviceOverview?.map((item) => (
                    <div key={item.id} className="rounded-lg bg-muted p-3">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.status} · {item.dueDate ? format(new Date(item.dueDate), "d MMM yyyy", { locale: es }) : "Sin fecha"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Wrench className="h-4 w-4 text-warning" /> Incidencias
                </div>
                <div className="space-y-3">
                  {(machine.incidentOverview?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Sin incidencias abiertas destacadas.</p>}
                  {machine.incidentOverview?.map((item) => (
                    <div key={item.id} className="rounded-lg bg-muted p-3">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.status} · {item.dueDate ? format(new Date(item.dueDate), "d MMM yyyy", { locale: es }) : "Sin fecha"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <PlayCircle className="h-4 w-4 text-primary" /> Uso reciente
              </div>
              <div className="space-y-3">
                {machine.usage.recentTimeline.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay uso operativo vinculado a esta máquina.</p>}
                {machine.usage.recentTimeline.map((item) => (
                  <div key={item.id} className="rounded-lg bg-muted p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.workerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.startedAt), "d MMM yyyy · HH:mm", { locale: es })}
                          {item.endedAt ? ` → ${format(new Date(item.endedAt), "HH:mm", { locale: es })}` : " · En curso"}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${item.isActive ? "bg-primary/15 text-foreground" : "bg-background text-muted-foreground"}`}>
                        {item.durationLabel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <Wrench className="h-4 w-4 text-primary" /> Historial de observaciones
              </div>
              <div className="space-y-3">
                {machine.notes.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay movimientos registrados en esta máquina.</p>}
                {machine.notes.map((note) => (
                  <div key={note.id} className="rounded-lg bg-muted p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${note.is_highlight ? "bg-primary/15 text-foreground" : "bg-background text-muted-foreground"}`}>
                        {note.is_highlight ? "Reseñable" : "Seguimiento"}
                      </span>
                      <span className="text-xs text-muted-foreground">{format(new Date(note.created_at), "d MMM yyyy · HH:mm", { locale: es })}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MachineDetailDialog;