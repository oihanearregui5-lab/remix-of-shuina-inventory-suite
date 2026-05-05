import { useEffect, useMemo, useState } from "react";
import { Plus, User2, Users2, Building2, Lock, Eye, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "./task-utils";

export interface StaffOption {
  id: string;
  full_name: string;
  is_admin: boolean;
  linked_user_id: string | null;
}

export type AssignmentMode = "individual" | "group" | "all";

export interface TaskComposerValues {
  title: string;
  description: string;
  labels: string;
  due_date: string;
  priority: TaskPriority;
  assignment_mode: AssignmentMode;
  assignee_ids: string[]; // staff_directory.id[]
  estimated_minutes: number | null;
}

interface TaskComposerDialogProps {
  open: boolean;
  editing: boolean;
  saving: boolean;
  isAdmin: boolean;
  currentUserId: string | null;
  staff: StaffOption[];
  initialValues: TaskComposerValues;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TaskComposerValues) => void;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const TaskComposerDialog = ({
  open,
  editing,
  saving,
  isAdmin,
  currentUserId,
  staff,
  initialValues,
  onOpenChange,
  onSubmit,
}: TaskComposerDialogProps) => {
  const [form, setForm] = useState<TaskComposerValues>(initialValues);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const title = useMemo(() => (editing ? "Editar tarea" : "Nueva tarea"), [editing]);

  const sortedStaff = useMemo(
    () => [...staff].sort((a, b) => a.full_name.localeCompare(b.full_name, "es")),
    [staff],
  );

  const setMode = (mode: AssignmentMode) => {
    setForm((current) => ({
      ...current,
      assignment_mode: mode,
      assignee_ids: mode === "all" ? [] : mode === "individual" ? current.assignee_ids.slice(0, 1) : current.assignee_ids,
    }));
  };

  const toggleAssignee = (id: string) => {
    setForm((current) => {
      if (current.assignment_mode === "individual") {
        return { ...current, assignee_ids: current.assignee_ids[0] === id ? [] : [id] };
      }
      const exists = current.assignee_ids.includes(id);
      return {
        ...current,
        assignee_ids: exists ? current.assignee_ids.filter((value) => value !== id) : [...current.assignee_ids, id],
      };
    });
  };

  // Cálculo de privacidad en vivo (frontend, mismo criterio que SQL)
  const isPrivate = useMemo(() => {
    if (!isAdmin || !currentUserId) return false;
    if (form.assignment_mode === "all") return false;
    if (form.assignee_ids.length === 0) return false;
    const assignees = sortedStaff.filter((person) => form.assignee_ids.includes(person.id));
    if (assignees.length !== form.assignee_ids.length) return false;
    const creatorAmongAssignees = assignees.some((person) => person.linked_user_id === currentUserId);
    if (!creatorAmongAssignees) return false;
    return assignees.every((person) => person.is_admin);
  }, [isAdmin, currentUserId, form.assignment_mode, form.assignee_ids, sortedStaff]);

  const [emptyFieldsConfirm, setEmptyFieldsConfirm] = useState<{ open: boolean; fields: string[] }>({
    open: false,
    fields: [],
  });

  const estimatedHours = form.estimated_minutes != null ? Math.floor(form.estimated_minutes / 60) : 0;
  const estimatedMinutesPart = form.estimated_minutes != null ? form.estimated_minutes % 60 : 0;

  const setEstimated = (hours: number, minutes: number) => {
    const total = hours * 60 + minutes;
    setForm((current) => ({ ...current, estimated_minutes: total > 0 ? total : null }));
  };

  const handleSubmit = () => {
    const empty: string[] = [];
    if (!form.title.trim()) empty.push("título");
    if (!form.description.trim()) empty.push("descripción");
    if (!form.labels.trim()) empty.push("etiquetas");
    if (!form.due_date) empty.push("fecha de vencimiento");
    if (form.assignment_mode !== "all" && form.assignee_ids.length === 0) empty.push("asignados");
    if (!form.estimated_minutes) empty.push("tiempo estimado");

    if (empty.length > 0) {
      setEmptyFieldsConfirm({ open: true, fields: empty });
      return;
    }
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-[28px] border-border bg-background p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base text-foreground">
            <Plus className="h-4 w-4 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>Crea o ajusta la tarea en pocos segundos.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4 max-h-[70vh] overflow-y-auto">
          {/* Modo de asignación */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">¿Para quién es?</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "individual" as const, icon: User2, title: "Una persona", subtitle: "Solo a alguien" },
                { value: "group" as const, icon: Users2, title: "Varias personas", subtitle: "Mínimo 2" },
                { value: "all" as const, icon: Building2, title: "Toda la plantilla", subtitle: "Los 14" },
              ].map((option) => {
                const Icon = option.icon;
                const active = form.assignment_mode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-2xl border px-3 py-3 text-left text-sm transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-semibold leading-tight">{option.title}</span>
                    <span className="text-xs opacity-80 leading-tight">{option.subtitle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selector de asignados */}
          {form.assignment_mode === "all" ? (
            <div className="rounded-2xl border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm text-foreground">
              <div className="flex items-center gap-2 font-semibold">
                <Building2 className="h-4 w-4" /> Toda la plantilla
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Esta tarea será visible para los 14 trabajadores. Cada uno marca su parte como completada.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {form.assignment_mode === "individual" ? "Elige una persona" : `Elige varias (${form.assignee_ids.length} seleccionadas)`}
              </p>
              <ScrollArea className="h-56 rounded-2xl border border-border bg-background">
                <div className="p-2 space-y-1">
                  {sortedStaff.map((person) => {
                    const selected = form.assignee_ids.includes(person.id);
                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => toggleAssignee(person.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                          selected ? "bg-primary/10" : "hover:bg-muted/50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-semibold",
                            person.is_admin
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground",
                          )}
                        >
                          {initials(person.full_name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground truncate">{person.full_name}</span>
                          <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
                            {person.is_admin ? "Administración" : "Trabajador"}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full border",
                            selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
                          )}
                        >
                          {selected ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
              {form.assignment_mode === "group" && form.assignee_ids.length === 1 ? (
                <p className="text-xs text-muted-foreground">
                  Has seleccionado solo 1. Si quieres asignar a varias, marca al menos 2.
                </p>
              ) : null}
            </div>
          )}

          {/* Indicador de privacidad */}
          {form.assignment_mode !== "all" && form.assignee_ids.length > 0 ? (
            <div
              className={cn(
                "flex items-center gap-2 rounded-2xl px-3 py-2 text-xs",
                isPrivate
                  ? "bg-muted text-foreground"
                  : "bg-primary/5 text-muted-foreground",
              )}
            >
              {isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {isPrivate
                ? "Privada · solo tú y los seleccionados la veréis"
                : "Visible para toda la administración"}
            </div>
          ) : null}

          {/* Campos comunes */}
          <Input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Título"
            className="h-12 rounded-2xl"
          />
          <Textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Descripción opcional"
            className="min-h-24 rounded-2xl"
          />
          <Input
            value={form.labels}
            onChange={(event) => setForm((current) => ({ ...current, labels: event.target.value }))}
            placeholder="Etiquetas separadas por coma"
            className="h-12 rounded-2xl"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              value={form.due_date}
              onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
              className="h-12 rounded-2xl"
            />
            <Select
              value={form.priority}
              onValueChange={(value: TaskPriority) => setForm((current) => ({ ...current, priority: value }))}
            >
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tiempo estimado */}
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Tiempo estimado
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Select value={String(estimatedHours)} onValueChange={(v) => setEstimated(Number(v), estimatedMinutesPart)}>
                <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 horas</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <SelectItem key={h} value={String(h)}>{h} hora{h > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(estimatedMinutesPart)} onValueChange={(v) => setEstimated(estimatedHours, Number(v))}>
                <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 min</SelectItem>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-4">
          <Button className="h-12 flex-1 rounded-2xl" onClick={handleSubmit} disabled={saving}>
            {editing ? "Guardar" : "Crear tarea"}
          </Button>
          <Button variant="outline" className="h-12 rounded-2xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>

      <AlertDialog
        open={emptyFieldsConfirm.open}
        onOpenChange={(open) => setEmptyFieldsConfirm((s) => ({ ...s, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Crear la tarea con campos sin rellenar?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a crear una tarea sin: {emptyFieldsConfirm.fields.join(", ")}. ¿Seguro que quieres continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, vuelvo a editar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setEmptyFieldsConfirm({ open: false, fields: [] });
                onSubmit(form);
              }}
            >
              Sí, crear así
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default TaskComposerDialog;
