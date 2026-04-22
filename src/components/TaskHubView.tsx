import { useEffect, useMemo, useState } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, CheckCircle2, Circle, ClipboardList, Flag, Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "planned" | "in_progress" | "blocked" | "completed" | "cancelled";
  created_at: string;
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

const TaskHubView = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      void Promise.all([fetchTasks(), fetchEvents()]);
    }
  }, [user]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, description, due_date, priority, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("No se pudieron cargar las tareas");
      return;
    }

    setTasks((data as TaskItem[]) ?? []);
  };

  const fetchEvents = async () => {
    const today = new Date().toISOString();
    const { data, error } = await supabase
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

    const { error } = await supabase.from("tasks").insert({
      title: taskTitle.trim(),
      description: taskDescription.trim() || null,
      due_date: taskDate || null,
      priority: "medium",
      status: "planned",
      created_by_user_id: user.id,
    });

    if (error) {
      toast.error("No se pudo crear la tarea");
    } else {
      toast.success("Tarea creada");
      setTaskTitle("");
      setTaskDate("");
      setTaskDescription("");
      await fetchTasks();
    }

    setSaving(false);
  };

  const createEvent = async () => {
    if (!user || !eventTitle.trim() || !eventDate) return;
    setSaving(true);

    const { error } = await supabase.from("calendar_events").insert({
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
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);

    if (error) {
      toast.error("No se pudo actualizar la tarea");
      return;
    }

    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));
  };

  const pendingTasks = useMemo(() => tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === "completed"), [tasks]);
  const todayTasks = useMemo(
    () => pendingTasks.filter((task) => task.due_date && isToday(new Date(task.due_date))),
    [pendingTasks]
  );
  const upcomingTasks = useMemo(
    () => pendingTasks.filter((task) => task.due_date && !isToday(new Date(task.due_date))).slice(0, 6),
    [pendingTasks]
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Tareas y agenda</h1>
        <p className="text-muted-foreground">Planificación diaria tipo lista inteligente con fechas clave, prioridades y seguimiento personal.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><ClipboardList className="h-4 w-4 text-primary" /> Pendientes</div>
          <p className="text-3xl font-bold text-foreground">{pendingTasks.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><Flag className="h-4 w-4 text-secondary" /> Para hoy</div>
          <p className="text-3xl font-bold text-foreground">{todayTasks.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> Completadas</div>
          <p className="text-3xl font-bold text-foreground">{completedTasks.length}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">Mis tareas</h2>
                <p className="text-sm text-muted-foreground">Organiza trabajo realizado, pendiente y próximas entregas.</p>
              </div>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_180px]">
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Añadir nueva tarea" />
              <Input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
              <div className="md:col-span-2">
                <Textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="Detalles, pasos, materiales o notas" className="min-h-24" />
              </div>
              <Button onClick={createTask} disabled={saving || !taskTitle.trim()} className="md:col-span-2 justify-center">
                <Plus className="mr-2 h-4 w-4" /> Crear tarea
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Prioridad inmediata</h3>
                {todayTasks.length === 0 && <p className="rounded-lg bg-muted px-4 py-5 text-sm text-muted-foreground">No hay tareas con vencimiento para hoy.</p>}
                {todayTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{task.title}</p>
                        {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}
                      </div>
                      <span className="rounded-full bg-secondary/20 px-2 py-1 text-xs font-medium text-secondary-foreground">{priorityLabel[task.priority]}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => updateTaskStatus(task.id, "in_progress")}>En curso</Button>
                      <Button size="sm" onClick={() => updateTaskStatus(task.id, "completed")}>Completar</Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Próximas</h3>
                {upcomingTasks.length === 0 && <p className="rounded-lg bg-muted px-4 py-5 text-sm text-muted-foreground">No hay próximas tareas programadas.</p>}
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">{task.title}</p>
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {task.due_date ? format(new Date(task.due_date), "EEEE d MMM", { locale: es }) : "Sin fecha"}
                      {task.due_date && isTomorrow(new Date(task.due_date)) ? " · Mañana" : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">Fechas señaladas</h2></div>
            <div className="space-y-3">
              <Input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Ej. ITV camión, revisión médica o cursillo" />
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
                    <span className="text-xs font-medium uppercase text-muted-foreground">{event.event_type.replaceAll("_", " ")}</span>
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
  );
};

export default TaskHubView;