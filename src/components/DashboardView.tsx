import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bell, CalendarRange, CheckCircle2, ClipboardList, FileText, Inbox, LogIn, LogOut, MessageSquareMore, NotebookPen } from "lucide-react";
import { differenceInMinutes, format, isSameDay, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import WelcomeBanner from "@/components/shared/WelcomeBanner";
import SmartRemindersPanel from "@/components/shared/SmartRemindersPanel";
import MachineExpiriesWidget from "@/components/dashboard/MachineExpiriesWidget";
import DashboardTaskDialog from "@/components/tasks/DashboardTaskDialog";
import { useSmartReminders } from "@/hooks/useSmartReminders";
import { useClockEntry } from "@/hooks/useClockEntry";
import { useUIMode } from "@/hooks/useUIMode";
import { cn } from "@/lib/utils";

interface DashboardViewProps {
  onNavigate: (section: "fichajes" | "tasks" | "staff" | "chat" | "admin" | "gasoline" | "workReports" | "notes") => void;
  canViewAdmin: boolean;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  scope?: string | null;
}
interface ReportItem { id: string; description: string; started_at: string; ended_at: string | null; }
interface HighlightItem { id: string; title: string; summary: string | null; category: string; highlight_date: string; }

const DashboardView = ({ onNavigate, canViewAdmin }: DashboardViewProps) => {
  const { user, profile, isAdmin } = useAuth();
  const db = supabase as any;
  const { reminders } = useSmartReminders();
  const { isSimple } = useUIMode();
  const { activeEntry, loading: clockLoading, toggleClock } = useClockEntry();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [entries, setEntries] = useState<Array<{ clock_in: string; clock_out: string | null }>>([]);
  const [myStaffId, setMyStaffId] = useState<string | null>(null);
  const [completedAssignmentTaskIds, setCompletedAssignmentTaskIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const monthStart = startOfMonth(new Date()).toISOString();
      const [entriesRes, tasksRes, reportsRes, highlightsRes, staffRes] = await Promise.all([
        db.from("time_entries").select("clock_in, clock_out").gte("clock_in", monthStart).order("clock_in", { ascending: false }).limit(60),
        db.from("tasks").select("id, title, description, due_date, status, priority, scope").neq("status", "cancelled").order("due_date", { ascending: true, nullsFirst: false }).limit(20),
        db.from("work_reports").select("id, description, started_at, ended_at").order("started_at", { ascending: false }).limit(5),
        db.from("daily_highlights").select("id, title, summary, category, highlight_date").order("highlight_date", { ascending: false }).limit(4),
        db.from("staff_directory").select("id").eq("linked_user_id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      setEntries((entriesRes.data ?? []) as Array<{ clock_in: string; clock_out: string | null }>);
      setTasks((tasksRes.data ?? []) as TaskItem[]);
      setReports((reportsRes.data ?? []) as ReportItem[]);
      setHighlights((highlightsRes.data ?? []) as HighlightItem[]);
      const staffId = (staffRes.data?.id as string | undefined) ?? null;
      setMyStaffId(staffId);
      if (staffId) {
        const { data: assignRows } = await db
          .from("task_assignments")
          .select("task_id, completed_at")
          .eq("staff_id", staffId)
          .not("completed_at", "is", null);
        if (active) {
          setCompletedAssignmentTaskIds(new Set(((assignRows ?? []) as Array<{ task_id: string }>).map((row) => row.task_id)));
        }
      }
      setLoading(false);
    };
    void load();

    const channel = supabase
      .channel("dashboard-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "work_reports" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignments" }, () => void load())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [db, user]);

  const completeTask = async (taskId: string) => {
    if (!myStaffId) return;
    // Optimista
    setCompletedAssignmentTaskIds((current) => {
      const next = new Set(current);
      next.add(taskId);
      return next;
    });
    const { data: existing } = await db
      .from("task_assignments")
      .select("staff_id")
      .eq("task_id", taskId)
      .eq("staff_id", myStaffId)
      .maybeSingle();
    if (existing) {
      await db
        .from("task_assignments")
        .update({ completed_at: new Date().toISOString() })
        .eq("task_id", taskId)
        .eq("staff_id", myStaffId);
    } else {
      await db.from("task_assignments").insert({
        task_id: taskId,
        staff_id: myStaffId,
        completed_at: new Date().toISOString(),
      });
    }
  };

  const activeReport = useMemo(() => reports.find((report) => !report.ended_at) ?? null, [reports]);
  const today = new Date();
  const todayEntries = useMemo(() => entries.filter((entry) => isSameDay(new Date(entry.clock_in), today)), [entries, today]);
  const workedTodayMinutes = useMemo(
    () =>
      todayEntries.reduce(
        (total, entry) => total + Math.max(0, differenceInMinutes(entry.clock_out ? new Date(entry.clock_out) : new Date(), new Date(entry.clock_in))),
        0,
      ),
    [todayEntries],
  );
  const hours = Math.floor(workedTodayMinutes / 60);
  const minutes = workedTodayMinutes % 60;

  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.status !== "completed" && !completedAssignmentTaskIds.has(task.id)),
    [tasks, completedAssignmentTaskIds],
  );
  const tasksToday = useMemo(
    () => visibleTasks.filter((task) => task.due_date && isSameDay(new Date(task.due_date), today)),
    [visibleTasks, today],
  );
  const pendingTasks = useMemo(
    () => visibleTasks.filter((task) => !tasksToday.includes(task)).slice(0, isSimple ? 3 : 6),
    [visibleTasks, tasksToday, isSimple],
  );
  const todayHighlights = useMemo(() => highlights.filter((item) => isSameDay(new Date(item.highlight_date), today)), [highlights, today]);

  const greeting = profile?.full_name ? `Hola, ${profile.full_name.split(" ")[0]}` : "Hola";
  const clockSince = activeEntry ? format(new Date(activeEntry.clock_in), "HH:mm") : null;

  return (
    <div className="space-y-4 animate-fade-in">
      <WelcomeBanner />
      <PageHeader
        eyebrow="Bandeja de entrada"
        title={greeting}
        description="Lo que tienes que ver y hacer hoy. Solo lo que importa."
      />

      {!isSimple && reminders.length > 0 ? <SmartRemindersPanel reminders={reminders} onNavigate={onNavigate} /> : null}

      {/* Fichaje grande inline */}
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

        <Button
          type="button"
          onClick={() => void toggleClock()}
          disabled={clockLoading}
          className={cn(
            "h-20 w-full gap-3 rounded-2xl text-lg font-bold uppercase tracking-wide shadow-[var(--shadow-elevated)] md:h-24 md:text-xl",
            activeEntry
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "bg-success text-white hover:bg-success/90",
          )}
        >
          {activeEntry ? (
            <>
              <LogOut className="h-6 w-6 md:h-7 md:w-7" />
              <span className="flex flex-col items-start leading-tight">
                <span>Fichar salida</span>
                {clockSince && <span className="text-xs font-medium normal-case opacity-90">Desde las {clockSince}</span>}
              </span>
            </>
          ) : (
            <>
              <LogIn className="h-6 w-6 md:h-7 md:w-7" />
              <span>Fichar entrada</span>
            </>
          )}
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          💡 Tu fichaje queda registrado con fecha y hora. Si te equivocas, avisa a Raquel.
        </p>

        {!isSimple && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
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

            {canViewAdmin ? (
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
            ) : (
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="mb-2 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tareas hoy</span>
                </div>
                <p className="text-lg font-semibold text-foreground">{tasksToday.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tasksToday.length === 0 ? "Nada con fecha de hoy" : tasksToday[0]?.title}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* MIS TAREAS / PENDIENTES */}
      <section className="panel-surface p-5">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Mis tareas</h2>
              <p className="text-xs text-muted-foreground">
                {canViewAdmin ? "Próximas tareas asignadas a ti." : "Lo que la administración te ha asignado."}
              </p>
            </div>
          </div>
          {canViewAdmin ? (
            <Button variant="ghost" size="sm" onClick={() => onNavigate("tasks")}>
              Ver todas <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
        </header>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />)}
          </div>
        ) : pendingTasks.length === 0 && tasksToday.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No tienes tareas pendientes" description="Cuando te asignen trabajo aparecerá aquí." />
        ) : (
          <ul className="divide-y divide-border">
            {[...tasksToday, ...pendingTasks].slice(0, isSimple ? 5 : 10).map((task) => (
              <li key={task.id} className="flex items-center gap-3 py-3">
                <button
                  type="button"
                  onClick={() => void completeTask(task.id)}
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-border transition-colors hover:border-primary hover:bg-primary/10"
                  aria-label="Marcar como completada"
                >
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </button>
                <span className={`h-2 w-2 shrink-0 rounded-full ${task.priority === "urgent" || task.priority === "high" ? "bg-destructive" : "bg-primary/60"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                    {task.scope === "general" && (
                      <span className="shrink-0 rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
                        General
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {task.due_date ? format(new Date(task.due_date), "d MMM", { locale: es }) : "Sin fecha"} ·{" "}
                    {task.status === "in_progress" ? "En curso" : task.status === "blocked" ? "Bloqueada" : "Pendiente"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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

      {/* Vencimientos técnicos — admin/secretaría, modo completo */}
      {!isSimple && isAdmin && <MachineExpiriesWidget />}

      {/* Accesos rápidos compactos — solo modo completo */}
      {!isSimple && (
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
      )}
    </div>
  );
};

export default DashboardView;
