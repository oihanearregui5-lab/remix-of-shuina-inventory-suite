import { useEffect, useMemo, useState } from "react";
import { format, isPast, isSameDay, isToday, isTomorrow, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, CheckCircle2, ClipboardList, Flag, History, Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import TaskDetailDialog, { type TaskDialogItem } from "@/components/tasks/TaskDetailDialog";
import { toast } from "sonner";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
  category: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "planned" | "in_progress" | "blocked" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface CalendarItem {
  id: string;
  title: string;
  start_at: string;
  event_type: string;
  description: string | null;
}

const priorityLabel: Record<TaskItem["priority"], string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const statusActions: Array<{ label: string; value: TaskItem["status"] }> = [
  { label: "Pendiente", value: "planned" },
  { label: "En curso", value: "in_progress" },
  { label: "Bloqueada", value: "blocked" },
  { label: "Completada", value: "completed" },
];

const TaskHubView = () => {
  const { user } = useAuth();
  const db = supabase as any;
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskStartDate, setTaskStartDate] = useState<Date | undefined>();
  const [taskDate, setTaskDate] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskCategory, setTaskCategory] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"pending" | "today" | "completed" | "history">("pending");
  const [selectedTask, setSelectedTask] = useState<TaskDialogItem | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (user) {
      void Promise.all([fetchTasks(), fetchEvents()]);
    }
  }, [user]);

  const fetchTasks = async () => {
    const { data, error } = await db
      .from("tasks")
      .select("id, title, description, start_date, due_date, category, priority, status, created_at, updated_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast.error("No se pudieron cargar las tareas");
      return;
    }

    setTasks((data as TaskItem[]) ?? []);
  };

  const fetchEvents = async () => {
    const today = new Date().toISOString();
    const { data, error } = await db
      .from("calendar_events")
      .select("id, title, start_at, event_type, description")
      .gte("start_at", today)
      .order("start_at", { ascending: true })
      .limit(12);

    if (error) {
      toast.error("No se pudieron cargar las fechas");
      return;
    }

    setEvents((data as CalendarItem[]) ?? []);
  };

  const createTask = async () => {
    if (!user || !taskTitle.trim()) return;
    setSaving(true);

    const { error } = await db.from("tasks").insert({
      title: taskTitle.trim(),
      description: taskDescription.trim() || null,
      start_date: taskStartDate ? format(taskStartDate, "yyyy-MM-dd") : null,
      due_date: taskDate || null,
      category: taskCategory.trim() || null,
      priority: isToday(new Date(taskDate || new Date())) ? "high" : "medium",
      status: "planned",
      created_by_user_id: user.id,
    });

    if (error) {
      toast.error("No se pudo crear la tarea");
    } else {
      toast.success("Tarea creada");
      setTaskTitle("");
      setTaskStartDate(undefined);
      setTaskDate("");
      setTaskDescription("");
      setTaskCategory("");
      await fetchTasks();
    }

    setSaving(false);
  };

  const createEvent = async () => {
    if (!user || !eventTitle.trim() || !eventDate) return;
    setSaving(true);

    const { error } = await db.from("calendar_events").insert({
      title: eventTitle.trim(),
      description: eventDescription.trim() || null,
      start_at: new Date(eventDate).toISOString(),
      all_day: true,
      event_type: "personal",
      created_by_user_id: user.id,
    });

    if (error) {
      toast.error("No se pudo guardar la fecha señalada");
    } else {
      toast.success("Fecha guardada");
      setEventTitle("");
      setEventDate("");
      setEventDescription("");
      await fetchEvents();
    }

    setSaving(false);
  };

  const updateTaskStatus = async (taskId: string, status: TaskItem["status"]) => {
    const payload = {
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    };

    const { error } = await db.from("tasks").update(payload).eq("id", taskId);

    if (error) {
      toast.error("No se pudo actualizar la tarea");
      return;
    }

    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status, completed_at: payload.completed_at, updated_at: new Date().toISOString() } : task)));
    setSelectedTask((current) => (current && current.id === taskId ? { ...current, status, completed_at: payload.completed_at, updated_at: new Date().toISOString() } : current));
  };

  const pendingTasks = useMemo(() => tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === "completed"), [tasks]);
  const todayTasks = useMemo(() => pendingTasks.filter((task) => task.due_date && isToday(new Date(task.due_date))), [pendingTasks]);
  const historyTasks = useMemo(() => tasks.filter((task) => task.due_date && isPast(new Date(task.due_date)) && task.status !== "completed"), [tasks]);
  const monthItems = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);

    return {
      tasks: tasks.filter((task) => {
        if (!task.due_date) return false;
        const date = new Date(task.due_date);
        return date >= monthStart && date <= monthEnd;
      }),
      events: events.filter((event) => {
        const date = new Date(event.start_at);
        return date >= monthStart && date <= monthEnd;
      }),
    };
  }, [calendarMonth, events, tasks]);

  const selectedDateItems = useMemo(() => {
    if (!selectedCalendarDate) return { tasks: [], events: [] };

    return {
      tasks: tasks.filter((task) => task.due_date && isSameDay(new Date(task.due_date), selectedCalendarDate)),
      events: events.filter((event) => isSameDay(new Date(event.start_at), selectedCalendarDate)),
    };
  }, [events, selectedCalendarDate, tasks]);

  const taskDates = useMemo(() => tasks.filter((task) => task.due_date).map((task) => new Date(task.due_date as string)), [tasks]);
  const eventDates = useMemo(() => events.map((event) => new Date(event.start_at)), [events]);
  const visibleTasks = useMemo(() => {
    switch (activeFilter) {
      case "today":
        return todayTasks;
      case "completed":
        return completedTasks;
      case "history":
        return historyTasks;
      case "pending":
      default:
        return pendingTasks;
    }
  }, [activeFilter, pendingTasks, todayTasks, completedTasks, historyTasks]);

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Tareas y agenda</h1>
        <p className="text-muted-foreground">Ahora puedes pulsar en pendientes, ver el historial y mover cada tarea por su estado real.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <button onClick={() => setActiveFilter("pending")} className={`rounded-lg border p-5 text-left shadow-sm transition-colors ${activeFilter === "pending" ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><ClipboardList className="h-4 w-4 text-primary" /> Pendientes</div>
          <p className="text-3xl font-bold text-foreground">{pendingTasks.length}</p>
        </button>
        <button onClick={() => setActiveFilter("today")} className={`rounded-lg border p-5 text-left shadow-sm transition-colors ${activeFilter === "today" ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><Flag className="h-4 w-4 text-secondary" /> Para hoy</div>
          <p className="text-3xl font-bold text-foreground">{todayTasks.length}</p>
        </button>
        <button onClick={() => setActiveFilter("completed")} className={`rounded-lg border p-5 text-left shadow-sm transition-colors ${activeFilter === "completed" ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> Completadas</div>
          <p className="text-3xl font-bold text-foreground">{completedTasks.length}</p>
        </button>
        <button onClick={() => setActiveFilter("history")} className={`rounded-lg border p-5 text-left shadow-sm transition-colors ${activeFilter === "history" ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><History className="h-4 w-4 text-warning" /> Historial</div>
          <p className="text-3xl font-bold text-foreground">{historyTasks.length}</p>
        </button>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">Mis tareas</h2>
                <p className="text-sm text-muted-foreground">Pulsa un bloque superior para filtrar y entra en detalle del estado.</p>
              </div>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_180px]">
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Añadir nueva tarea" />
              <Input value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)} placeholder="Categoría o frente" />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {taskStartDate ? format(taskStartDate, "d MMM yyyy", { locale: es }) : "Inicio"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={taskStartDate} onSelect={setTaskStartDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
              <div className="md:col-span-2">
                <Textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="Detalles, pasos, materiales u observaciones" className="min-h-24" />
              </div>
              <Button onClick={createTask} disabled={saving || !taskTitle.trim()} className="md:col-span-2 justify-center">
                <Plus className="mr-2 h-4 w-4" /> Crear tarea
              </Button>
            </div>

            <div className="space-y-3">
              {visibleTasks.length === 0 && <p className="rounded-lg bg-muted px-4 py-5 text-sm text-muted-foreground">No hay tareas en este estado.</p>}
              {visibleTasks.map((task) => (
                <button key={task.id} type="button" onClick={() => setSelectedTask(task)} className="w-full rounded-lg border border-border bg-background p-4 text-left transition-colors hover:bg-muted/40">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{task.title}</p>
                      {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {task.due_date ? format(new Date(task.due_date), "EEEE d MMM", { locale: es }) : "Sin fecha"}
                        {task.due_date && isTomorrow(new Date(task.due_date)) ? " · Mañana" : ""}
                        {task.category ? ` · ${task.category}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary/20 px-2 py-1 text-xs font-medium text-secondary-foreground">{priorityLabel[task.priority]}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {statusActions.map((action) => (
                      <Button key={action.value} size="sm" variant={task.status === action.value ? "default" : "outline"} onClick={(event) => { event.stopPropagation(); void updateTaskStatus(task.id, action.value); }}>
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">Calendario mensual</h2>
                <p className="text-sm text-muted-foreground">Vista interactiva para editar, revisar carga del mes y abrir el detalle por día.</p>
              </div>
              <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                {monthItems.tasks.length} tareas · {monthItems.events.length} fechas
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
              <div className="overflow-hidden rounded-lg border border-border bg-background p-3">
                <Calendar
                  mode="single"
                  selected={selectedCalendarDate}
                  onSelect={setSelectedCalendarDate}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  modifiers={{
                    hasTask: taskDates,
                    hasEvent: eventDates,
                  }}
                  modifiersClassNames={{
                    hasTask: "bg-primary/15 text-foreground font-semibold",
                    hasEvent: "ring-1 ring-secondary",
                  }}
                  className="w-full"
                />
              </div>

              <div className="space-y-4 rounded-lg border border-border bg-background p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedCalendarDate ? format(selectedCalendarDate, "EEEE d MMMM yyyy", { locale: es }) : "Selecciona un día"}</p>
                  <p className="text-xs text-muted-foreground">Pulsa en una fecha del calendario para ver lo planificado y abrir detalle.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tareas del día</p>
                    <div className="space-y-2">
                      {selectedDateItems.tasks.length === 0 && <p className="text-sm text-muted-foreground">Sin tareas para este día.</p>}
                      {selectedDateItems.tasks.map((task) => (
                        <button key={task.id} type="button" onClick={() => setSelectedTask(task)} className="w-full rounded-lg border border-border bg-card px-3 py-3 text-left">
                          <p className="font-medium text-foreground">{task.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{priorityLabel[task.priority]} · {task.category || "General"}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fechas señaladas</p>
                    <div className="space-y-2">
                      {selectedDateItems.events.length === 0 && <p className="text-sm text-muted-foreground">Sin eventos para este día.</p>}
                      {selectedDateItems.events.map((event) => (
                        <div key={event.id} className="rounded-lg border border-border bg-card px-3 py-3">
                          <p className="font-medium text-foreground">{event.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{event.event_type.split("_").join(" ")}</p>
                          {event.description && <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">Fechas señaladas</h2></div>
            <div className="space-y-3">
              <Input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Ej. ITV, revisión médica o cursillo" />
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              <Textarea value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} placeholder="Notas de la fecha importante" className="min-h-20" />
              <Button onClick={createEvent} disabled={saving || !eventTitle.trim() || !eventDate} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Guardar fecha
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-secondary" /><h2 className="font-semibold text-foreground">Agenda próxima</h2></div>
            <div className="space-y-3">
              {events.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay fechas registradas.</p>}
              {events.map((event) => (
                <div key={event.id} className="rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{event.title}</p>
                    <span className="text-xs font-medium uppercase text-muted-foreground">{event.event_type.split("_").join(" ")}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{format(new Date(event.start_at), "EEEE d MMMM yyyy", { locale: es })}</p>
                  {event.description && <p className="mt-2 text-sm text-foreground">{event.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
    <TaskDetailDialog open={Boolean(selectedTask)} task={selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)} onStatusChange={updateTaskStatus} />
  );
};

export default TaskHubView;