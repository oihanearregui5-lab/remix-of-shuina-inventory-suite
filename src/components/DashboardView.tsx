import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bell, CalendarRange, CheckCircle2, ClipboardList, Clock3, FileText, Inbox, MessageSquareMore, NotebookPen, Scale, Truck, AlertTriangle } from "lucide-react";
import { differenceInMinutes, format, isSameDay, startOfMonth, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import SmartRemindersPanel from "@/components/shared/SmartRemindersPanel";
import { useSmartReminders } from "@/hooks/useSmartReminders";

interface DashboardViewProps {
  onNavigate: (section: "fichajes" | "tasks" | "staff" | "chat" | "admin" | "gasoline" | "workReports" | "notes" | "tonnage" | "machines") => void;
  canViewAdmin: boolean;
}

interface TimeEntryItem { id: string; clock_in: string; clock_out: string | null; }
interface TaskItem { id: string; title: string; due_date: string | null; status: string; priority: string; }
interface ReportItem { id: string; description: string; started_at: string; ended_at: string | null; }
interface HighlightItem { id: string; title: string; summary: string | null; category: string; highlight_date: string; }
interface TripItem { id: string; trip_date: string; trip_time: string | null; weight_kg: number; truck_label?: string; }
interface MachineAlertItem { id: string; type: "incident" | "itv" | "inspection"; machine: string; label: string; date?: string | null; }

const DashboardView = ({ onNavigate }: DashboardViewProps) => {
  const { user, profile } = useAuth();
  const db = supabase as any;
  const { reminders } = useSmartReminders();
  const { notifications, unreadCount } = useNotifications();
  const [entries, setEntries] = useState<TimeEntryItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [machineAlerts, setMachineAlerts] = useState<MachineAlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const monthStart = startOfMonth(new Date()).toISOString();
      const todayStr = new Date().toISOString().slice(0, 10);
      const horizonStr = addDays(new Date(), 30).toISOString().slice(0, 10);

      const [entriesRes, tasksRes, reportsRes, highlightsRes, tripsRes, incidentsRes, machinesRes] = await Promise.all([
        db.from("time_entries").select("id, clock_in, clock_out").gte("clock_in", monthStart).order("clock_in", { ascending: false }).limit(20),
        db.from("tasks").select("id, title, due_date, status, priority").neq("status", "cancelled").order("due_date", { ascending: true, nullsFirst: false }).limit(15),
        db.from("work_reports").select("id, description, started_at, ended_at").order("started_at", { ascending: false }).limit(5),
        db.from("daily_highlights").select("id, title, summary, category, highlight_date").order("highlight_date", { ascending: false }).limit(4),
        db.from("tonnage_trips").select("id, trip_date, trip_time, weight_kg, tonnage_trucks(label)").order("trip_date", { ascending: false }).order("trip_time", { ascending: false, nullsFirst: false }).limit(4),
        db.from("machine_incidents").select("id, title, status, machine_id, machine_assets(display_name)").eq("status", "open").order("created_at", { ascending: false }).limit(5),
        db.from("machine_assets").select("id, display_name, next_itv_date, next_inspection_date").or(`next_itv_date.lte.${horizonStr},next_inspection_date.lte.${horizonStr}`).gte("status", "active").limit(10),
      ]);
      if (!active) return;

      setEntries((entriesRes.data ?? []) as TimeEntryItem[]);
      setTasks((tasksRes.data ?? []) as TaskItem[]);
      setReports((reportsRes.data ?? []) as ReportItem[]);
      setHighlights((highlightsRes.data ?? []) as HighlightItem[]);
      setTrips(((tripsRes.data ?? []) as Array<{ id: string; trip_date: string; trip_time: string | null; weight_kg: number; tonnage_trucks?: { label: string } | null }>).map((t) => ({
        id: t.id,
        trip_date: t.trip_date,
        trip_time: t.trip_time,
        weight_kg: Number(t.weight_kg ?? 0),
        truck_label: t.tonnage_trucks?.label,
      })));

      // Construir alertas de máquinas
      const alerts: MachineAlertItem[] = [];
      ((incidentsRes.data ?? []) as Array<{ id: string; title: string; machine_assets?: { display_name: string } | null }>).forEach((inc) => {
        alerts.push({ id: `inc-${inc.id}`, type: "incident", machine: inc.machine_assets?.display_name ?? "Máquina", label: inc.title });
      });
      ((machinesRes.data ?? []) as Array<{ id: string; display_name: string; next_itv_date: string | null; next_inspection_date: string | null }>).forEach((m) => {
        if (m.next_itv_date && m.next_itv_date <= horizonStr) {
          alerts.push({ id: `itv-${m.id}`, type: "itv", machine: m.display_name, label: m.next_itv_date >= todayStr ? "ITV próxima" : "ITV vencida", date: m.next_itv_date });
        }
        if (m.next_inspection_date && m.next_inspection_date <= horizonStr) {
          alerts.push({ id: `insp-${m.id}`, type: "inspection", machine: m.display_name, label: m.next_inspection_date >= todayStr ? "Inspección próxima" : "Inspección vencida", date: m.next_inspection_date });
        }
      });
      setMachineAlerts(alerts.slice(0, 6));

      setLoading(false);
    };
    void load();

    const channel = supabase
      .channel("dashboard-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "work_reports" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "tonnage_trips" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "machine_incidents" }, () => void load())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [db, user]);

  const activeEntry = useMemo(() => entries.find((entry) => !entry.clock_out) ?? null, [entries]);
  const activeReport = useMemo(() => reports.find((report) => !report.ended_at) ?? null, [reports]);
  const today = new Date();
  const todayEntries = useMemo(() => entries.filter((entry) => isSameDay(new Date(entry.clock_in), today)), [entries, today]);
  const workedTodayMinutes = useMemo(() => todayEntries.reduce((total, entry) => total + Math.max(0, differenceInMinutes(entry.clock_out ? new Date(entry.clock_out) : new Date(), new Date(entry.clock_in))), 0), [todayEntries]);
  const hours = Math.floor(workedTodayMinutes / 60);
  const minutes = workedTodayMinutes % 60;

  const tasksToday = useMemo(() => tasks.filter((task) => task.due_date && isSameDay(new Date(task.due_date), today) && task.status !== "completed"), [tasks, today]);
  const pendingTasks = useMemo(() => tasks.filter((task) => task.status !== "completed" && !tasksToday.includes(task)).slice(0, 6), [tasks, tasksToday]);
  const todayHighlights = useMemo(() => highlights.filter((item) => isSameDay(new Date(item.highlight_date), today)), [highlights, today]);
  const recentNotifications = useMemo(() => notifications.slice(0, 4), [notifications]);

  const greeting = profile?.full_name ? `Hola, ${profile.full_name.split(" ")[0]}` : "Hola";

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        eyebrow="Bandeja de entrada"
        title={greeting}
        description="Lo que tienes que ver y hacer hoy. Solo lo que importa."
        actions={
          <Button size="lg" onClick={() => onNavigate("fichajes")} className="min-w-[180px]">
            <Clock3 className="h-4 w-4" />
            {activeEntry ? "Volver a fichar" : "Fichar ahora"}
          </Button>
        }
      />

      {reminders.length > 0 ? <SmartRemindersPanel reminders={reminders} onNavigate={onNavigate} /> : null}

      {/* HOY */}
      <section className="panel-surface p-5">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Hoy</h2>
              <p className="text-xs text-muted-foreground">{format(today, "EEEE d 'de' MMMM", { locale: es })}</p>
            </div>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {hours}h {minutes}m trabajadas
          </span>
        </header>

        <div className="grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => onNavigate("fichajes")}
            className="rounded-2xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/40"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${activeEntry ? "bg-destructive" : "bg-muted-foreground/40"}`} />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Jornada</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{activeEntry ? "Activa" : "Sin abrir"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeEntry ? `Desde las ${format(new Date(activeEntry.clock_in), "HH:mm")}` : "Pulsa para fichar entrada"}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("workReports")}
            className="rounded-2xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/40"
          >
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Parte</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{activeReport ? "En curso" : "Sin parte"}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {activeReport?.description || (activeEntry ? "Empieza un parte para registrar el trabajo" : "Abre la jornada primero")}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("tasks")}
            className="rounded-2xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/40"
          >
            <div className="mb-2 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tareas hoy</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{tasksToday.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tasksToday.length === 0 ? "Nada con fecha de hoy" : tasksToday[0]?.title}
            </p>
          </button>
        </div>
      </section>

      {/* PENDIENTES + NOTIFICACIONES */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel-surface p-5">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold text-foreground">Pendientes</h2>
                <p className="text-xs text-muted-foreground">Próximas tareas asignadas a ti.</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("tasks")}>
              Ver todas <ArrowRight className="h-4 w-4" />
            </Button>
          </header>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />)}
            </div>
          ) : pendingTasks.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Todo al día" description="No tienes tareas pendientes asignadas." />
          ) : (
            <ul className="divide-y divide-border">
              {pendingTasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate("tasks")}
                    className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${task.priority === "urgent" || task.priority === "high" ? "bg-destructive" : "bg-primary/60"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.due_date ? format(new Date(task.due_date), "d MMM", { locale: es }) : "Sin fecha"} · {task.status === "in_progress" ? "En curso" : task.status === "blocked" ? "Bloqueada" : "Pendiente"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel-surface p-5">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold text-foreground">Notificaciones</h2>
                <p className="text-xs text-muted-foreground">{unreadCount > 0 ? `${unreadCount} sin leer` : "Al día"}</p>
              </div>
            </div>
          </header>

          {recentNotifications.length === 0 ? (
            <EmptyState icon={Bell} title="Sin notificaciones" description="Las novedades del equipo aparecerán aquí." />
          ) : (
            <ul className="divide-y divide-border">
              {recentNotifications.map((n) => (
                <li key={n.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-muted-foreground/40" : "bg-primary"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                      {n.body ? <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p> : null}
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {format(new Date(n.created_at), "d MMM HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ÚLTIMOS VIAJES + ALERTAS MÁQUINAS */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel-surface p-5">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold text-foreground">Últimos viajes</h2>
                <p className="text-xs text-muted-foreground">Toneladas registradas recientemente.</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("tonnage")}>
              Ver todos <ArrowRight className="h-4 w-4" />
            </Button>
          </header>

          {trips.length === 0 ? (
            <EmptyState icon={Truck} title="Sin viajes" description="Aún no se han registrado viajes recientes." />
          ) : (
            <ul className="divide-y divide-border">
              {trips.map((trip) => (
                <li key={trip.id} className="flex items-center gap-3 py-3">
                  <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {trip.truck_label ?? "Camión"} · {(trip.weight_kg / 1000).toFixed(2).replace(".", ",")} t
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(trip.trip_date), "d MMM", { locale: es })}{trip.trip_time ? ` · ${trip.trip_time.slice(0, 5)}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel-surface p-5">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold text-foreground">Alertas de máquinas</h2>
                <p className="text-xs text-muted-foreground">Incidencias abiertas e ITV/inspecciones próximas.</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("machines")}>
              Ver flota <ArrowRight className="h-4 w-4" />
            </Button>
          </header>

          {machineAlerts.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Todo en orden" description="Sin incidencias ni revisiones pendientes." />
          ) : (
            <ul className="divide-y divide-border">
              {machineAlerts.map((alert) => (
                <li key={alert.id} className="flex items-center gap-3 py-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${alert.type === "incident" ? "bg-destructive" : "bg-warning"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{alert.machine}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.label}{alert.date ? ` · ${format(new Date(alert.date), "d MMM yyyy", { locale: es })}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* AVISOS */}
      <section className="panel-surface p-5">
        <header className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Avisos</h2>
            <p className="text-xs text-muted-foreground">Novedades y notas relevantes para el equipo.</p>
          </div>
        </header>

        {todayHighlights.length === 0 && highlights.length === 0 ? (
          <EmptyState icon={MessageSquareMore} title="Sin avisos" description="Cuando haya novedades importantes aparecerán aquí." />
        ) : (
          <div className="space-y-2">
            {(todayHighlights.length > 0 ? todayHighlights : highlights.slice(0, 3)).map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {item.category}
                  </span>
                </div>
                {item.summary ? <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Accesos rápidos compactos */}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Button variant="outline" size="lg" className="justify-between" onClick={() => onNavigate("workReports")}>
          <span className="flex items-center gap-2"><FileText className="h-4 w-4" />Parte</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="lg" className="justify-between" onClick={() => onNavigate("chat")}>
          <span className="flex items-center gap-2"><MessageSquareMore className="h-4 w-4" />Chat</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="lg" className="justify-between" onClick={() => onNavigate("notes")}>
          <span className="flex items-center gap-2"><NotebookPen className="h-4 w-4" />Mi espacio</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="lg" className="justify-between" onClick={() => onNavigate("staff")}>
          <span className="flex items-center gap-2"><CalendarRange className="h-4 w-4" />Calendario</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </section>
    </div>
  );
};

export default DashboardView;
