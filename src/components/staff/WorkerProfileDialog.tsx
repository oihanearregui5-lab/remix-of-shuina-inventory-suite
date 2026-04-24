import { useMemo, useState } from "react";
import { Activity, Briefcase, Calendar, Clock3, Download, FileText, Mail, Phone, StickyNote, X } from "lucide-react";
import { differenceInMinutes, format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkerProfile, formatTimeSince } from "@/hooks/useWorkerProfile";

interface WorkerProfileDialogProps {
  staffId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatMins = (mins: number) => `${Math.floor(mins / 60)}h ${mins % 60}m`;

const exportEntriesCSV = (workerName: string, entries: Array<{ clock_in: string; clock_out: string | null }>) => {
  const headers = "Fecha,Entrada,Salida,Duración (min)\n";
  const rows = entries.map((entry) => {
    const date = format(new Date(entry.clock_in), "dd/MM/yyyy");
    const inT = format(new Date(entry.clock_in), "HH:mm");
    const outT = entry.clock_out ? format(new Date(entry.clock_out), "HH:mm") : "En curso";
    const mins = entry.clock_out ? differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in)) : 0;
    return `${date},${inT},${outT},${mins}`;
  }).join("\n");
  const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fichajes_${workerName.toLowerCase().replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const WorkerProfileDialog = ({ staffId, open, onOpenChange }: WorkerProfileDialogProps) => {
  const { staff, lastEntry, activeReport, pendingTasksCount, recentTasks, allEntries, vacationRequests, recentReports, loading } = useWorkerProfile(open ? staffId : null);
  const [tab, setTab] = useState("summary");

  const isWorking = Boolean(lastEntry && !lastEntry.clock_out);
  const presenceLabel = isWorking ? "Trabajando ahora" : "Fuera";
  const presenceClass = isWorking ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground";

  const monthStats = useMemo(() => {
    const now = new Date();
    const from = startOfMonth(now);
    const to = endOfMonth(now);
    const inRange = allEntries.filter((e) => {
      const d = new Date(e.clock_in);
      return d >= from && d <= to;
    });
    const totalMins = inRange.reduce((sum, e) => sum + (e.clock_out ? differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in)) : 0), 0);
    return { count: inRange.length, totalMins };
  }, [allEntries]);

  const vacationBreakdown = useMemo(() => {
    const approved = vacationRequests.filter((v) => v.status === "approved").length;
    const pending = vacationRequests.filter((v) => v.status === "pending").length;
    const rejected = vacationRequests.filter((v) => v.status === "rejected").length;
    return { approved, pending, rejected };
  }, [vacationRequests]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b border-border p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-xl">{staff?.full_name || "Trabajador"}</DialogTitle>
              <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${presenceClass}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isWorking ? "bg-primary animate-pulse" : "bg-muted-foreground/50"}`} />
                {presenceLabel}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />)}
            </div>
          ) : !staff ? (
            <p className="text-sm text-muted-foreground">No se encontró información del trabajador.</p>
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="summary">Resumen</TabsTrigger>
                <TabsTrigger value="time">Fichajes</TabsTrigger>
                <TabsTrigger value="vacations">Vacaciones</TabsTrigger>
                <TabsTrigger value="contract">Contrato</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>

              {/* RESUMEN */}
              <TabsContent value="summary" className="space-y-4">
                {(staff.email || staff.phone) ? (
                  <div className="space-y-1.5">
                    {staff.email ? <div className="flex items-center gap-2 text-sm text-foreground"><Mail className="h-4 w-4 text-muted-foreground" /> {staff.email}</div> : null}
                    {staff.phone ? <div className="flex items-center gap-2 text-sm text-foreground"><Phone className="h-4 w-4 text-muted-foreground" /> {staff.phone}</div> : null}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" /> Último fichaje
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {lastEntry ? format(new Date(lastEntry.clock_in), "d MMM HH:mm", { locale: es }) : "Sin registros"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lastEntry ? formatTimeSince(lastEntry.clock_out ?? lastEntry.clock_in) : ""}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" /> Parte activo
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">
                      {activeReport ? activeReport.description : "Sin parte"}
                    </p>
                    {activeReport ? <p className="text-xs text-muted-foreground">{formatTimeSince(activeReport.started_at)}</p> : null}
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" /> Mes en curso
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground">{formatMins(monthStats.totalMins)}</p>
                    <p className="text-xs text-muted-foreground">{monthStats.count} fichajes</p>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5" /> Vacaciones
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground">{vacationBreakdown.approved} aprobadas</p>
                    <p className="text-xs text-muted-foreground">{vacationBreakdown.pending} pendientes</p>
                  </div>
                </div>

                <section className="rounded-xl border border-border bg-background p-3">
                  <header className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Activity className="h-4 w-4 text-primary" /> Tareas asignadas
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {pendingTasksCount} pendientes
                    </span>
                  </header>
                  {recentTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin tareas asignadas.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {recentTasks.map((task) => (
                        <li key={task.id} className="flex items-center justify-between gap-2 py-2">
                          <span className="truncate text-sm text-foreground">{task.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {task.due_date ? format(new Date(task.due_date), "d MMM", { locale: es }) : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {staff.notes ? (
                  <div className="rounded-xl border border-border bg-background p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <StickyNote className="h-3.5 w-3.5" /> Notas
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{staff.notes}</p>
                  </div>
                ) : null}
              </TabsContent>

              {/* FICHAJES */}
              <TabsContent value="time" className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Últimos {allEntries.length} fichajes registrados.</p>
                  <Button size="sm" variant="outline" onClick={() => exportEntriesCSV(staff.full_name, allEntries)}>
                    <Download className="h-4 w-4 mr-2" /> Exportar CSV
                  </Button>
                </div>
                {allEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sin fichajes registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {allEntries.slice(0, 50).map((entry) => {
                      const mins = entry.clock_out ? differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in)) : 0;
                      return (
                        <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium text-foreground">{format(new Date(entry.clock_in), "EEE d MMM yyyy", { locale: es })}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(entry.clock_in), "HH:mm")} → {entry.clock_out ? format(new Date(entry.clock_out), "HH:mm") : "En curso"}
                            </p>
                          </div>
                          <span className={entry.clock_out ? "text-foreground font-semibold" : "text-success font-semibold"}>
                            {entry.clock_out ? formatMins(mins) : "Activo"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* VACACIONES */}
              <TabsContent value="vacations" className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border bg-background p-3 text-center">
                    <p className="text-2xl font-bold text-success">{vacationBreakdown.approved}</p>
                    <p className="text-xs text-muted-foreground">Aprobadas</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3 text-center">
                    <p className="text-2xl font-bold text-warning">{vacationBreakdown.pending}</p>
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3 text-center">
                    <p className="text-2xl font-bold text-destructive">{vacationBreakdown.rejected}</p>
                    <p className="text-xs text-muted-foreground">Rechazadas</p>
                  </div>
                </div>
                {vacationRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sin solicitudes registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {vacationRequests.map((vac) => (
                      <div key={vac.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-foreground">
                            {format(new Date(vac.start_date), "d MMM", { locale: es })} → {format(new Date(vac.end_date), "d MMM yyyy", { locale: es })}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{vac.request_type}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${vac.status === "approved" ? "bg-success/15 text-success" : vac.status === "pending" ? "bg-warning/15 text-foreground" : "bg-destructive/10 text-destructive"}`}>
                          {vac.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* CONTRATO */}
              <TabsContent value="contract" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Tipo de contrato</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{staff.contract_type || "Sin definir"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Puesto</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{staff.position || "Sin definir"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Inicio</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {staff.start_date ? format(new Date(staff.start_date), "d MMM yyyy", { locale: es }) : "Sin definir"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Horas semanales</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{staff.weekly_hours ? `${staff.weekly_hours}h` : "Sin definir"}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Edita estos datos desde la sección de Personal o desde el panel administrativo.</p>
              </TabsContent>

              {/* HISTÓRICO */}
              <TabsContent value="history" className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Últimos partes de trabajo</p>
                {recentReports.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sin partes registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {recentReports.map((report) => (
                      <div key={report.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground line-clamp-1">{report.description}</p>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">{format(new Date(report.started_at), "d MMM", { locale: es })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {report.machine ? `${report.machine} · ` : ""}
                          {report.ended_at ? `Finalizado` : "En curso"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerProfileDialog;
