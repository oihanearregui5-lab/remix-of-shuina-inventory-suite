import { useEffect, useMemo, useState } from "react";
import { Clock3, Hammer, PauseCircle, PencilLine, PlayCircle, TimerReset } from "lucide-react";
import { differenceInSeconds, formatDistanceStrict } from "date-fns";
import { es } from "date-fns/locale";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type WorkReport = {
  id: string;
  user_id: string;
  worker_name: string;
  action: string | null;
  description: string;
  machine: string | null;
  observations: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

type DraftState = {
  workerName: string;
  action: string;
  description: string;
  machine: string;
  observations: string;
  startedAt: string;
  endedAt: string;
};

const machineOptions = [
  "VOLVO 360",
  "VOLVO 360 + ERKAT",
  "VOLVO 360 + EXCENTRIC",
  "VOLVO 150",
  "VOLVO 180",
  "PATACABRA",
  "2200 SM",
  "2200 HOLANDESA",
  "7050 KCZ",
  "9508DPB",
  "5480 JXP",
  "3932 JJD",
  "DAEWOO",
  "DAEWOO + PICA PICA",
  "KOMATZU",
  "BOBCAT",
  "Otras",
];

const actionOptions = ["Producción", "Carga", "Descarga", "Mantenimiento", "Traslado", "Apoyo", "Incidencia", "Otra"];

const draftSchema = z.object({
  workerName: z.string().trim().min(1, "Indica el trabajador").max(120, "Nombre demasiado largo"),
  action: z.string().trim().max(120, "Acción demasiado larga"),
  description: z.string().trim().min(3, "Describe la tarea").max(1200, "Descripción demasiado larga"),
  machine: z.string().trim().max(120, "Maquinaria demasiado larga"),
  observations: z.string().trim().max(2000, "Observaciones demasiado largas"),
  startedAt: z.string().min(1, "Indica la hora de inicio"),
  endedAt: z.string(),
}).superRefine((value, ctx) => {
  const start = new Date(value.startedAt);
  const end = value.endedAt ? new Date(value.endedAt) : null;
  if (Number.isNaN(start.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startedAt"], message: "Hora de inicio no válida" });
  }
  if (end && Number.isNaN(end.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endedAt"], message: "Hora de fin no válida" });
  }
  if (end && !Number.isNaN(start.getTime()) && end < start) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endedAt"], message: "La hora de fin no puede ser anterior al inicio" });
  }
});

const toLocalInputValue = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

const buildInitialDraft = (workerName: string): DraftState => ({
  workerName,
  action: "",
  description: "",
  machine: "",
  observations: "",
  startedAt: toLocalInputValue(new Date()),
  endedAt: "",
});

interface WorkReportsHubViewProps {
  isAdminView?: boolean;
}

const WorkReportsHubView = ({ isAdminView = false }: WorkReportsHubViewProps) => {
  const { profile, user, role } = useAuth();
  const db = supabase as any;
  const defaultWorkerName = profile?.full_name ?? "Trabajador";
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [draft, setDraft] = useState<DraftState>(() => buildInitialDraft(defaultWorkerName));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const canManageAll = role === "admin" || role === "secretary";

  const loadReports = async () => {
    if (!user) return;
    setLoading(true);
    let query = db
      .from("work_reports")
      .select("id, user_id, worker_name, action, description, machine, observations, started_at, ended_at, created_at, updated_at")
      .order("ended_at", { ascending: true, nullsFirst: true })
      .order("started_at", { ascending: false });

    if (!isAdminView || !canManageAll) {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("No se pudieron cargar los partes");
      setLoading(false);
      return;
    }

    setReports((data ?? []) as WorkReport[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadReports();
  }, [user, isAdminView, canManageAll]);

  const activeReport = useMemo(() => reports.find((report) => !report.ended_at) ?? null, [reports]);

  useEffect(() => {
    if (!activeReport) return;
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeReport]);

  useEffect(() => {
    if (activeReport) {
      setDraft({
        workerName: activeReport.worker_name,
        action: activeReport.action ?? "",
        description: activeReport.description,
        machine: activeReport.machine ?? "",
        observations: activeReport.observations ?? "",
        startedAt: toLocalInputValue(activeReport.started_at),
        endedAt: "",
      });
      return;
    }

    if (!editingId) {
      setDraft(buildInitialDraft(defaultWorkerName));
    }
  }, [activeReport?.id, defaultWorkerName, editingId]);

  const elapsedLabel = activeReport
    ? formatDistanceStrict(new Date(activeReport.started_at), new Date(tick), { locale: es, unit: "second" })
    : null;

  const completedReports = reports.filter((report) => report.ended_at).sort((a, b) => (b.ended_at ?? "").localeCompare(a.ended_at ?? ""));
  const activeDurationMinutes = activeReport ? Math.max(0, Math.floor(differenceInSeconds(new Date(tick), new Date(activeReport.started_at)) / 60)) : 0;

  const parseDraft = () => {
    const result = draftSchema.safeParse(draft);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Revisa los datos del parte");
      return null;
    }
    return result.data;
  };

  const getErrorMessage = (message: string) => {
    if (message.includes("idx_work_reports_single_open_per_user")) return "Ya tienes un parte en curso. Finalízalo antes de iniciar otro.";
    if (message.includes("ended_at cannot be earlier than started_at")) return "La hora de fin no puede ser anterior al inicio.";
    if (message.includes("description is required")) return "La descripción es obligatoria.";
    if (message.includes("worker_name is required")) return "El trabajador es obligatorio.";
    return "No se pudo guardar el parte.";
  };

  const startReport = async () => {
    if (!user) return;
    const parsed = parseDraft();
    if (!parsed) return;

    const { error } = await db.from("work_reports").insert({
      user_id: user.id,
      worker_name: parsed.workerName,
      action: parsed.action || null,
      description: parsed.description,
      machine: parsed.machine || null,
      observations: parsed.observations || null,
      started_at: new Date(parsed.startedAt).toISOString(),
    });

    if (error) {
      toast.error(getErrorMessage(error.message ?? ""));
      return;
    }

    toast.success("Parte iniciado");
    setDraft(buildInitialDraft(parsed.workerName));
    void loadReports();
  };

  const finishReport = async () => {
    if (!activeReport) return;
    const parsed = parseDraft();
    if (!parsed) return;

    const { error } = await db
      .from("work_reports")
      .update({
        worker_name: parsed.workerName,
        action: parsed.action || null,
        description: parsed.description,
        machine: parsed.machine || null,
        observations: parsed.observations || null,
        started_at: new Date(parsed.startedAt).toISOString(),
        ended_at: parsed.endedAt ? new Date(parsed.endedAt).toISOString() : new Date().toISOString(),
      })
      .eq("id", activeReport.id);

    if (error) {
      toast.error(getErrorMessage(error.message ?? ""));
      return;
    }

    toast.success("Parte finalizado");
    setDraft(buildInitialDraft(defaultWorkerName));
    void loadReports();
  };

  const openEdit = (report: WorkReport) => {
    setEditingId(report.id);
    setDraft({
      workerName: report.worker_name,
      action: report.action ?? "",
      description: report.description,
      machine: report.machine ?? "",
      observations: report.observations ?? "",
      startedAt: toLocalInputValue(report.started_at),
      endedAt: report.ended_at ? toLocalInputValue(report.ended_at) : "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const parsed = parseDraft();
    if (!parsed) return;

    const { error } = await db
      .from("work_reports")
      .update({
        worker_name: parsed.workerName,
        action: parsed.action || null,
        description: parsed.description,
        machine: parsed.machine || null,
        observations: parsed.observations || null,
        started_at: new Date(parsed.startedAt).toISOString(),
        ended_at: parsed.endedAt ? new Date(parsed.endedAt).toISOString() : null,
      })
      .eq("id", editingId);

    if (error) {
      toast.error(getErrorMessage(error.message ?? ""));
      return;
    }

    toast.success("Parte actualizado");
    setEditingId(null);
    setDraft(buildInitialDraft(defaultWorkerName));
    void loadReports();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow={isAdminView ? "Administración" : "Operativa"}
        title="Parte de trabajo"
        description={isAdminView ? "Control real de partes con edición manual, validaciones y seguimiento fiable." : "Flujo rápido para iniciar, retomar y finalizar tareas sin errores típicos del día a día."}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Estado actual</p><p className="mt-2 text-lg font-semibold text-foreground">{activeReport ? "En curso" : "Sin parte activo"}</p></div>
        <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Historial</p><p className="mt-2 text-lg font-semibold text-foreground">{completedReports.length} cerrados</p></div>
        <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Edición manual</p><p className="mt-2 text-lg font-semibold text-foreground">Disponible</p></div>
      </section>

      {loading ? <div className="space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted/60" />)}</div> : null}

      {!loading && activeReport ? (
        <Card className="border-primary/25 bg-primary/5 shadow-[var(--shadow-soft)]">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg"><PlayCircle className="h-5 w-5 text-primary" /> Parte en curso</CardTitle>
            <p className="text-sm text-muted-foreground">Un único parte activo por persona, tiempo en vivo y corrección manual para evitar olvidos o cierres incoherentes.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-card px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Trabajador</p><p className="mt-1 font-semibold text-foreground">{activeReport.worker_name}</p></div>
              <div className="rounded-xl bg-card px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Inicio</p><p className="mt-1 font-semibold text-foreground">{new Date(activeReport.started_at).toLocaleString("es-ES")}</p></div>
              <div className="rounded-xl border border-primary/20 bg-card px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tiempo en vivo</p><p className="mt-1 text-lg font-semibold text-foreground">{elapsedLabel}</p></div>
              <div className="rounded-xl bg-card px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Duración aprox.</p><p className="mt-1 font-semibold text-foreground">{activeDurationMinutes} min</p></div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="active-start">Hora de inicio editable</Label><Input id="active-start" type="datetime-local" value={draft.startedAt} onChange={(event) => setDraft((current) => ({ ...current, startedAt: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="active-end">Hora de fin editable</Label><Input id="active-end" type="datetime-local" value={draft.endedAt} onChange={(event) => setDraft((current) => ({ ...current, endedAt: event.target.value }))} /></div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-1"><Label htmlFor="active-worker">Trabajador</Label><Input id="active-worker" value={draft.workerName} onChange={(event) => setDraft((current) => ({ ...current, workerName: event.target.value }))} /></div>
              <div className="space-y-2 xl:col-span-1"><Label htmlFor="active-action">Acción</Label><Input id="active-action" list="work-actions" value={draft.action} onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))} /></div>
              <div className="space-y-2 xl:col-span-2"><Label htmlFor="active-machine">Maquinaria</Label><Input id="active-machine" list="work-machines" value={draft.machine} onChange={(event) => setDraft((current) => ({ ...current, machine: event.target.value }))} /></div>
            </div>

            <div className="space-y-2"><Label htmlFor="active-description">Descripción de tarea</Label><Textarea id="active-description" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="active-observations">Observaciones</Label><Textarea id="active-observations" value={draft.observations} onChange={(event) => setDraft((current) => ({ ...current, observations: event.target.value }))} /></div>

            <div className="flex flex-wrap gap-2">
              <Button size="lg" className="min-h-12 min-w-[220px]" onClick={() => void finishReport()}><PauseCircle className="h-4 w-4" /> Finalizar parte</Button>
              <Button variant="outline" size="lg" onClick={() => setDraft((current) => ({ ...current, endedAt: toLocalInputValue(new Date()) }))}><TimerReset className="h-4 w-4" /> Ajustar fin a ahora</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !activeReport ? (
        <Card className="shadow-[var(--shadow-soft)]">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Hammer className="h-5 w-5 text-primary" /> Crear parte</CardTitle>
            <p className="text-sm text-muted-foreground">Solo lo necesario para arrancar. Si luego te olvidas de cerrar, podrás corregir la hora real.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-1"><Label htmlFor="report-worker">Trabajador</Label><Input id="report-worker" value={draft.workerName} onChange={(event) => setDraft((current) => ({ ...current, workerName: event.target.value }))} /></div>
              <div className="space-y-2 xl:col-span-1"><Label htmlFor="report-action">Acción</Label><Input id="report-action" list="work-actions" placeholder="Selecciona o escribe" value={draft.action} onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))} /></div>
              <div className="space-y-2 xl:col-span-2"><Label htmlFor="report-machine">Maquinaria de trabajo</Label><Input id="report-machine" list="work-machines" placeholder="Selecciona o escribe" value={draft.machine} onChange={(event) => setDraft((current) => ({ ...current, machine: event.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="report-description">Descripción de tarea</Label><Textarea id="report-description" placeholder="Qué vas a hacer, en qué zona o con qué objetivo" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="report-start">Hora de inicio</Label><Input id="report-start" type="datetime-local" value={draft.startedAt} onChange={(event) => setDraft((current) => ({ ...current, startedAt: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="report-observations">Observaciones iniciales</Label><Textarea id="report-observations" className="min-h-[44px]" placeholder="Opcional" value={draft.observations} onChange={(event) => setDraft((current) => ({ ...current, observations: event.target.value }))} /></div>
            </div>
            <Button size="lg" className="min-h-12 min-w-[220px]" onClick={() => void startReport()}><PlayCircle className="h-4 w-4" /> Iniciar parte</Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-lg"><Clock3 className="h-5 w-5 text-primary" /> Historial de partes</CardTitle>
          <p className="text-sm text-muted-foreground">Historial simple, claro y preparado para revisar o corregir sin entrar en pantallas extra.</p>
        </CardHeader>
        <CardContent>
          {loading ? null : completedReports.length === 0 ? (
            <EmptyState icon={Clock3} title="Todavía no hay partes cerrados" description="Cuando cierres los primeros partes aparecerán aquí listos para revisar y corregir horas si hace falta." />
          ) : (
            <div className="space-y-3">
              {completedReports.map((report) => {
                const duration = report.ended_at ? formatDistanceStrict(new Date(report.started_at), new Date(report.ended_at), { locale: es }) : "";
                const isEditing = editingId === report.id;
                return (
                  <article key={report.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{report.description || "Parte sin descripción"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{report.worker_name} · {report.action || "Sin acción"} · {report.machine || "Sin maquinaria"}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => (isEditing ? void saveEdit() : openEdit(report))}><PencilLine className="h-4 w-4" /> {isEditing ? "Guardar" : "Editar"}</Button>
                    </div>
                    {isEditing ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2"><Label>Hora inicio</Label><Input type="datetime-local" value={draft.startedAt} onChange={(event) => setDraft((current) => ({ ...current, startedAt: event.target.value }))} /></div>
                        <div className="space-y-2"><Label>Hora fin</Label><Input type="datetime-local" value={draft.endedAt} onChange={(event) => setDraft((current) => ({ ...current, endedAt: event.target.value }))} /></div>
                        <div className="space-y-2 md:col-span-2"><Label>Observaciones</Label><Textarea value={draft.observations} onChange={(event) => setDraft((current) => ({ ...current, observations: event.target.value }))} /></div>
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                        <div className="rounded-xl bg-muted/45 px-3 py-2"><span className="text-muted-foreground">Inicio</span><p className="mt-1 font-semibold text-foreground">{new Date(report.started_at).toLocaleString("es-ES")}</p></div>
                        <div className="rounded-xl bg-muted/45 px-3 py-2"><span className="text-muted-foreground">Fin</span><p className="mt-1 font-semibold text-foreground">{report.ended_at ? new Date(report.ended_at).toLocaleString("es-ES") : "—"}</p></div>
                        <div className="rounded-xl bg-muted/45 px-3 py-2"><span className="text-muted-foreground">Duración</span><p className="mt-1 font-semibold text-foreground">{duration}</p></div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <datalist id="work-machines">{machineOptions.map((machine) => <option key={machine} value={machine} />)}</datalist>
      <datalist id="work-actions">{actionOptions.map((action) => <option key={action} value={action} />)}</datalist>
    </div>
  );
};

export default WorkReportsHubView;