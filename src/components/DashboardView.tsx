import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarRange, CheckCircle2, Clock3, ClipboardList, MessageSquareMore } from "lucide-react";
import { differenceInMinutes, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import MetricCard from "@/components/shared/MetricCard";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

interface DashboardViewProps {
  onNavigate: (section: "fichajes" | "tasks" | "staff" | "chat" | "admin") => void;
  canViewAdmin: boolean;
}

interface TimeEntryItem { id: string; clock_in: string; clock_out: string | null; created_at: string; }
interface TaskItem { id: string; title: string; due_date: string | null; status: string; priority: string; }
interface RequestItem { id: string; request_type: string; start_date: string; end_date: string; status: string; }
interface HighlightItem { id: string; title: string; summary: string | null; category: string; }

const DashboardView = ({ onNavigate, canViewAdmin }: DashboardViewProps) => {
  const { user, profile } = useAuth();
  const db = supabase as any;
  const [entries, setEntries] = useState<TimeEntryItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
      const [entriesRes, tasksRes, requestsRes, highlightsRes] = await Promise.all([
        db.from("time_entries").select("id, clock_in, clock_out, created_at").order("clock_in", { ascending: false }).limit(12),
        db.from("tasks").select("id, title, due_date, status, priority").order("due_date", { ascending: true }).limit(8),
        db.from("vacation_requests").select("id, request_type, start_date, end_date, status").order("created_at", { ascending: false }).limit(6),
        db.from("daily_highlights").select("id, title, summary, category").gte("created_at", weekStart).order("highlight_date", { ascending: false }).limit(4),
      ]);
      setEntries(entriesRes.data ?? []);
      setTasks(tasksRes.data ?? []);
      setRequests(requestsRes.data ?? []);
      setHighlights(highlightsRes.data ?? []);
      setLoading(false);
    };
    void load();
  }, [db, user]);

  const activeEntry = useMemo(() => entries.find((entry) => !entry.clock_out) ?? null, [entries]);
  const todayEntries = useMemo(() => {
    const today = new Date().toDateString();
    return entries.filter((entry) => new Date(entry.clock_in).toDateString() === today);
  }, [entries]);
  const workedTodayMinutes = useMemo(() => todayEntries.reduce((total, entry) => total + Math.max(0, differenceInMinutes(entry.clock_out ? new Date(entry.clock_out) : new Date(), new Date(entry.clock_in))), 0), [todayEntries]);
  const pendingTasks = useMemo(() => tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled"), [tasks]);
  const pendingRequests = useMemo(() => requests.filter((request) => request.status === "pending"), [requests]);
  const latestEntry = entries[0] ?? null;
  const hours = Math.floor(workedTodayMinutes / 60);
  const minutes = workedTodayMinutes % 60;

  return (
    <div className="space-y-4 animate-fade-in md:space-y-6">
      <PageHeader
        eyebrow="Inicio"
        breadcrumbs={["Inicio"]}
        title={`Hola${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        description="Tu estado, tu siguiente paso y poco más."
        actions={<Button size="lg" className="min-w-[160px] flex-1 sm:flex-none" onClick={() => onNavigate("fichajes")}><Clock3 className="h-4 w-4" />{activeEntry ? "Volver a fichar" : "Fichar"}</Button>}
      />

      <section className="hero-surface overflow-hidden rounded-[20px] px-4 py-4 md:px-6 md:py-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm"><span className={`h-2.5 w-2.5 rounded-full ${activeEntry ? "bg-destructive" : "bg-muted-foreground/40"}`} />{activeEntry ? "Trabajando" : "Fuera de jornada"}</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/80 bg-background/88 p-4 shadow-[var(--shadow-soft)]"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Estado</p><p className="mt-2 text-base font-semibold text-foreground">{activeEntry ? "Activo" : "Sin iniciar"}</p></div>
            <div className="rounded-xl border border-border/80 bg-background/88 p-4 shadow-[var(--shadow-soft)]"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Hoy</p><p className="mt-2 text-base font-semibold text-foreground">{hours}h {minutes}m</p></div>
            <div className="rounded-xl border border-border/80 bg-background/88 p-4 shadow-[var(--shadow-soft)]"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Último</p><p className="mt-2 text-base font-semibold text-foreground">{latestEntry ? format(new Date(latestEntry.clock_in), "HH:mm", { locale: es }) : "Sin registros"}</p></div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button className="justify-between" size="lg" onClick={() => onNavigate("fichajes")}>{activeEntry ? "Registrar salida" : "Registrar entrada"}<ArrowRight className="h-4 w-4" /></Button>
            <Button variant="outline" className="justify-between" size="lg" onClick={() => onNavigate("staff")}>Turnos y vacaciones<ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Jornada actual" value={activeEntry ? "Activa" : "Sin iniciar"} hint={activeEntry ? `Desde las ${format(new Date(activeEntry.clock_in), "HH:mm", { locale: es })}` : "Aún no has fichado hoy"} icon={Clock3} tone={activeEntry ? "danger" : "primary"} onClick={() => onNavigate("fichajes")} />
        <MetricCard title="Tareas abiertas" value={pendingTasks.length} hint="Pendientes o en curso" icon={ClipboardList} tone="secondary" onClick={() => onNavigate("tasks")} />
        <MetricCard title="Solicitudes" value={requests.length} hint={`${pendingRequests.length} pendientes de revisión`} icon={CalendarRange} tone="success" onClick={() => onNavigate("staff")} />
        <MetricCard title="Avisos operativos" value={highlights.length} hint="Cambios y noticias del día" icon={ShieldAlert} tone="warning" onClick={() => onNavigate(canViewAdmin ? "admin" : "chat")} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr] md:gap-6">
        <div className="panel-surface space-y-4 p-4 md:space-y-5 md:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-foreground">Actividad reciente</h2><p className="text-sm text-muted-foreground">Resumen visible de tus últimos movimientos para trabajar con confianza.</p></div><Button variant="outline" onClick={() => onNavigate("fichajes")}>Ver historial</Button></div>
          {loading ? <div className="space-y-3">{[0,1,2].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-muted/70" />)}</div> : entries.length === 0 ? <EmptyState icon={Clock3} title="Todavía no hay fichajes" description="Cuando registres tu primera entrada aparecerá aquí tu historial reciente con horas y duración." /> : <div className="space-y-3">{entries.slice(0,5).map((entry) => { const duration = differenceInMinutes(entry.clock_out ? new Date(entry.clock_out) : new Date(), new Date(entry.clock_in)); return <div key={entry.id} className="rounded-lg border border-border/80 bg-background px-4 py-4 transition-colors hover:bg-muted/35"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-medium text-foreground">{format(new Date(entry.clock_in), "EEEE d MMMM", { locale: es })}</p><p className="text-sm text-muted-foreground">Entrada {format(new Date(entry.clock_in), "HH:mm", { locale: es })}{entry.clock_out ? ` · Salida ${format(new Date(entry.clock_out), "HH:mm", { locale: es })}` : " · En curso"}</p></div><div className="text-sm font-medium text-foreground">{Math.floor(duration / 60)}h {duration % 60}m</div></div></div>; })}</div>}
        </div>

        <div className="space-y-4 md:space-y-6">
          <section className="panel-surface space-y-4 p-4 md:p-6">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-foreground">Próximas tareas</h2><p className="text-sm text-muted-foreground">Lo más urgente del área operativa.</p></div><ClipboardList className="h-5 w-5 text-primary" /></div>
            {pendingTasks.length === 0 ? <EmptyState icon={CheckCircle2} title="Todo al día" description="No hay tareas abiertas ahora mismo. El siguiente trabajo aparecerá aquí automáticamente." /> : <div className="space-y-3">{pendingTasks.slice(0,4).map((task) => <button key={task.id} type="button" onClick={() => onNavigate("tasks")} className="w-full rounded-lg border border-border/80 bg-background px-4 py-4 text-left transition-all hover:border-primary/20 hover:bg-muted/35"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-foreground">{task.title}</p><p className="mt-1 text-sm text-muted-foreground">{task.due_date ? format(new Date(task.due_date), "d MMM yyyy", { locale: es }) : "Sin fecha asignada"}</p></div><span className="rounded-full bg-secondary/25 px-2.5 py-1 text-xs font-medium text-secondary-foreground">{task.priority}</span></div></button>)}</div>}
          </section>

          <section className="panel-surface space-y-4 p-4 md:p-6">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-foreground">Noticias y cambios del día</h2><p className="text-sm text-muted-foreground">Mensajes importantes para plantilla y responsables.</p></div><MessageSquareMore className="h-5 w-5 text-primary" /></div>
            {highlights.length === 0 ? <EmptyState icon={Sparkles} title="Sin avisos nuevos" description="Cuando administración publique novedades operativas o cambios del día aparecerán aquí." /> : <div className="space-y-3">{highlights.map((item) => <div key={item.id} className="rounded-lg border border-border/80 bg-background px-4 py-4"><div className="flex items-center justify-between gap-3"><p className="font-medium text-foreground">{item.title}</p><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{item.category}</span></div>{item.summary ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p> : null}</div>)}</div>}
          </section>
        </div>
      </section>
    </div>
  );
};

export default DashboardView;
