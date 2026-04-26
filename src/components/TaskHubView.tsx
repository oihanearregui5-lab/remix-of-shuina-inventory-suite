import { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, isSameDay, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Filter, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import TaskDetailDialog, { type TaskDialogItem } from "@/components/tasks/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TaskComposerDialog from "@/components/tasks/TaskComposerDialog";
import TaskListSection, { type TaskListItem } from "@/components/tasks/TaskListSection";
import { parseTaskLabels, serializeTaskLabels, type TaskPriority, type TaskStatus } from "@/components/tasks/task-utils";
import { toast } from "sonner";
import SmartRemindersPanel from "@/components/shared/SmartRemindersPanel";
import { useSmartReminders } from "@/hooks/useSmartReminders";
import { useUIMode } from "@/hooks/useUIMode";

interface TaskItem extends TaskDialogItem {
  assigned_staff_id?: string | null;
  assigned_staff_name?: string | null;
  scope?: "personal" | "general" | null;
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

const statusFilters: Array<{ key: "active" | "generales" | TaskStatus; label: string }> = [
  { key: "active", label: "Activas" },
  { key: "generales", label: "Generales" },
  { key: "planned", label: "Pendientes" },
  { key: "in_progress", label: "En curso" },
  { key: "completed", label: "Completadas" },
];

const TaskHubView = () => {
  const { user, isAdmin } = useAuth();
  const db = supabase as any;
  const { reminders } = useSmartReminders();
  const { isSimple } = useUIMode();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [activeStatusFilter, setActiveStatusFilter] = useState<"active" | "generales" | TaskStatus>("active");
  const [activeLabelFilter, setActiveLabelFilter] = useState<string>("all");
  const [activeAssigneeFilter, setActiveAssigneeFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    labels: "",
    due_date: "",
    priority: "medium" as TaskPriority,
    assigned_staff_id: "unassigned",
    scope: "personal" as "personal" | "general",
  });

  useEffect(() => {
    if (!user) return;
    void Promise.all([fetchTasks(), fetchStaff(), fetchEvents()]);
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await db
      .from("tasks")
      .select("id, title, description, start_date, due_date, category, priority, status, created_at, updated_at, completed_at, assigned_staff_id, scope")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      setLoading(false);
      setError("No se pudieron cargar las tareas.");
      return toast.error("No se pudieron cargar las tareas");
    }

    const assignedIds = Array.from(new Set((data ?? []).map((task: { assigned_staff_id?: string | null }) => task.assigned_staff_id).filter(Boolean)));
    const { data: staffRows } = assignedIds.length ? await db.from("staff_directory").select("id, full_name").in("id", assignedIds) : { data: [] };
    const names = Object.fromEntries(((staffRows ?? []) as StaffOption[]).map((person) => [person.id, person.full_name]));

    setTasks(((data ?? []) as TaskItem[]).map((task) => ({ ...task, assigned_staff_name: task.assigned_staff_id ? names[task.assigned_staff_id] ?? null : null })));
    setError(null);
    setLoading(false);
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
    setForm({ title: "", description: "", labels: "", due_date: "", priority: "medium", assigned_staff_id: "unassigned", scope: "personal" as const });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setComposerOpen(true);
  };

  const openEdit = (task: TaskItem) => {
    setForm({
      title: task.title,
      description: task.description || "",
      labels: serializeTaskLabels(parseTaskLabels(task.category)),
      due_date: task.due_date || "",
      priority: task.priority,
      assigned_staff_id: task.assigned_staff_id || "unassigned",
      scope: (task.scope === "general" ? "general" : "personal") as "personal" | "general",
    });
    setEditingId(task.id);
    setComposerOpen(true);
  };

  const submitTask = async (values = form) => {
    if (!user || !values.title.trim()) return;
    setSaving(true);

    const resolvedScope: "personal" | "general" = isAdmin && values.scope === "general" ? "general" : "personal";
    const resolvedAssignee = resolvedScope === "general"
      ? null
      : isAdmin && values.assigned_staff_id !== "unassigned"
        ? values.assigned_staff_id
        : null;

    const payload = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      category: serializeTaskLabels(parseTaskLabels(values.labels)) || null,
      due_date: values.due_date || null,
      priority: values.priority,
      created_by_user_id: user.id,
      assigned_staff_id: resolvedAssignee,
      scope: resolvedScope,
    };

    const query = editingId ? db.from("tasks").update(payload).eq("id", editingId) : db.from("tasks").insert({ ...payload, status: "planned" });
    const { error } = await query;
    setSaving(false);
    if (error) return toast.error(editingId ? "No se pudo editar la tarea" : "No se pudo crear la tarea");
    toast.success(editingId ? "Tarea actualizada" : "Tarea creada");
    resetForm();
    setComposerOpen(false);
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

  const availableLabels = useMemo(() => Array.from(new Set(tasks.flatMap((task) => parseTaskLabels(task.category)))).sort((a, b) => a.localeCompare(b, "es")), [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      let statusOk: boolean;
      if (activeStatusFilter === "active") {
        statusOk = !["completed", "cancelled"].includes(task.status);
      } else if (activeStatusFilter === "generales") {
        statusOk = task.scope === "general" && task.status !== "cancelled";
      } else {
        statusOk = task.status === activeStatusFilter;
      }
      const labelOk = activeLabelFilter === "all" ? true : parseTaskLabels(task.category).includes(activeLabelFilter);
      const assigneeOk = activeAssigneeFilter === "all" ? true : (task.assigned_staff_id || "unassigned") === activeAssigneeFilter;
      return statusOk && labelOk && assigneeOk;
    });
  }, [activeAssigneeFilter, activeLabelFilter, activeStatusFilter, tasks]);

  const selectedDayTasks = useMemo(() => tasks.filter((task) => task.due_date && selectedDate && isSameDay(new Date(task.due_date), selectedDate)), [selectedDate, tasks]);
  const selectedDayEvents = useMemo(() => events.filter((event) => selectedDate && isSameDay(new Date(event.start_at), selectedDate)), [events, selectedDate]);
  const taskDates = useMemo(() => tasks.filter((task) => task.due_date).map((task) => new Date(task.due_date as string)), [tasks]);
  const activeTasks = useMemo(() => filteredTasks.filter((task) => task.status !== "completed" && task.status !== "cancelled"), [filteredTasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === "completed"), [tasks]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="Tareas"
        title={isAdmin ? "Tareas del equipo" : "Mis tareas"}
        description={isAdmin ? "Todas las tareas del equipo, asignaciones y prioridades." : "Solo las tareas asignadas a ti o creadas por ti."}
        actions={<Button className="h-11 rounded-2xl" onClick={openCreate}><Plus className="h-4 w-4" /> Nueva tarea</Button>}
      />

      {!isSimple ? <SmartRemindersPanel reminders={reminders.filter((reminder) => reminder.section === "tasks")} compact /> : null}

      <section className={isSimple ? "space-y-3" : "grid gap-3 xl:grid-cols-[1.15fr_0.85fr]"}>
        <div className="space-y-3">
          <section className="panel-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Bandeja</p>
                <p className="text-xs text-muted-foreground">Estado, etiquetas y asignación con lectura rápida.</p>
              </div>
              <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{activeTasks.length} activas</div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Filter className="h-4 w-4" /> Filtros</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {statusFilters.map((filter) => (
                  <button key={filter.key} onClick={() => setActiveStatusFilter(filter.key)} className={activeStatusFilter === filter.key ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" : "rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground"}>
                    {filter.label}
                  </button>
                ))}
              </div>
              {!isSimple ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Select value={activeLabelFilter} onValueChange={setActiveLabelFilter}>
                    <SelectTrigger className="h-11 rounded-2xl"><SelectValue placeholder="Etiqueta" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las etiquetas</SelectItem>
                      {availableLabels.map((label) => <SelectItem key={label} value={label}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {isAdmin ? (
                    <Select value={activeAssigneeFilter} onValueChange={setActiveAssigneeFilter}>
                      <SelectTrigger className="h-11 rounded-2xl"><SelectValue placeholder="Asignado a" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todo el equipo</SelectItem>
                        <SelectItem value="unassigned">Sin asignar</SelectItem>
                        {staff.map((person) => <SelectItem key={person.id} value={person.id}>{person.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <TaskListSection
            title="Activas"
            subtitle="Solo lo que requiere acción ahora mismo."
            tasks={activeTasks as TaskListItem[]}
            loading={loading}
            error={error}
            isAdmin={isAdmin}
            onOpenTask={setSelectedTask}
            onEditTask={openEdit}
            onDeleteTask={(taskId) => void deleteTask(taskId)}
            onToggleComplete={(task) => void updateTaskStatus(task.id, task.status === "completed" ? "planned" : "completed")}
          />

          {completedTasks.length > 0 ? (
            <TaskListSection
              title="Completadas"
              subtitle="Historial reciente para revisar avances." 
              tasks={completedTasks.slice(0, 8) as TaskListItem[]}
              loading={false}
              error={null}
              isAdmin={isAdmin}
              onOpenTask={setSelectedTask}
              onEditTask={openEdit}
              onDeleteTask={(taskId) => void deleteTask(taskId)}
              onToggleComplete={(task) => void updateTaskStatus(task.id, "planned")}
            />
          ) : null}
        </div>

        {!isSimple ? (
          <div className="space-y-3">
            <section className="panel-surface p-4">
              <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">Calendario del mes</p></div>
              <div className="rounded-3xl border border-border bg-background p-3">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} month={month} onMonthChange={setMonth} locale={es} modifiers={{ hasTask: taskDates }} modifiersClassNames={{ hasTask: "bg-primary/15 text-foreground font-semibold" }} className="w-full" />
              </div>
              <div className="mt-3 space-y-2">
                {selectedDate && <p className="text-sm font-medium text-foreground">{format(selectedDate, "EEEE d MMMM", { locale: es })}</p>}
                {selectedDayTasks.map((task) => (
                  <button key={task.id} onClick={() => setSelectedTask(task)} className="block w-full rounded-2xl border border-border bg-background px-3 py-3 text-left text-sm text-foreground">
                    {task.title}
                    <span className="mt-1 block text-xs text-muted-foreground">{task.category || "Sin etiquetas"}</span>
                  </button>
                ))}
                {selectedDayEvents.map((event) => <div key={event.id} className="rounded-2xl bg-muted px-3 py-3 text-sm text-foreground">{event.title}</div>)}
                {selectedDayTasks.length === 0 && selectedDayEvents.length === 0 && <p className="text-sm text-muted-foreground">No hay nada organizado para este día.</p>}
              </div>
            </section>

            <section className="panel-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Acción rápida</p>
                  <p className="text-xs text-muted-foreground">Crea trabajo nuevo sin perder tiempo.</p>
                </div>
                <Button variant="surface" className="h-11 rounded-2xl" onClick={openCreate}><Plus className="h-4 w-4" /> Crear</Button>
              </div>
            </section>
          </div>
        ) : null}
      </section>

      <TaskComposerDialog
        open={composerOpen}
        editing={Boolean(editingId)}
        saving={saving}
        isAdmin={isAdmin}
        staff={staff}
        initialValues={form}
        onOpenChange={(open) => {
          setComposerOpen(open);
          if (!open) resetForm();
        }}
        onSubmit={(values) => void submitTask(values)}
      />

      <TaskDetailDialog open={Boolean(selectedTask)} task={selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)} onStatusChange={updateTaskStatus} />
    </div>
  );
};

export default TaskHubView;