import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Clock3, Flag, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface TaskDialogItem {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  start_date: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "planned" | "in_progress" | "blocked" | "completed" | "cancelled";
  category: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface TaskDetailDialogProps {
  open: boolean;
  task: TaskDialogItem | null;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (taskId: string, status: TaskDialogItem["status"]) => Promise<void>;
}

const priorityLabel: Record<TaskDialogItem["priority"], string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const statusLabel: Record<TaskDialogItem["status"], string> = {
  planned: "Pendiente",
  in_progress: "En curso",
  blocked: "Bloqueada",
  completed: "Completada",
  cancelled: "Cancelada",
};

const statusActions: Array<{ label: string; value: TaskDialogItem["status"] }> = [
  { label: "Pendiente", value: "planned" },
  { label: "En curso", value: "in_progress" },
  { label: "Bloqueada", value: "blocked" },
  { label: "Completada", value: "completed" },
];

const formatDate = (value: string | null) => {
  if (!value) return "Sin fecha";
  return format(new Date(value), "EEEE d MMMM yyyy", { locale: es });
};

const TaskDetailDialog = ({ open, task, onOpenChange, onStatusChange }: TaskDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-background">
        {!task ? null : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl text-foreground">{task.title}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Consulta el detalle, el historial y actualiza el estado real de la tarea.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Flag className="h-4 w-4 text-primary" /> Prioridad
                </div>
                <p className="font-semibold text-foreground">{priorityLabel[task.priority]}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <ListChecks className="h-4 w-4 text-secondary" /> Estado
                </div>
                <p className="font-semibold text-foreground">{statusLabel[task.status]}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 text-warning" /> Vencimiento
                </div>
                <p className="font-semibold text-foreground">{formatDate(task.due_date)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">Descripción</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {task.description?.trim() || "Sin observaciones registradas."}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarDays className="h-4 w-4 text-primary" /> Planificación
                </div>
                <div className="space-y-2 text-sm text-foreground">
                  <p><span className="text-muted-foreground">Inicio:</span> {formatDate(task.start_date)}</p>
                  <p><span className="text-muted-foreground">Vence:</span> {formatDate(task.due_date)}</p>
                  <p><span className="text-muted-foreground">Categoría:</span> {task.category || "General"}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Clock3 className="h-4 w-4 text-secondary" /> Historial
                </div>
                <div className="space-y-2 text-sm text-foreground">
                  <p><span className="text-muted-foreground">Creada:</span> {format(new Date(task.created_at), "d MMM yyyy · HH:mm", { locale: es })}</p>
                  <p><span className="text-muted-foreground">Último cambio:</span> {format(new Date(task.updated_at), "d MMM yyyy · HH:mm", { locale: es })}</p>
                  <p><span className="text-muted-foreground">Cierre:</span> {task.completed_at ? format(new Date(task.completed_at), "d MMM yyyy · HH:mm", { locale: es }) : "Pendiente"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Cambiar estado</p>
              <div className="flex flex-wrap gap-2">
                {statusActions.map((action) => (
                  <Button
                    key={action.value}
                    size="sm"
                    variant={task.status === action.value ? "default" : "outline"}
                    onClick={() => void onStatusChange(task.id, action.value)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;