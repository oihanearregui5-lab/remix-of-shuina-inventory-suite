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
import TaskComposerDialog, { type AssignmentMode, type StaffOption, type TaskComposerValues } from "@/components/tasks/TaskComposerDialog";
import TaskListSection, { type TaskAssigneeBrief, type TaskListItem } from "@/components/tasks/TaskListSection";
import { parseTaskLabels, serializeTaskLabels, type TaskPriority, type TaskStatus } from "@/components/tasks/task-utils";
import { toast } from "sonner";
import SmartRemindersPanel from "@/components/shared/SmartRemindersPanel";
import { useSmartReminders } from "@/hooks/useSmartReminders";
import { useUIMode } from "@/hooks/useUIMode";

interface CalendarEventItem {
  id: string;
  title: string;
  start_at: string;
}

interface RawTask {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
  category: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  created_by_user_id: string;
  assignment_mode: AssignmentMode;
}

const statusFilters: Array<{ key: "active" | TaskStatus; label: string }> = [
  { key: "active", label: "Activas" },
  { key: "planned", label: "Pendientes" },
  { key: "in_progress", label: "En curso" },
  { key: "completed", label: "Completadas" },
];

const emptyForm: TaskComposerValues = {
  title: "",
  description: "",
  labels: "",
  due_date: "",
  priority: "medium",
  assignment_mode: "individual",
  assignee_ids: [],
};

const TaskHubView = () => {
  const { user, isAdmin } = useAuth();
  const db = supabase as any;
  const { reminders } = useSmartReminders();
  const { isSimple } = useUIMode();
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [activeStatusFilter, setActiveStatusFilter] = useState<"active" | TaskStatus>("active");
  const [activeLabelFilter, setActiveLabelFilter] = useState<string>("all");
  const [activeAssigneeFilter, setActiveAssigneeFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<TaskListItem | null>(null);
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TaskComposerValues>(emptyForm);

  useEffect(() => {
    if (!user) return;
    void Promise.all([fetchStaff(), fetchEvents()]);
  }, [user]);

  // fetchTasks depende de staff (para resolver nombres) y de user
  useEffect(() => {
    if (!user || staff.length === 0) return;
    void fetchTasks();
  }, [user, staff]);

  const fetchStaff = async () => {
    // Cargamos directorio activo + sabemos si linked_user_id es admin
    const { data: rows } = await db
      .from("staff_directory")
      .select("id, full_name, linked_user_id")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    const staffRows = (rows ?? []) as Array<{ id: string; full_name: string; linked_user_id: string | null }>;
    const userIds = staffRows.map((row) => row.linked_user_id).filter(Boolean) as string[];

    let adminSet = new Set<string>();
    if (userIds.length > 0) {
      const { data: roleRows } = await db
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds)
        .eq("role", "admin");
      adminSet = new Set(((roleRows ?? []) as Array<{ user_id: string }>).map((row) => row.user_id));
    }

    setStaff(
      staffRows.map((row) => ({
        id: row.id,
        full_name: row.full_name,
        linked_user_id: row.linked_user_id,
        is_admin: row.linked_user_id ? adminSet.has(row.linked_user_id) : false,
      })),
    );
  };

  const fetchTasks = async () => {
    setLoading(true);
    const { data: taskRows, error: tasksError } = await db
      .from("tasks")
      .select("id, title, description, start_date, due_date, category, priority, status, created_at, updated_at, completed_at, created_by_user_id, assignment_mode")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (tasksError) {
      setLoading(false);
      setError("No se pudieron cargar las tareas.");
      return toast.error("No se pudieron cargar las tareas");
    }

    const rawTasks = (taskRows ?? []) as RawTask[];
    const taskIds = rawTasks.map((task) => task.id);

    let assignmentRows: Array<{ task_id: string; staff_id: string; completed_at: string | null }> = [];
    if (taskIds.length > 0) {
      const { data: assignments } = await db
        .from("task_assignments")
        .select("task_id, staff_id, completed_at")
        .in("task_id", taskIds);
      assignmentRows = (assignments ?? []) as typeof assignmentRows;
    }

    // Para tareas en modo 'all', sintetizamos asignados desde el directorio completo.
    const staffById = new Map(staff.map((person) => [person.id, person]));
    const myStaffId = user ? staff.find((person) => person.linked_user_id === user.id)?.id ?? null : null;

    // Privacidad calculada en cliente con la misma regla del backend
    const computeIsPrivate = (task: RawTask, assignees: TaskAssigneeBrief[]): boolean => {
      const creatorIsAdmin = staff.some((person) => person.linked_user_id === task.created_by_user_id && person.is_admin);
      if (!creatorIsAdmin) return false;
      if (assignees.length === 0) return false;
      const creatorAmong = assignees.some((assignee) => {
        const person = staffById.get(assignee.staff_id);
        return person?.linked_user_id === task.created_by_user_id;
      });
      if (!creatorAmong) return false;
      return assignees.every((assignee) => assignee.is_admin);
    };

    const built: TaskListItem[] = rawTasks.map((task) => {
      const taskAssignmentRows = assignmentRows.filter((row) => row.task_id === task.id);
      let assignees: TaskAssigneeBrief[];
      if (task.assignment_mode === "all") {
        // Por defecto todos. Si hay rows en task_assignments las usamos para saber completed_at por persona.
        const completedMap = new Map(taskAssignmentRows.map((row) => [row.staff_id, row.completed_at] as const));
        assignees = staff.map((person) => ({
          staff_id: person.id,
          full_name: person.full_name,
          is_admin: person.is_admin,
          completed_at: completedMap.get(person.id) ?? null,
        }));
      } else {
        assignees = taskAssignmentRows
          .map((row) => {
            const person = staffById.get(row.staff_id);
            if (!person) return null;
            return {
              staff_id: person.id,
              full_name: person.full_name,
              is_admin: person.is_admin,
              completed_at: row.completed_at,
            } as TaskAssigneeBrief;
          })
          .filter((value): value is TaskAssigneeBrief => Boolean(value));
      }

      const myAssignment = myStaffId ? assignees.find((assignee) => assignee.staff_id === myStaffId) : undefined;

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        start_date: task.start_date,
        priority: task.priority,
        status: task.status,
        category: task.category,
        created_at: task.created_at,
        updated_at: task.updated_at,
        completed_at: task.completed_at,
        assignment_mode: task.assignment_mode,
        is_private: computeIsPrivate(task, assignees),
        assignees,
        current_user_assignee_completed: Boolean(myAssignment?.completed_at),
        current_user_is_assignee: Boolean(myAssignment),
      };
    });

    setTasks(built);
    setError(null);
    setLoading(false);
  };

  const fetchEvents = async () => {
    const start = format(startOfMonth(month), "yyyy-MM-dd");
    const end = format(endOfMonth(month), "yyyy-MM-dd");
    const { data } = await db
      .from("calendar_events")
      .select("id, title, start_at")
      .gte("start_at", start)
      .lte("start_at", `${end}T23:59:59`);
    setEvents((data ?? []) as CalendarEventItem[]);
  };

  useEffect(() => {
    if (user) void fetchEvents();
  }, [month]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setComposerOpen(true);
  };

  const openEdit = (task: TaskListItem) => {
    setForm({
      title: task.title,
      description: task.description || "",
      labels: serializeTaskLabels(parseTaskLabels(task.category)),
      due_date: task.due_date || "",
      priority: task.priority,
      assignment_mode: task.assignment_mode,
      assignee_ids: task.assignment_mode === "all" ? [] : task.assignees.map((assignee) => assignee.staff_id),
    });
    setEditingId(task.id);
    setComposerOpen(true);
  };

  const submitTask = async (values: TaskComposerValues) => {
    if (!user || !values.title.trim()) return;
    if (!isAdmin) {
      toast.error("Solo administración puede crear tareas");
      return;
    }
    setSaving(true);

    const payload = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      category: serializeTaskLabels(parseTaskLabels(values.labels)) || null,
      due_date: values.due_date || null,
      priority: values.priority,
      created_by_user_id: user.id,
      assignment_mode: values.assignment_mode,
      // dejamos scope coherente con assignment_mode para mantener compatibilidad
      scope: values.assignment_mode === "all" ? "general" : "personal",
      // assigned_staff_id deprecado: lo dejamos null
      assigned_staff_id: null,
    };

    let taskId = editingId;
    if (editingId) {
      const { error: updateError } = await db.from("tasks").update(payload).eq("id", editingId);
      if (updateError) {
        setSaving(false);
        return toast.error("No se pudo editar la tarea");
      }
    } else {
      const { data: inserted, error: insertError } = await db
        .from("tasks")
        .insert({ ...payload, status: "planned" })
        .select("id")
        .single();
      if (insertError || !inserted) {
        setSaving(false);
        return toast.error("No se pudo crear la tarea");
      }
      taskId = inserted.id as string;
    }

    if (!taskId) {
      setSaving(false);
      return;
    }

    // Sincronizar task_assignments
    if (values.assignment_mode === "all") {
      // Borrar todos: los 14 quedan implícitos (pero queremos completed_at por persona;
      // crearemos rows on-demand al marcar completado).
      await db.from("task_assignments").delete().eq("task_id", taskId);
    } else {
      // Diff con los actuales
      const { data: currentRows } = await db.from("task_assignments").select("staff_id").eq("task_id", taskId);
      const current = new Set(((currentRows ?? []) as Array<{ staff_id: string }>).map((row) => row.staff_id));
      const next = new Set(values.assignee_ids);
      const toDelete = [...current].filter((id) => !next.has(id));
      const toAdd = [...next].filter((id) => !current.has(id));
      if (toDelete.length > 0) {
        await db.from("task_assignments").delete().eq("task_id", taskId).in("staff_id", toDelete);
      }
      if (toAdd.length > 0) {
        await db.from("task_assignments").insert(toAdd.map((staffId) => ({ task_id: taskId, staff_id: staffId })));
      }
    }

    setSaving(false);
    toast.success(editingId ? "Tarea actualizada" : "Tarea creada");
    resetForm();
    setComposerOpen(false);
    void fetchTasks();
  };

  const deleteTask = async (taskId: string) => {
    const { error: deleteError } = await db.from("tasks").delete().eq("id", taskId);
    if (deleteError) return toast.error("No se pudo eliminar la tarea");
    toast.success("Tarea eliminada");
    if (editingId === taskId) resetForm();
    void fetchTasks();
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<void> => {
    const { error: statusError } = await db
      .from("tasks")
      .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
      .eq("id", taskId);
    if (statusError) {
      toast.error("No se pudo actualizar la tarea");
      return;
    }
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, status, completed_at: status === "completed" ? new Date().toISOString() : null }
          : task,
      ),
    );
  };

  /**
   * Toggle de completado:
   * - Modo 'all': marca/desmarca completed_at en MI fila de task_assignments.
   * - Resto: cambia el estado global de la tarea.
   */
  const toggleComplete = async (task: TaskListItem) => {
    if (task.assignment_mode === "all") {
      const myStaffId = user ? staff.find((person) => person.linked_user_id === user.id)?.id : null;
      if (!myStaffId) {
        toast.error("No tienes ficha en el directorio");
        return;
      }
      const newCompleted = !task.current_user_assignee_completed;
      // Upsert manual: insert si no existe; update si existe.
      const { data: existing } = await db
        .from("task_assignments")
        .select("staff_id")
        .eq("task_id", task.id)
        .eq("staff_id", myStaffId)
        .maybeSingle();
      if (existing) {
        await db
          .from("task_assignments")
          .update({ completed_at: newCompleted ? new Date().toISOString() : null })
          .eq("task_id", task.id)
          .eq("staff_id", myStaffId);
      } else {
        await db.from("task_assignments").insert({
          task_id: task.id,
          staff_id: myStaffId,
          completed_at: newCompleted ? new Date().toISOString() : null,
        });
      }
      void fetchTasks();
      return;
    }
    await updateTaskStatus(task.id, task.status === "completed" ? "planned" : "completed");
  };

  const availableLabels = useMemo(
    () => Array.from(new Set(tasks.flatMap((task) => parseTaskLabels(task.category)))).sort((a, b) => a.localeCompare(b, "es")),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      let statusOk: boolean;
      if (activeStatusFilter === "active") {
        statusOk = task.status !== "completed" && task.status !== "cancelled";
      } else {
        statusOk = task.status === activeStatusFilter;
      }
      const labelOk = activeLabelFilter === "all" ? true : parseTaskLabels(task.category).includes(activeLabelFilter);
      const assigneeOk =
        activeAssigneeFilter === "all"
          ? true
          : task.assignees.some((assignee) => assignee.staff_id === activeAssigneeFilter);
      return statusOk && labelOk && assigneeOk;
    });
  }, [activeAssigneeFilter, activeLabelFilter, activeStatusFilter, tasks]);

  // Separamos: privadas en su propia sección (solo admins las verán por RLS)
  const privateTasks = useMemo(
    () => filteredTasks.filter((task) => task.is_private && task.status !== "completed" && task.status !== "cancelled"),
    [filteredTasks],
  );
  const activeTasks = useMemo(
    () => filteredTasks.filter((task) => !task.is_private && task.status !== "completed" && task.status !== "cancelled"),
    [filteredTasks],
  );
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === "completed"), [tasks]);

  const selectedDayTasks = useMemo(
    () => tasks.filter((task) => task.due_date && selectedDate && isSameDay(new Date(task.due_date), selectedDate)),
    [selectedDate, tasks],
  );
  const selectedDayEvents = useMemo(
    () => events.filter((event) => selectedDate && isSameDay(new Date(event.start_at), selectedDate)),
    [events, selectedDate],
  );
  const taskDates = useMemo(
    () => tasks.filter((task) => task.due_date).map((task) => new Date(task.due_date as string)),
    [tasks],
  );

  // Adaptador para TaskDetailDialog (espera el shape antiguo)
  const dialogTask: TaskDialogItem | null = useMemo(() => {
    if (!selectedTask) return null;
    return {
      id: selectedTask.id,
      title: selectedTask.title,
      description: selectedTask.description,
      due_date: selectedTask.due_date,
      start_date: selectedTask.start_date,
      priority: selectedTask.priority,
      status: selectedTask.status,
      category: selectedTask.category,
      created_at: selectedTask.created_at,
      updated_at: selectedTask.updated_at,
      completed_at: selectedTask.completed_at,
    };
  }, [selectedTask]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="Tareas"
        title={isAdmin ? "Tareas del equipo" : "Mis tareas"}
        description={
          isAdmin
            ? "Crea y reparte tareas individuales, en grupo o para toda la plantilla."
            : "Solo las tareas que la administración te ha asignado."
        }
        actions={
          isAdmin ? (
            <Button className="h-11 rounded-2xl" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nueva tarea
            </Button>
          ) : undefined
        }
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
              <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{activeTasks.length + privateTasks.length} activas</div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Filter className="h-4 w-4" /> Filtros
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveStatusFilter(filter.key)}
                    className={
                      activeStatusFilter === filter.key
                        ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                        : "rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground"
                    }
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              {!isSimple ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Select value={activeLabelFilter} onValueChange={setActiveLabelFilter}>
                    <SelectTrigger className="h-11 rounded-2xl">
                      <SelectValue placeholder="Etiqueta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las etiquetas</SelectItem>
                      {availableLabels.map((label) => (
                        <SelectItem key={label} value={label}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isAdmin ? (
                    <Select value={activeAssigneeFilter} onValueChange={setActiveAssigneeFilter}>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder="Asignado a" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todo el equipo</SelectItem>
                        {staff.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          {privateTasks.length > 0 ? (
            <TaskListSection
              title="Privadas"
              subtitle="Solo tú y los administradores incluidos las veis."
              tasks={privateTasks}
              loading={false}
              error={null}
              isAdmin={isAdmin}
              emptyTitle="Sin tareas privadas"
              emptyDescription="Aquí aparecerán las tareas privadas que crees con otros admins."
              onOpenTask={setSelectedTask}
              onEditTask={openEdit}
              onDeleteTask={(taskId) => void deleteTask(taskId)}
              onToggleComplete={(task) => void toggleComplete(task)}
            />
          ) : null}

          <TaskListSection
            title="Activas"
            subtitle="Solo lo que requiere acción ahora mismo."
            tasks={activeTasks}
            loading={loading}
            error={error}
            isAdmin={isAdmin}
            onOpenTask={setSelectedTask}
            onEditTask={openEdit}
            onDeleteTask={(taskId) => void deleteTask(taskId)}
            onToggleComplete={(task) => void toggleComplete(task)}
          />

          {completedTasks.length > 0 ? (
            <TaskListSection
              title="Completadas"
              subtitle="Historial reciente para revisar avances."
              tasks={completedTasks.slice(0, 8)}
              loading={false}
              error={null}
              isAdmin={isAdmin}
              onOpenTask={setSelectedTask}
              onEditTask={openEdit}
              onDeleteTask={(taskId) => void deleteTask(taskId)}
              onToggleComplete={(task) => void toggleComplete(task)}
            />
          ) : null}
        </div>

        {!isSimple ? (
          <div className="space-y-3">
            <section className="panel-surface p-4">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <p className="font-semibold text-foreground">Calendario del mes</p>
              </div>
              <div className="rounded-3xl border border-border bg-background p-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={month}
                  onMonthChange={setMonth}
                  locale={es}
                  modifiers={{ hasTask: taskDates }}
                  modifiersClassNames={{ hasTask: "bg-primary/15 text-foreground font-semibold" }}
                  className="w-full"
                />
              </div>
              <div className="mt-3 space-y-2">
                {selectedDate && <p className="text-sm font-medium text-foreground">{format(selectedDate, "EEEE d MMMM", { locale: es })}</p>}
                {selectedDayTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="block w-full rounded-2xl border border-border bg-background px-3 py-3 text-left text-sm text-foreground"
                  >
                    {task.title}
                    <span className="mt-1 block text-xs text-muted-foreground">{task.category || "Sin etiquetas"}</span>
                  </button>
                ))}
                {selectedDayEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl bg-muted px-3 py-3 text-sm text-foreground">
                    {event.title}
                  </div>
                ))}
                {selectedDayTasks.length === 0 && selectedDayEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay nada organizado para este día.</p>
                )}
              </div>
            </section>

            {isAdmin ? (
              <section className="panel-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Acción rápida</p>
                    <p className="text-xs text-muted-foreground">Crea trabajo nuevo sin perder tiempo.</p>
                  </div>
                  <Button variant="surface" className="h-11 rounded-2xl" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Crear
                  </Button>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </section>

      {isAdmin ? (
        <TaskComposerDialog
          open={composerOpen}
          editing={Boolean(editingId)}
          saving={saving}
          isAdmin={isAdmin}
          currentUserId={user?.id ?? null}
          staff={staff}
          initialValues={form}
          onOpenChange={(open) => {
            setComposerOpen(open);
            if (!open) resetForm();
          }}
          onSubmit={(values) => void submitTask(values)}
        />
      ) : null}

      <TaskDetailDialog
        open={Boolean(selectedTask)}
        task={dialogTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onStatusChange={updateTaskStatus}
      />
    </div>
  );
};

export default TaskHubView;
