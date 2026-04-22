import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, CheckCircle2, Clock3, ShieldCheck, Truck, Users2, Wrench, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { complianceHighlights, machineSeed, staffSeed } from "@/data/transtubari";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AdminMetrics {
  openTasks: number;
  openIncidents: number;
  serviceItems: number;
  activeClockings: number;
}

interface DailyHighlight {
  id: string;
  title: string;
  summary: string | null;
  category: string;
}

interface VacationReviewItem {
  id: string;
  request_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  requester_user_id: string;
  requester_name?: string | null;
}

const AdminHubView = () => {
  const { isAdmin, canViewAdmin } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics>({
    openTasks: 0,
    openIncidents: 0,
    serviceItems: 0,
    activeClockings: 0,
  });
  const [highlights, setHighlights] = useState<DailyHighlight[]>([]);
  const [pendingRequests, setPendingRequests] = useState<VacationReviewItem[]>([]);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (canViewAdmin) {
      void loadMetrics();
    }
  }, [canViewAdmin]);

  const loadMetrics = async () => {
    const [tasksRes, incidentsRes, serviceRes, clockingsRes, highlightsRes, vacationRes] = await Promise.all([
      supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "completed"),
      supabase.from("machine_incidents").select("id", { count: "exact", head: true }).neq("status", "resolved"),
      supabase.from("machine_service_records").select("id", { count: "exact", head: true }).neq("status", "completed"),
      supabase.from("time_entries").select("id", { count: "exact", head: true }).is("clock_out", null),
      supabase.from("daily_highlights").select("id, title, summary, category").order("highlight_date", { ascending: false }).limit(4),
      supabase.from("vacation_requests").select("id, request_type, start_date, end_date, reason, requester_user_id").eq("status", "pending").order("created_at", { ascending: true }).limit(6),
    ]);

    setMetrics({
      openTasks: tasksRes.count ?? 0,
      openIncidents: incidentsRes.count ?? 0,
      serviceItems: serviceRes.count ?? 0,
      activeClockings: clockingsRes.count ?? 0,
    });
    setHighlights((highlightsRes.data as DailyHighlight[]) ?? []);

    const baseRequests = (vacationRes.data as VacationReviewItem[]) ?? [];
    const requesterIds = Array.from(new Set(baseRequests.map((item) => item.requester_user_id)));

    if (requesterIds.length === 0) {
      setPendingRequests([]);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", requesterIds);

    const namesByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.full_name]));
    setPendingRequests(baseRequests.map((item) => ({ ...item, requester_name: namesByUserId.get(item.requester_user_id) ?? null })));
  };

  const pendingCount = useMemo(() => pendingRequests.length, [pendingRequests]);

  const reviewVacationRequest = async (requestId: string, status: "approved" | "rejected") => {
    const adminResponse = responseDrafts[requestId]?.trim() || null;

    const { error } = await supabase
      .from("vacation_requests")
      .update({
        status,
        admin_response: adminResponse,
        reviewed_at: new Date().toISOString(),
        reviewed_by_user_id: canViewAdmin ? (await supabase.auth.getUser()).data.user?.id ?? null : null,
      })
      .eq("id", requestId);

    if (error) {
      toast.error("No se pudo revisar la solicitud");
      return;
    }

    toast.success(status === "approved" ? "Vacaciones aceptadas" : "Vacaciones rechazadas");
    setResponseDrafts((current) => ({ ...current, [requestId]: "" }));
    void loadMetrics();
  };

  if (!canViewAdmin) {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Esta sección solo está visible para jefes y encargados.</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Administración</h1>
        <p className="text-muted-foreground">Visión centralizada para responsables con control de personas, flota, tareas y cumplimiento.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm"><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4 text-primary" /> Fichajes activos</div><p className="text-3xl font-bold text-foreground">{metrics.activeClockings}</p></div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm"><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><CalendarRange className="h-4 w-4 text-secondary" /> Tareas abiertas</div><p className="text-3xl font-bold text-foreground">{metrics.openTasks}</p></div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm"><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4 text-warning" /> Averías pendientes</div><p className="text-3xl font-bold text-foreground">{metrics.openIncidents}</p></div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm"><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Wrench className="h-4 w-4 text-info" /> Mantenimientos</div><p className="text-3xl font-bold text-foreground">{metrics.serviceItems}</p><p className="mt-2 text-xs text-muted-foreground">{pendingCount} solicitudes pendientes</p></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><Users2 className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">Plantilla y responsables</h2></div>
          <div className="space-y-3">
            {staffSeed.map((person) => (
              <div key={person.name} className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{person.name}</p>
                  <p className="text-sm text-muted-foreground">{person.area}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${person.role === "manager" ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground"}`}>
                  {person.role === "manager" ? "Jefatura" : "Trabajador"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><CalendarRange className="h-4 w-4 text-secondary" /><h2 className="font-semibold text-foreground">Solicitudes por validar</h2></div>
              <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-medium text-foreground">{pendingCount} pendientes</span>
            </div>
            <div className="space-y-3">
              {pendingRequests.length === 0 && <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">No hay vacaciones pendientes de revisar.</div>}
              {pendingRequests.map((request) => (
                <div key={request.id} className="rounded-lg bg-muted p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{request.requester_name ?? "Trabajador"}</p>
                      <p className="text-sm text-muted-foreground">{request.request_type} · {request.start_date} → {request.end_date}</p>
                    </div>
                    <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-foreground">Pendiente</span>
                  </div>
                  {request.reason && <p className="mt-2 text-sm text-foreground">{request.reason}</p>}
                  <Textarea
                    value={responseDrafts[request.id] ?? ""}
                    onChange={(event) => setResponseDrafts((current) => ({ ...current, [request.id]: event.target.value }))}
                    placeholder="Observación para aceptar o declinar la solicitud"
                    className="mt-3 min-h-20 bg-background"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void reviewVacationRequest(request.id, "approved")}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Aceptar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void reviewVacationRequest(request.id, "rejected")}>
                      <XCircle className="mr-2 h-4 w-4" /> Declinar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">Puntos de control</h2></div>
            <div className="space-y-3">
              {complianceHighlights.map((item) => (
                <div key={item} className="rounded-lg bg-muted px-4 py-3 text-sm text-foreground">{item}</div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /><h2 className="font-semibold text-foreground">Noticias y cambios del día</h2></div>
            <div className="space-y-3">
              {highlights.length === 0 && <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">Todavía no hay avisos cargados.</div>}
              {highlights.map((item) => (
                <div key={item.id} className="rounded-lg bg-muted px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <span className="text-xs uppercase text-muted-foreground">{item.category}</span>
                  </div>
                  {item.summary && <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><Truck className="h-4 w-4 text-secondary" /><h2 className="font-semibold text-foreground">Resumen de flota</h2></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted px-4 py-4"><p className="text-sm text-muted-foreground">Unidades registradas</p><p className="mt-1 text-2xl font-bold text-foreground">{machineSeed.length}</p></div>
              <div className="rounded-lg bg-muted px-4 py-4"><p className="text-sm text-muted-foreground">En revisión</p><p className="mt-1 text-2xl font-bold text-foreground">{machineSeed.filter((machine) => machine.status === "maintenance" || machine.status === "inspection").length}</p></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminHubView;