import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, CheckCircle2, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import TaskDetailDialog, { type TaskDialogItem } from "@/components/tasks/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type TaskStatus = "planned" | "in_progress" | "blocked" | "completed" | "cancelled";
type TaskPriority = "low" | "medium" | "high" | "urgent";

interface TaskItem extends TaskDialogItem {
  assigned_staff_id?: string | null;
}

interface StaffOption {
  id: string;
  full_name: string;
}

interface CalendarEventItem {
  id: string;
  title: string;
  start_at: string;
}

const lanes: Array<{ key: TaskStatus | "mine"; label: string }> = [
  { key: "mine", label: "Activas" },
  { key: "in_progress", label: "En curso" },
  { key: "blocked", label: "Bloqueadas" },
  { key: "completed", label: "Completadas" },
];

const priorityLabel: Record<TaskPriority, string> = { low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente" };

const TaskHubView = () => {
  const { user, isAdmin } = useAuth();
  const db = supabase as any;
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [activeLane, setActiveLane] = useState<TaskStatus | "mine">("mine");
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "General",
    due_date: "",
    priority: "medium" as TaskPriority,
    assigned_staff_id: "unassigned",
  });

  useEffect(() => {
    if (!user) return;
    void Promise.all([fetchTasks(), fetchStaff(), fetchEvents()]);
  }, [user]);

  const fetchTasks = async () => {
    const { data, error } = await db
      .from("tasks")
      .select("id, title, description, start_date, due_date, category, priority, status, created_at, updated_at, completed_at, assigned_staff_id")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) return toast.error("No se pudieron cargar las tareas");
    setTasks((data ?? []) as TaskItem[]);
  };

  const fetchStaff = async () => {
    const { data } = await db.from("staff_directory").select("id, full_name").eq("active", true).order("sort_order", { ascending: true });
    setStaff((data ?? []) as StaffOption[]);
  };

  const fetchEvents = async () => {
    const start = format(startOfMonth(month), "yyyy-MM-dd");
    const end = format(endOfMonth(month), "yyyy-MM-dd");
    const { data } = await db.from("calendar_events").select("id, title, start_at").gte("start_at", start).lte("start_at", `${end}T23:59:59`);
    setEvents((data ?? []) as CalendarEventItem[]);
  };

  useEffect(() => {
    if (user) void fetchEvents();
  }, [month]);

  const resetForm = () => {
    setForm({ title: "", description: "", category: "General", due_date: "", priority: "medium", assigned_staff_id: "unassigned" });
    setEditingId(null);
  };

  const submitTask = async () => {
    if (!user || !form.title.trim()) return;
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      due_date: form.due_date || null,
      priority: form.priority,
      created_by_user_id: user.id,
      assigned_staff_id: isAdmin && form.assigned_staff_id !== "unassigned" ? form.assigned_staff_id : null,
    };

    const query = editingId ? db.from("tasks").update(payload).eq("id", editingId) : db.from("tasks").insert({ ...payload, status: "planned" });
    const { error } = await query;
    setSaving(false);
    if (error) return toast.error(editingId ? "No se pudo editar la tarea" : "No se pudo crear la tarea");
    toast.success(editingId ? "Tarea actualizada" : "Tarea creada");
    resetForm();
    void fetchTasks();
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await db.from("tasks").delete().eq("id", taskId);
    if (error) return toast.error("No se pudo eliminar la tarea");
    toast.success("Tarea eliminada");
    if (editingId === taskId) resetForm();
    void fetchTasks();
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<void> => {
    const { error } = await db.from("tasks").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", taskId);
    if (error) {
      toast.error("No se pudo actualizar la tarea");
      return;
    }
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status, completed_at: status === "completed" ? new Date().toISOString() : null } : task)));
  };

  const visibleTasks = useMemo(() => {
    if (activeLane === "mine") return tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled");
    return tasks.filter((task) => task.status === activeLane);
  }, [activeLane, tasks]);

  const selectedDayTasks = useMemo(() => tasks.filter((task) => task.due_date && selectedDate && isSameDay(new Date(task.due_date), selectedDate)), [selectedDate, tasks]);
  const selectedDayEvents = useMemo(() => events.filter((event) => selectedDate && isSameDay(new Date(event.start_at), selectedDate)), [events, selectedDate]);
  const taskDates = useMemo(() => tasks.filter((task) => task.due_date).map((task) => new Date(task.due_date as string)), [tasks]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader eyebrow="Tareas" title="Trabajo organizado" description="Etiquetas claras, edición rápida y vista mensual para revisar el mes de un vistazo." />

      <section className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel-surface p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Bandeja por estado</p>
              <p className="text-xs text-muted-foreground">Pulsa una etiqueta y abre cualquier tarea para ver historial.</p>
            </div>
            <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{tasks.filter((task) => task.status !== "completed").length} activas</div>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {lanes.map((lane) => (
              <button key={lane.key} onClick={() => setActiveLane(lane.key)} className={activeLane === lane.key ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" : "rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground"}>
                {lane.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {visibleTasks.length === 0 && <div className="rounded-xl bg-muted px-4 py-6 text-sm text-muted-foreground">No hay tareas en esta vista.</div>}
            {visibleTasks.map((task) => (
              <article key={task.id} className="rounded-xl border border-border bg-background p-4">
                <button type="button" onClick={() => setSelectedTask(task)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{task.title}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{task.description || "Sin detalle adicional."}</p>
                      <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2.5 py-1">{task.category || "General"}</span>
                        <span className="rounded-full bg-muted px-2.5 py-1">{priorityLabel[task.priority]}</span>
                        <span className="rounded-full bg-muted px-2.5 py-1">{task.due_date ? format(new Date(task.due_date), "d MMM", { locale: es }) : "Sin fecha"}</span>
                      </div>
                    </div>
                    {task.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Tags className="h-5 w-5 text-primary" />}
                  </div>
                </button>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="soft" onClick={() => {
                    setForm({ title: task.title, description: task.description || "", category: task.category || "General", due_date: task.due_date || "", priority: task.priority, assigned_staff_id: task.assigned_staff_id || "unassigned" });
                    setEditingId(task.id);
                  }}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void updateTaskStatus(task.id, task.status === "completed" ? "planned" : "completed")}>
                    {task.status === "completed" ? "Reabrir" : "Completar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void deleteTask(task.id)}>
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <section className="panel-surface p-4">
            <div className="mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">{editingId ? "Editar tarea" : "Nueva tarea"}</p></div>
            <div className="space-y-3">
              <Input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} placeholder="Título de la tarea" />
              <Input value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))} placeholder="Etiqueta o categoría" />
              <div className="grid grid-cols-2 gap-3">
                <Input type="date" value={form.due_date} onChange={(e) => setForm((current) => ({ ...current, due_date: e.target.value }))} />
                <Select value={form.priority} onValueChange={(value: TaskPriority) => setForm((current) => ({ ...current, priority: value }))}>
                  <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isAdmin && (
                <Select value={form.assigned_staff_id} onValueChange={(value) => setForm((current) => ({ ...current, assigned_staff_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Asignar trabajador" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                    {staff.map((person) => <SelectItem key={person.id} value={person.id}>{person.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Detalles rápidos para que el trabajador entienda la tarea al instante" className="min-h-24" />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => void submitTask()} disabled={saving || !form.title.trim()}>{editingId ? "Guardar cambios" : "Crear tarea"}</Button>
                {editingId && <Button variant="outline" onClick={resetForm}>Cancelar</Button>}
              </div>
            </div>
          </section>

          <section className="panel-surface p-4">
            <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">Calendario del mes</p></div>
            <div className="rounded-xl border border-border bg-background p-3">
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} month={month} onMonthChange={setMonth} modifiers={{ hasTask: taskDates }} modifiersClassNames={{ hasTask: "bg-primary/15 text-foreground font-semibold" }} className="w-full" />
            </div>
            <div className="mt-3 space-y-2">
              {selectedDate && <p className="text-sm font-medium text-foreground">{format(selectedDate, "EEEE d MMMM", { locale: es })}</p>}
              {selectedDayTasks.map((task) => (
                <button key={task.id} onClick={() => setSelectedTask(task)} className="block w-full rounded-xl border border-border bg-background px-3 py-3 text-left text-sm text-foreground">
                  {task.title}
                  <span className="mt-1 block text-xs text-muted-foreground">{task.category || "General"}{task.due_date && isToday(new Date(task.due_date)) ? " · Hoy" : ""}</span>
                </button>
              ))}
              {selectedDayEvents.map((event) => <div key={event.id} className="rounded-xl bg-muted px-3 py-3 text-sm text-foreground">{event.title}</div>)}
              {selectedDayTasks.length === 0 && selectedDayEvents.length === 0 && <p className="text-sm text-muted-foreground">No hay nada organizado para este día.</p>}
            </div>
          </section>
        </div>
      </section>

      <TaskDetailDialog open={Boolean(selectedTask)} task={selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)} onStatusChange={updateTaskStatus} />
    </div>
  );
};

export default TaskHubView;