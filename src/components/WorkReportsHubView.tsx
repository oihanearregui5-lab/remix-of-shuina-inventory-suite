import { useEffect, useMemo, useState } from "react";
import { Clock3, Hammer, PauseCircle, PencilLine, PlayCircle, TimerReset } from "lucide-react";
import { differenceInSeconds, formatDistanceStrict } from "date-fns";
import { es } from "date-fns/locale";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

type WorkReport = {
  id: string;
  workerName: string;
  action: string;
  description: string;
  machine: string;
  observations: string;
  startedAt: string;
  endedAt: string | null;
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

const STORAGE_KEY = "transtubari-work-reports";

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
  const { profile } = useAuth();
  const defaultWorkerName = profile?.full_name ?? "Trabajador";
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [draft, setDraft] = useState<DraftState>(() => buildInitialDraft(defaultWorkerName));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as WorkReport[];
      setReports(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  const activeReport = useMemo(() => reports.find((report) => !report.endedAt) ?? null, [reports]);

  useEffect(() => {
    if (!activeReport) return;
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeReport]);

  useEffect(() => {
    if (!editingId && !activeReport) {
      setDraft(buildInitialDraft(defaultWorkerName));
    }
  }, [activeReport, defaultWorkerName, editingId]);

  const elapsedLabel = activeReport
    ? formatDistanceStrict(new Date(activeReport.startedAt), new Date(tick), { locale: es, unit: "second" })
    : null;

  const completedReports = reports.filter((report) => report.endedAt).sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""));

  const startReport = () => {
    const payload: WorkReport = {
      id: crypto.randomUUID(),
      workerName: draft.workerName || defaultWorkerName,
      action: draft.action,
      description: draft.description,
      machine: draft.machine,
      observations: draft.observations,
      startedAt: new Date(draft.startedAt || new Date()).toISOString(),
      endedAt: null,
    };
    setReports((current) => [payload, ...current.filter((item) => item.id !== payload.id)]);
    setDraft(buildInitialDraft(payload.workerName));
  };

  const finishReport = () => {
    if (!activeReport) return;
    const endValue = draft.endedAt ? new Date(draft.endedAt).toISOString() : new Date().toISOString();
    const startValue = draft.startedAt ? new Date(draft.startedAt).toISOString() : activeReport.startedAt;
    setReports((current) =>
      current.map((item) =>
        item.id === activeReport.id
          ? {
              ...item,
              workerName: draft.workerName || item.workerName,
              action: draft.action || item.action,
              description: draft.description || item.description,
              machine: draft.machine || item.machine,
              observations: draft.observations,
              startedAt: startValue,
              endedAt: endValue,
            }
          : item,
      ),
    );
    setDraft(buildInitialDraft(defaultWorkerName));
  };

  const openEdit = (report: WorkReport) => {
    setEditingId(report.id);
    setDraft({
      workerName: report.workerName,
      action: report.action,
      description: report.description,
      machine: report.machine,
      observations: report.observations,
      startedAt: toLocalInputValue(report.startedAt),
      endedAt: report.endedAt ? toLocalInputValue(report.endedAt) : "",
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    setReports((current) =>
      current.map((item) =>
        item.id === editingId
          ? {
              ...item,
              workerName: draft.workerName,
              action: draft.action,
              description: draft.description,
              machine: draft.machine,
              observations: draft.observations,
              startedAt: new Date(draft.startedAt).toISOString(),
              endedAt: draft.endedAt ? new Date(draft.endedAt).toISOString() : null,
            }
          : item,
      ),
    );
    setEditingId(null);
    setDraft(buildInitialDraft(defaultWorkerName));
  };

  const activeDurationMinutes = activeReport ? Math.max(0, Math.floor(differenceInSeconds(new Date(tick), new Date(activeReport.startedAt)) / 60)) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow={isAdminView ? "Administración" : "Operativa"}
        title="Parte de trabajo"
        description={isAdminView ? "Módulo base para controlar partes, corregir horas y preparar una operativa sólida antes de cargar más detalle." : "Flujo rápido para iniciar, retomar y finalizar tareas sin depender de un formulario largo y pesado."}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Estado actual</p><p className="mt-2 text-lg font-semibold text-foreground">{activeReport ? "Parte en curso" : "Sin parte abierto"}</p></div>
        <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Partes cerrados</p><p className="mt-2 text-lg font-semibold text-foreground">{completedReports.length}</p></div>
        <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Corrección manual</p><p className="mt-2 text-lg font-semibold text-foreground">Activada</p></div>
      </section>

      {activeReport ? (
        <Card className="border-primary/25 bg-primary/5 shadow-[var(--shadow-soft)]">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg"><PlayCircle className="h-5 w-5 text-primary" /> Parte en curso</CardTitle>
            <p className="text-sm text-muted-foreground">El parte sigue contando aunque cierres la app. Al volver, recupera el estado desde el dispositivo y permite corregir la hora real.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-card px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Trabajador</p><p className="mt-1 font-semibold text-foreground">{activeReport.workerName}</p></div>
              <div className="rounded-xl bg-card px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Inicio</p><p className="mt-1 font-semibold text-foreground">{new Date(activeReport.startedAt).toLocaleString("es-ES")}</p></div>
              <div className="rounded-xl bg-card px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tiempo en vivo</p><p className="mt-1 font-semibold text-foreground">{elapsedLabel}</p></div>
              <div className="rounded-xl bg-card px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Duración aprox.</p><p className="mt-1 font-semibold text-foreground">{activeDurationMinutes} min</p></div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="active-start">Hora de inicio editable</Label>
                <Input id="active-start" type="datetime-local" value={draft.startedAt || toLocalInputValue(activeReport.startedAt)} onChange={(event) => setDraft((current) => ({ ...current, startedAt: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="active-end">Hora de fin editable</Label>
                <Input id="active-end" type="datetime-local" value={draft.endedAt} onChange={(event) => setDraft((current) => ({ ...current, endedAt: event.target.value }))} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-1">
                <Label htmlFor="active-worker">Trabajador</Label>
                <Input id="active-worker" value={draft.workerName || activeReport.workerName} onChange={(event) => setDraft((current) => ({ ...current, workerName: event.target.value }))} />
              </div>
              <div className="space-y-2 xl:col-span-1">
                <Label htmlFor="active-action">Acción</Label>
                <Input id="active-action" list="work-actions" value={draft.action || activeReport.action} onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))} />
              </div>
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="active-machine">Maquinaria</Label>
                <Input id="active-machine" list="work-machines" value={draft.machine || activeReport.machine} onChange={(event) => setDraft((current) => ({ ...current, machine: event.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="active-description">Descripción de tarea</Label>
              <Textarea id="active-description" value={draft.description || activeReport.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="active-observations">Observaciones</Label>
              <Textarea id="active-observations" value={draft.observations} onChange={(event) => setDraft((current) => ({ ...current, observations: event.target.value }))} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="lg" onClick={finishReport}><PauseCircle className="h-4 w-4" /> Finalizar parte</Button>
              <Button variant="outline" size="lg" onClick={() => setDraft((current) => ({ ...current, endedAt: toLocalInputValue(new Date()) }))}><TimerReset className="h-4 w-4" /> Ajustar fin a ahora</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-[var(--shadow-soft)]">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Hammer className="h-5 w-5 text-primary" /> Crear parte</CardTitle>
            <p className="text-sm text-muted-foreground">Rellena lo justo para arrancar. El resto queda preparado para completarse o corregirse cuando haga falta.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-1">
                <Label htmlFor="report-worker">Trabajador</Label>
                <Input id="report-worker" value={draft.workerName} onChange={(event) => setDraft((current) => ({ ...current, workerName: event.target.value }))} />
              </div>
              <div className="space-y-2 xl:col-span-1">
                <Label htmlFor="report-action">Acción</Label>
                <Input id="report-action" list="work-actions" placeholder="Selecciona o escribe" value={draft.action} onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))} />
              </div>
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="report-machine">Maquinaria de trabajo</Label>
                <Input id="report-machine" list="work-machines" placeholder="Selecciona o escribe" value={draft.machine} onChange={(event) => setDraft((current) => ({ ...current, machine: event.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-description">Descripción de tarea</Label>
              <Textarea id="report-description" placeholder="Qué vas a hacer, en qué zona o con qué objetivo" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="report-start">Hora de inicio</Label>
                <Input id="report-start" type="datetime-local" value={draft.startedAt} onChange={(event) => setDraft((current) => ({ ...current, startedAt: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-observations">Observaciones iniciales</Label>
                <Textarea id="report-observations" className="min-h-[44px]" placeholder="Opcional" value={draft.observations} onChange={(event) => setDraft((current) => ({ ...current, observations: event.target.value }))} />
              </div>
            </div>

            <Button size="lg" onClick={startReport}><PlayCircle className="h-4 w-4" /> Iniciar parte</Button>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-lg"><Clock3 className="h-5 w-5 text-primary" /> Historial de partes</CardTitle>
          <p className="text-sm text-muted-foreground">Base preparada para que trabajador gestione los suyos y administración pueda revisarlos o corregirlos después.</p>
        </CardHeader>
        <CardContent>
          {completedReports.length === 0 ? (
            <EmptyState icon={Clock3} title="Todavía no hay partes cerrados" description="Cuando cierres los primeros partes aparecerán aquí listos para revisar, editar horas o continuar ampliando lógica más adelante." />
          ) : (
            <div className="space-y-3">
              {completedReports.map((report) => {
                const duration = report.endedAt ? formatDistanceStrict(new Date(report.startedAt), new Date(report.endedAt), { locale: es }) : "";
                const isEditing = editingId === report.id;
                return (
                  <article key={report.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{report.description || "Parte sin descripción"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{report.workerName} · {report.action || "Sin acción"} · {report.machine || "Sin maquinaria"}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => (isEditing ? saveEdit() : openEdit(report))}><PencilLine className="h-4 w-4" /> {isEditing ? "Guardar" : "Editar"}</Button>
                    </div>
                    {isEditing ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Hora inicio</Label>
                          <Input type="datetime-local" value={draft.startedAt} onChange={(event) => setDraft((current) => ({ ...current, startedAt: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Hora fin</Label>
                          <Input type="datetime-local" value={draft.endedAt} onChange={(event) => setDraft((current) => ({ ...current, endedAt: event.target.value }))} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Observaciones</Label>
                          <Textarea value={draft.observations} onChange={(event) => setDraft((current) => ({ ...current, observations: event.target.value }))} />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                        <div className="rounded-xl bg-muted/45 px-3 py-2"><span className="text-muted-foreground">Inicio</span><p className="mt-1 font-semibold text-foreground">{new Date(report.startedAt).toLocaleString("es-ES")}</p></div>
                        <div className="rounded-xl bg-muted/45 px-3 py-2"><span className="text-muted-foreground">Fin</span><p className="mt-1 font-semibold text-foreground">{report.endedAt ? new Date(report.endedAt).toLocaleString("es-ES") : "—"}</p></div>
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

      <datalist id="work-machines">
        {machineOptions.map((machine) => <option key={machine} value={machine} />)}
      </datalist>
      <datalist id="work-actions">
        {actionOptions.map((action) => <option key={action} value={action} />)}
      </datalist>
    </div>
  );
};

export default WorkReportsHubView;
