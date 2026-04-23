import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TaskPriority } from "./task-utils";

interface StaffOption {
  id: string;
  full_name: string;
}

interface TaskComposerValues {
  title: string;
  description: string;
  labels: string;
  due_date: string;
  priority: TaskPriority;
  assigned_staff_id: string;
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

const emptyValues: TaskComposerValues = {
  title: "",
  description: "",
  labels: "",
  due_date: "",
  priority: "medium",
  assigned_staff_id: "unassigned",
};

const TaskComposerDialog = ({ open, editing, saving, isAdmin, staff, initialValues, onOpenChange, onSubmit }: TaskComposerDialogProps) => {
  const [form, setForm] = useState<TaskComposerValues>(initialValues);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const title = useMemo(() => (editing ? "Editar tarea" : "Nueva tarea"), [editing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-[28px] border-border bg-background p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base text-foreground"><Plus className="h-4 w-4 text-primary" /> {title}</DialogTitle>
          <DialogDescription>Crea o ajusta la tarea en pocos segundos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-5 py-4">
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
          {isAdmin ? (
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