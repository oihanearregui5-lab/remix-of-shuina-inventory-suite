import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, CalendarDays, CalendarRange, CheckCircle2, Clock3, FileText, Fuel, MessageSquareMore, ReceiptText, ShieldCheck, Siren, Users2, Wrench, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/shared/EmptyState";
import { buildClosureDates, NATIONAL_HOLIDAYS_BY_YEAR, resolveWorkerColor } from "@/lib/company-calendar";
import { toast } from "sonner";
import ExcelVacationPlanner from "@/components/admin/ExcelVacationPlanner";
import WorkerLiveStatusPanel from "@/components/shared/WorkerLiveStatusPanel";
import { useWorkerLiveStatus } from "@/hooks/useWorkerLiveStatus";
import WorkerProfileDialog from "@/components/staff/WorkerProfileDialog";
import HighlightComposerDialog, { type HighlightRecord } from "@/components/admin/HighlightComposerDialog";
import { Plus, Pencil } from "lucide-react";

interface AdminMetrics {
  openTasks: number;
  openIncidents: number;
  serviceItems: number;
  activeClockings: number;
  activeWorkReports: number;
  pendingVacations: number;
  channels: number;
  messagesToday: number;
}
interface DailyHighlight { id: string; title: string; summary: string | null; category: string; highlight_date: string }
interface VacationReviewItem { id: string; request_type: string; start_date: string; end_date: string; reason: string | null; requester_user_id: string; requester_name?: string | null }
interface CompanyCalendarDay { id: string; calendar_date: string; title: string; day_type: string; color_tag: string | null; notes: string | null }

const excelVacationLegend = ["ADRIAN", "AITOR", "ANDRIY", "FRAN", "HAMID", "JUAN", "LYUBEN", "MANUEL", "MISAEL", "NELO", "OLEK", "RAQUEL", "SILVIO"];

const AdminHubView = () => {
  const { canViewAdmin } = useAuth();
  const { items: liveWorkers, loading: liveWorkersLoading, summary: liveSummary } = useWorkerLiveStatus();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics>({ openTasks: 0, openIncidents: 0, serviceItems: 0, activeClockings: 0, activeWorkReports: 0, pendingVacations: 0, channels: 0, messagesToday: 0 });
  const [highlights, setHighlights] = useState<DailyHighlight[]>([]);
  const [pendingRequests, setPendingRequests] = useState<VacationReviewItem[]>([]);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [calendarDays, setCalendarDays] = useState<CompanyCalendarDay[]>([]);

  useEffect(() => {
    if (!canViewAdmin) return;
    void Promise.all([loadMetrics(), loadCalendarDays()]);
  }, [canViewAdmin]);

  const loadMetrics = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [tasksRes, incidentsRes, serviceRes, clockingsRes, highlightsRes, vacationRes, activeReportsRes, channelsRes, todayMessagesRes] = await Promise.all([
      supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "completed"),
      supabase.from("machine_incidents").select("id", { count: "exact", head: true }).neq("status", "resolved"),
      supabase.from("machine_service_records").select("id", { count: "exact", head: true }).neq("status", "completed"),
      supabase.from("time_entries").select("id", { count: "exact", head: true }).is("clock_out", null),
      supabase.from("daily_highlights").select("id, title, summary, category").order("highlight_date", { ascending: false }).limit(4),
      supabase.from("vacation_requests").select("id, request_type, start_date, end_date, reason, requester_user_id").eq("status", "pending").order("created_at", { ascending: true }).limit(8),
      supabase.from("work_reports").select("id", { count: "exact", head: true }).is("ended_at", null),
      supabase.from("chat_channels").select("id", { count: "exact", head: true }),
      supabase.from("chat_messages").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    ]);
    setMetrics({
      openTasks: tasksRes.count ?? 0,
      openIncidents: incidentsRes.count ?? 0,
      serviceItems: serviceRes.count ?? 0,
      activeClockings: clockingsRes.count ?? 0,
      activeWorkReports: activeReportsRes.count ?? 0,
      pendingVacations: vacationRes.data?.length ?? 0,
      channels: channelsRes.count ?? 0,
      messagesToday: todayMessagesRes.count ?? 0,
    });
    setHighlights((highlightsRes.data as DailyHighlight[]) ?? []);
    const baseRequests = (vacationRes.data as VacationReviewItem[]) ?? [];
    const requesterIds = Array.from(new Set(baseRequests.map((item) => item.requester_user_id)));
    const { data: profiles } = requesterIds.length ? await supabase.from("profiles").select("user_id, full_name").in("user_id", requesterIds) : { data: [] };
    const namesByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.full_name]));
    setPendingRequests(baseRequests.map((item) => ({ ...item, requester_name: namesByUserId.get(item.requester_user_id) ?? null })));
  };

  const loadCalendarDays = async () => {
    const { data } = await supabase.from("company_calendar_days").select("id, calendar_date, title, day_type, color_tag, notes").order("calendar_date", { ascending: true });
    setCalendarDays((data as CompanyCalendarDay[]) ?? []);
  };

  const pendingCount = useMemo(() => pendingRequests.length, [pendingRequests]);
  const calendarYear = selectedDate?.getFullYear() ?? new Date().getFullYear();
  const holidayDates = useMemo(() => NATIONAL_HOLIDAYS_BY_YEAR[calendarYear]?.map((item) => new Date(item.date)) ?? [], [calendarYear]);
  const closureDates = useMemo(() => buildClosureDates(calendarYear).map((item) => new Date(item)), [calendarYear]);
  const customDates = useMemo(() => calendarDays.filter((item) => item.day_type === "custom").map((item) => new Date(item.calendar_date)), [calendarDays]);
  const selectedDayItems = useMemo(() => {
    if (!selectedDate) return [];
    const selectedKey = format(selectedDate, "yyyy-MM-dd");
    const companyDay = calendarDays.filter((item) => item.calendar_date === selectedKey);
    const holidays = (NATIONAL_HOLIDAYS_BY_YEAR[calendarYear] ?? []).filter((item) => item.date === selectedKey).map((item) => ({ title: item.title, day_type: "holiday", notes: null }));
    const closures = buildClosureDates(calendarYear).includes(selectedKey) ? [{ title: "Cierre empresa", day_type: "closure", notes: "Cierre del 12 al 25" }] : [];
    return [...holidays, ...closures, ...companyDay];
  }, [calendarDays, calendarYear, selectedDate]);

  const vacationLegend = useMemo(() => excelVacationLegend.map((name) => ({ name, color: resolveWorkerColor(name) })), []);
  const adminAlerts = useMemo(() => {
    const alerts: Array<{ title: string; detail: string }> = [];
    if (metrics.activeClockings > metrics.activeWorkReports) alerts.push({ title: "Jornadas sin parte activo", detail: `${Math.max(0, metrics.activeClockings - metrics.activeWorkReports)} personas tienen fichaje abierto sin parte en curso.` });
    if (metrics.openIncidents > 0) alerts.push({ title: "Incidencias en seguimiento", detail: `${metrics.openIncidents} averías siguen abiertas y requieren revisión.` });
    if (metrics.pendingVacations > 0) alerts.push({ title: "Vacaciones pendientes", detail: `${metrics.pendingVacations} solicitudes esperan respuesta de administración.` });
    if (liveSummary.paused > 0) alerts.push({ title: "Operarios sin parte", detail: `${liveSummary.paused} personas están en jornada abierta sin actividad operativa vinculada.` });
    return alerts.slice(0, 4);
  }, [liveSummary.paused, metrics.activeClockings, metrics.activeWorkReports, metrics.openIncidents, metrics.pendingVacations]);

  const executivePulse = useMemo(() => [
    { label: "Trabajo activo", value: `${metrics.activeClockings} fichajes · ${metrics.activeWorkReports} partes`, icon: Clock3 },
    { label: "Riesgo técnico", value: `${metrics.openIncidents} incidencias · ${metrics.serviceItems} mantenimientos`, icon: Siren },
    { label: "Equipo", value: `${liveSummary.working} trabajando · ${liveSummary.off} fuera`, icon: Users2 },
    { label: "Comunicación", value: `${metrics.channels} canales · ${metrics.messagesToday} mensajes hoy`, icon: MessageSquareMore },
  ], [liveSummary.off, liveSummary.working, metrics.activeClockings, metrics.activeWorkReports, metrics.channels, metrics.messagesToday, metrics.openIncidents, metrics.serviceItems]);

  const reviewVacationRequest = async (requestId: string, status: "approved" | "rejected") => {
    const adminResponse = responseDrafts[requestId]?.trim() || null;
    const currentUser = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("vacation_requests").update({ status, admin_response: adminResponse, reviewed_at: new Date().toISOString(), reviewed_by_user_id: currentUser?.id ?? null }).eq("id", requestId);
    if (error) return toast.error("No se pudo revisar la solicitud");
    toast.success(status === "approved" ? "Solicitud aceptada" : "Solicitud declinada");
    setResponseDrafts((current) => ({ ...current, [requestId]: "" }));
    void loadMetrics();
  };

  if (!canViewAdmin) return <div className="panel-surface p-6 text-sm text-muted-foreground">Esta sección está reservada para administración.</div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader eyebrow="Administración" title="Dashboard" description="Vista clara para controlar fichajes, partes, gasolina, calendario y equipo desde un solo sitio." />
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="panel-surface p-4"><p className="text-sm text-muted-foreground">Fichajes activos</p><p className="mt-2 text-3xl font-bold text-foreground">{metrics.activeClockings}</p></div>
        <div className="panel-surface p-4"><p className="text-sm text-muted-foreground">Tareas abiertas</p><p className="mt-2 text-3xl font-bold text-foreground">{metrics.openTasks}</p></div>
        <div className="panel-surface p-4"><p className="text-sm text-muted-foreground">Averías pendientes</p><p className="mt-2 text-3xl font-bold text-foreground">{metrics.openIncidents}</p></div>
        <div className="panel-surface p-4"><p className="text-sm text-muted-foreground">Mantenimientos</p><p className="mt-2 text-3xl font-bold text-foreground">{metrics.serviceItems}</p></div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="panel-surface p-4">
          <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">Pulso ejecutivo</p></div>
          <div className="grid gap-3 md:grid-cols-2">
            {executivePulse.map((item) => {
              const Icon = item.icon;
              return <div key={item.label} className="rounded-xl border border-border bg-background px-4 py-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4 text-primary" /> {item.label}</div><p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p></div>;
            })}
          </div>
        </section>

        <section className="panel-surface p-4">
          <div className="mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">Radar de prioridades</p></div>
          <div className="space-y-2">
            {adminAlerts.length === 0 ? <div className="rounded-xl bg-muted px-4 py-6 text-sm text-muted-foreground">No hay alertas operativas destacadas ahora mismo.</div> : adminAlerts.map((alert) => <div key={alert.title} className="rounded-xl border border-border bg-background px-4 py-3"><p className="font-medium text-foreground">{alert.title}</p><p className="mt-1 text-sm text-muted-foreground">{alert.detail}</p></div>)}
          </div>
        </section>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="panel-surface p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><FileText className="h-4 w-4 text-primary" /> Partes de trabajo</div><p className="mt-2 text-sm text-foreground">Seguimiento rápido de partes con edición manual de horas y revisión centralizada.</p></div>
        <div className="panel-surface p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Fuel className="h-4 w-4 text-primary" /> Gasolina</div><p className="mt-2 text-sm text-foreground">Tarjetas claras, movimientos simples y exportación lista para administración.</p></div>
        <div className="panel-surface p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><ReceiptText className="h-4 w-4 text-primary" /> Albaranes</div><p className="mt-2 text-sm text-foreground">Módulo ya integrado en la estructura general para completarlo más adelante.</p></div>
        <div className="panel-surface p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarRange className="h-4 w-4 text-primary" /> Calendario</div><p className="mt-2 text-sm text-foreground">Vista central para vacaciones, jornadas y organización global del equipo.</p></div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="panel-surface p-4">
          <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><CalendarRange className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">Solicitudes pendientes</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">{pendingCount} pendientes</span></div>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <article key={request.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{request.requester_name ?? "Trabajador"}</p>
                    <p className="text-sm text-muted-foreground">{request.request_type} · {request.start_date} → {request.end_date}</p>
                  </div>
                  <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs text-foreground">Pendiente</span>
                </div>
                {request.reason && <p className="mt-2 text-sm text-foreground">{request.reason}</p>}
                <Textarea value={responseDrafts[request.id] ?? ""} onChange={(event) => setResponseDrafts((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Respuesta para aceptar o declinar" className="mt-3 min-h-20" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void reviewVacationRequest(request.id, "approved")}><CheckCircle2 className="h-4 w-4" /> Aceptar</Button>
                  <Button size="sm" variant="outline" onClick={() => void reviewVacationRequest(request.id, "rejected")}><XCircle className="h-4 w-4" /> Declinar</Button>
                </div>
              </article>
            ))}
            {pendingRequests.length === 0 && <div className="rounded-xl bg-muted px-4 py-6 text-sm text-muted-foreground">No hay solicitudes pendientes de revisión.</div>}
          </div>
        </section>

        <div className="space-y-3">
          <section className="panel-surface p-4">
            <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">Calendario general</p></div>
            <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
              <div className="rounded-2xl border border-border bg-background p-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{ holiday: holidayDates, closure: closureDates, custom: customDates }}
                  modifiersClassNames={{ holiday: "bg-destructive/15 text-destructive font-semibold", closure: "bg-secondary/25 text-secondary-foreground font-semibold", custom: "bg-primary/10 text-primary font-semibold" }}
                  className="w-full"
                />
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-destructive">Festivo</span>
                  <span className="rounded-full bg-secondary/25 px-2.5 py-1 text-secondary-foreground">Cierre empresa</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Editable</span>
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedDate ? format(selectedDate, "EEEE d MMMM yyyy", { locale: es }) : "Selecciona un día"}</p>
                  <p className="text-xs text-muted-foreground">Vista rápida del calendario corporativo.</p>
                </div>
                {selectedDayItems.length === 0 ? (
                  <EmptyState icon={CalendarDays} title="Día sin eventos" description="Aquí verás festivos, cierres y cambios cuando queden configurados." />
                ) : (
                  <div className="space-y-2">
                    {selectedDayItems.map((item, index) => (
                      <div key={`${item.title}-${index}`} className="rounded-xl border border-border bg-card px-3 py-3">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.day_type}</p>
                        {item.notes ? <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="panel-surface p-4">
            <div className="mb-4 flex items-center gap-2"><Users2 className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">Vacaciones del Excel</p></div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-wrap gap-2">
                  {vacationLegend.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground">
                      <span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-semibold text-foreground">Qué refleja esta sección</p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>• Referencia directa a las hojas <span className="text-foreground">GENERICO</span> y <span className="text-foreground">VACACIONES</span>.</li>
                    <li>• Base para asignar vacaciones, ausencias y colores por trabajador.</li>
                    <li>• Punto de control para trasladar después toda la edición fina desde administración.</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-semibold text-foreground">Resumen operativo cargado</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-muted px-3 py-3"><p className="text-muted-foreground">Hojas individuales</p><p className="mt-1 font-semibold text-foreground">12 trabajadores</p></div>
                    <div className="rounded-xl bg-muted px-3 py-3"><p className="text-muted-foreground">Cierre fábrica</p><p className="mt-1 font-semibold text-foreground">12 → 25 dic</p></div>
                    <div className="rounded-xl bg-muted px-3 py-3"><p className="text-muted-foreground">Festivos</p><p className="mt-1 font-semibold text-foreground">Nacionales marcados</p></div>
                    <div className="rounded-xl bg-muted px-3 py-3"><p className="text-muted-foreground">Vista objetivo</p><p className="mt-1 font-semibold text-foreground">General + personal</p></div>
                  </div>
                </div>
              </div>

              <ExcelVacationPlanner />
            </div>
          </section>

          <WorkerLiveStatusPanel items={liveWorkers} loading={liveWorkersLoading} onSelectWorker={setSelectedWorkerId} />
          <WorkerProfileDialog staffId={selectedWorkerId} open={Boolean(selectedWorkerId)} onOpenChange={(open) => !open && setSelectedWorkerId(null)} />

          <section className="panel-surface p-4">
            <div className="mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">Noticias y cambios del día</p></div>
            <div className="space-y-2">
              {highlights.map((item) => <div key={item.id} className="rounded-xl bg-muted px-4 py-3"><p className="font-medium text-foreground">{item.title}</p>{item.summary && <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>}</div>)}
              {highlights.length === 0 && <div className="rounded-xl bg-muted px-4 py-6 text-sm text-muted-foreground">Todavía no hay avisos cargados.</div>}
            </div>
          </section>

          <section className="panel-surface p-4">
            <div className="mb-4 flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">Resumen de control</p></div>
            <div className="space-y-2 text-sm text-foreground">
              <div className="rounded-xl bg-muted px-4 py-3">{liveSummary.working} trabajando ahora mismo.</div>
              <div className="rounded-xl bg-muted px-4 py-3">{liveSummary.paused} con jornada abierta sin parte activo.</div>
              <div className="rounded-xl bg-muted px-4 py-3">{liveSummary.off} fuera de jornada.</div>
              <div className="rounded-xl bg-muted px-4 py-3">{metrics.openTasks} tareas siguen abiertas.</div>
              <div className="rounded-xl bg-muted px-4 py-3">{metrics.openIncidents} incidencias siguen en seguimiento.</div>
              <div className="rounded-xl bg-muted px-4 py-3">{metrics.messagesToday} mensajes internos se han movido hoy.</div>
              <div className="rounded-xl bg-muted px-4 py-3">{metrics.pendingVacations} solicitudes de vacaciones siguen pendientes.</div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};

export default AdminHubView;