import { useEffect, useMemo, useState } from "react";
import { Plus, User2, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "./task-utils";

interface StaffOption {
  id: string;
  full_name: string;
}

export type TaskScope = "personal" | "general";

export interface TaskComposerValues {
  title: string;
  description: string;
  labels: string;
  due_date: string;
  priority: TaskPriority;
  assigned_staff_id: string;
  scope: TaskScope;
}

interface TaskComposerDialogProps {
  open: boolean;
  editing: boolean;
  saving: boolean;
  isAdmin: boolean;
  staff: StaffOption[];
  initialValues: TaskComposerValues;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TaskComposerValues) => void;
}

const TaskComposerDialog = ({ open, editing, saving, isAdmin, staff, initialValues, onOpenChange, onSubmit }: TaskComposerDialogProps) => {
  const [form, setForm] = useState<TaskComposerValues>(initialValues);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const title = useMemo(() => (editing ? "Editar tarea" : "Nueva tarea"), [editing]);

  const handleScopeChange = (scope: TaskScope) => {
    setForm((current) => ({
      ...current,
      scope,
      // Al pasar a general, limpia el asignado (las generales son para todo el equipo)
      assigned_staff_id: scope === "general" ? "unassigned" : current.assigned_staff_id,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-[28px] border-border bg-background p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base text-foreground"><Plus className="h-4 w-4 text-primary" /> {title}</DialogTitle>
          <DialogDescription>Crea o ajusta la tarea en pocos segundos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-5 py-4">
          {/* Selector de alcance, solo admins lo ven */}
          {isAdmin && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">¿A quién se asigna?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleScopeChange("personal")}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm transition-colors",
                    form.scope === "personal"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <User2 className="h-4 w-4" />
                  <span className="flex flex-col leading-tight">
                    <span className="font-semibold">Persona concreta</span>
                    <span className="text-xs opacity-80">Solo la ve quien la tiene asignada</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScopeChange("general")}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm transition-colors",
                    form.scope === "general"
                      ? "border-secondary bg-secondary/20 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <Users2 className="h-4 w-4" />
                  <span className="flex flex-col leading-tight">
                    <span className="font-semibold">Todo el equipo</span>
                    <span className="text-xs opacity-80">Visible para todos los trabajadores</span>
                  </span>
                </button>
              </div>
            </div>
          )}

          <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Título" className="h-12 rounded-2xl" />
          <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Descripción opcional" className="min-h-24 rounded-2xl" />
          <Input value={form.labels} onChange={(event) => setForm((current) => ({ ...current, labels: event.target.value }))} placeholder="Etiquetas separadas por coma" className="h-12 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={form.due_date} onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))} className="h-12 rounded-2xl" />
            <Select value={form.priority} onValueChange={(value: TaskPriority) => setForm((current) => ({ ...current, priority: value }))}>
              <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Prioridad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Solo admins pueden asignar; los trabajadores siempre crean personales para sí mismos.
              Si se marcó 'general', ocultamos el selector de persona. */}
          {isAdmin && form.scope === "personal" ? (
            <Select value={form.assigned_staff_id} onValueChange={(value) => setForm((current) => ({ ...current, assigned_staff_id: value }))}>
              <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Asignar a" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Sin asignar</SelectItem>
                {staff.map((person) => (
                  <SelectItem key={person.id} value={person.id}>{person.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        <div className="flex gap-2 border-t border-border px-5 py-4">
          <Button className="h-12 flex-1 rounded-2xl" onClick={() => onSubmit(form)} disabled={saving || !form.title.trim()}>
            {editing ? "Guardar" : "Crear tarea"}
          </Button>
          <Button variant="outline" className="h-12 rounded-2xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskComposerDialog;
