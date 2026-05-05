import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DashboardTaskDialogProps {
  task: {
    id: string;
    title: string;
    description?: string | null;
    due_date?: string | null;
    status: string;
    priority: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleComplete: (taskId: string) => void;
  isCompleted: boolean;
}

const DashboardTaskDialog = ({ task, open, onOpenChange, onToggleComplete, isCompleted }: DashboardTaskDialogProps) => {
  if (!task) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          {task.due_date ? (
            <DialogDescription>
              Para el {format(new Date(task.due_date), "EEEE d 'de' MMMM", { locale: es })}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {task.description ? (
          <p className="whitespace-pre-wrap text-sm text-foreground">{task.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Sin descripción.</p>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-1 h-4 w-4" /> Cerrar
          </Button>
          <Button
            onClick={() => {
              onToggleComplete(task.id);
              onOpenChange(false);
            }}
          >
            {isCompleted ? (
              <>
                <RotateCcw className="mr-1 h-4 w-4" /> Reabrir
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Completar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardTaskDialog;
