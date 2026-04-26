import { useMemo, useState } from "react";
import { Briefcase, Calendar, CalendarDays, Clock3, Download, FileText, Mail, Phone, Wrench, X } from "lucide-react";
import { differenceInMinutes, endOfMonth, format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeHoursSummaries, formatMinutesAsHours, useWorkerProfile, type WorkerTimeEntry } from "@/hooks/useWorkerProfile";
import { cn } from "@/lib/utils";

interface WorkerProfileDialogProps {
  staffId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDuration = (entry: WorkerTimeEntry) => {
  if (!entry.clock_out) return "En curso";
  const mins = differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const exportCSV = (name: string, entries: WorkerTimeEntry[]) => {
  const header = "Fecha,Entrada,Salida,Duración\n";
  const rows = entries
    .map((entry) => {
      const date = format(new Date(entry.clock_in), "dd/MM/yyyy");
      const in_ = format(new Date(entry.clock_in), "HH:mm");
      const out = entry.clock_out ? format(new Date(entry.clock_out), "HH:mm") : "En curso";
      return `${date},${in_},${out},${formatDuration(entry)}`;
    })
    .join("\n");
  const csv = header + rows;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fichajes_${name.replace(/\s+/g, "_").toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const WorkerProfileDialog = ({ staffId, open, onOpenChange }: WorkerProfileDialogProps) => {
  const { staff, entries, activeReport, vacationRequests, allowance, tasks, reports, incidents, loading } = useWorkerProfile(open ? staffId : null);
  const [dateFrom, setDateFrom] = useState<string>(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState<string>(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const hours = useMemo(() => computeHoursSummaries(entries), [entries]);

  const filteredEntries = useMemo(() => {
    if (!dateFrom && !dateTo) return entries;
    return entries.filter((entry) => {
      const d = format(new Date(entry.clock_in), "yyyy-MM-dd");
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [entries, dateFrom, dateTo]);

  const filteredTotalMinutes = useMemo(() => {
    return filteredEntries.reduce(
      (acc, entry) =>
        acc +
        Math.max(
          0,
          differenceInMinutes(entry.clock_out ? new Date(entry.clock_out) : new Date(), new Date(entry.clock_in)),
        ),
      0,
    );
  }, [filteredEntries]);

  const lastEntry = entries[0] ?? null;
  const isWorking = Boolean(lastEntry && !lastEntry.clock_out);

  const vacationStats = useMemo(() => {
    if (!allowance) return null;
    const base = Number(allowance.vacation_days_base) + Number(allowance.vacation_adjustment_days);
    const approved = vacationRequests.filter((v) => v.status === "approved");
    const pending = vacationRequests.filter((v) => v.status === "pending");
    // Días aprobados gastados = suma de rangos
    const used = approved.reduce((acc, req) => {
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      const diff = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return acc + diff;
    }, 0);
    return { base, used, pending: pending.length, remaining: Math.max(0, base - used) };
  }, [allowance, vacationRequests]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="border-b border-border p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-bold text-white shrink-0"
                style={{ backgroundColor: staff?.color_tag || "hsl(var(--primary))" }}
              >
                {(staff?.full_name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-xl">{staff?.full_name || "Trabajador"}</DialogTitle>
                <div className="mt-1.5 flex items-center gap-2">
                  {isWorking ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-destructive-foreground">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive-foreground opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive-foreground" />
                      </span>
                      ACTIVO
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Fuera de jornada</span>
                  )}
                  {staff?.position ? <span className="text-sm text-muted-foreground">· {staff.position}</span> : null}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 p-5 space-y-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />)}
          </div>
        ) : !staff ? (
          <div className="p-5 text-sm text-muted-foreground">No se encontró información del trabajador.</div>
        ) : (
          <Tabs defaultValue="resumen" className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-border px-5 pt-3">
              <TabsList className="w-full !grid grid-cols-5 h-auto">
                <TabsTrigger value="resumen" className="text-xs md:text-sm">Resumen</TabsTrigger>
                <TabsTrigger value="fichajes" className="text-xs md:text-sm">Fichajes</TabsTrigger>
                <TabsTrigger value="vacaciones" className="text-xs md:text-sm">Vacaciones</TabsTrigger>
                <TabsTrigger value="contrato" className="text-xs md:text-sm">Contrato</TabsTrigger>
                <TabsTrigger value="historico" className="text-xs md:text-sm">Histórico</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* RESUMEN */}
              <TabsContent value="resumen" className="mt-0 space-y-4">
                {(staff.email || staff.phone) && (
                  <div className="space-y-1.5 rounded-xl border border-border bg-background p-3">
                    {staff.email && (
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Mail className="h-4 w-4 text-muted-foreground" /> {staff.email}
                      </div>
                    )}
                    {staff.phone && (
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Phone className="h-4 w-4 text-muted-foreground" /> {staff.phone}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" /> Horas este mes
                    </div>
                    <p className="mt-2 text-2xl font-bold text-foreground">{formatMinutesAsHours(hours.monthMinutes)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" /> Horas esta semana
                    </div>
                    <p className="mt-2 text-2xl font-bold text-foreground">{formatMinutesAsHours(hours.weekMinutes)}</p>
                  </div>
                  {vacationStats && (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" /> Vacaciones
                      </div>
                      <p className="mt-2 text-2xl font-bold text-foreground">{vacationStats.remaining}<span className="text-sm font-medium text-muted-foreground"> / {vacationStats.base} días</span></p>
                    </div>
                  )}
                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" /> Parte activo
                    </div>
                    <p className="mt-2 text-sm font-semibold line-clamp-2 text-foreground">
                      {activeReport?.description || "Sin parte"}
                    </p>
                  </div>
                </div>

                {tasks.filter((t) => t.status === "completed").length > 0 && (
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="mb-2 text-sm font-semibold text-foreground">Últimas tareas completadas</p>
                    <ul className="divide-y divide-border">
                      {tasks.filter((t) => t.status === "completed").slice(0, 3).map((task) => (
                        <li key={task.id} className="flex items-center justify-between gap-2 py-2">
                          <span className="truncate text-sm text-foreground">{task.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {task.completed_at ? format(new Date(task.completed_at), "d MMM", { locale: es }) : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              {/* FICHAJES */}
              <TabsContent value="fichajes" className="mt-0 space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Desde</label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Hasta</label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                  <Button variant="outline" onClick={() => exportCSV(staff.full_name, filteredEntries)}>
                    <Download className="h-4 w-4" /> Exportar CSV
                  </Button>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total del rango</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{formatMinutesAsHours(filteredTotalMinutes)}</p>
                  <p className="text-xs text-muted-foreground">{filteredEntries.length} fichajes</p>
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="grid grid-cols-4 gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <div>Fecha</div>
                    <div>Entrada</div>
                    <div>Salida</div>
                    <div className="text-right">Duración</div>
                  </div>
                  <div className="divide-y divide-border">
                    {filteredEntries.length === 0 ? (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">Sin fichajes en este rango</div>
                    ) : filteredEntries.map((entry) => (
                      <div key={entry.id} className="grid grid-cols-4 gap-2 px-3 py-2.5 text-sm">
                        <div>{format(new Date(entry.clock_in), "d MMM yyyy", { locale: es })}</div>
                        <div>{format(new Date(entry.clock_in), "HH:mm")}</div>
                        <div>{entry.clock_out ? format(new Date(entry.clock_out), "HH:mm") : <span className="text-destructive font-medium">En curso</span>}</div>
                        <div className="text-right font-medium">{formatDuration(entry)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* VACACIONES */}
              <TabsContent value="vacaciones" className="mt-0 space-y-4">
                {vacationStats ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Base anual</p>
                      <p className="mt-1 text-2xl font-bold text-foreground">{vacationStats.base}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Disfrutados</p>
                      <p className="mt-1 text-2xl font-bold text-foreground">{vacationStats.used}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Pendientes</p>
                      <p className="mt-1 text-2xl font-bold text-foreground">{vacationStats.pending}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                    Sin saldo de vacaciones configurado.
                  </div>
                )}

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="mb-2 text-sm font-semibold text-foreground">Solicitudes recientes</p>
                  {vacationRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin solicitudes registradas.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {vacationRequests.slice(0, 10).map((req) => (
                        <li key={req.id} className="flex items-center justify-between gap-2 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground capitalize">{req.request_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(req.start_date), "d MMM", { locale: es })} → {format(new Date(req.end_date), "d MMM yyyy", { locale: es })}
                            </p>
                          </div>
                          <span className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                            req.status === "approved" && "bg-success/15 text-foreground",
                            req.status === "pending" && "bg-warning/20 text-foreground",
                            req.status === "rejected" && "bg-destructive/15 text-destructive",
                          )}>
                            {req.status === "approved" ? "Aprobada" : req.status === "pending" ? "Pendiente" : "Rechazada"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </TabsContent>

              {/* CONTRATO */}
              <TabsContent value="contrato" className="mt-0 space-y-3">
                <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Briefcase className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Puesto</p>
                      <p className="font-medium text-foreground">{staff.position || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Tipo de contrato</p>
                      <p className="font-medium text-foreground">{staff.contract_type || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Fecha de alta</p>
                      <p className="font-medium text-foreground">
                        {staff.start_date ? format(new Date(staff.start_date), "d MMMM yyyy", { locale: es }) : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Horas semanales</p>
                      <p className="font-medium text-foreground">{staff.weekly_hours ? `${staff.weekly_hours}h` : "—"}</p>
                    </div>
                  </div>
                </div>

                {staff.notes && (
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Notas administrativas</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{staff.notes}</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Los campos de contrato se rellenan desde la edición del trabajador en el directorio.
                </p>
              </TabsContent>

              {/* HISTÓRICO */}
              <TabsContent value="historico" className="mt-0 space-y-4">
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-primary" /> Últimos partes
                  </p>
                  {reports.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin partes registrados.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {reports.map((r) => (
                        <li key={r.id} className="py-2">
                          <p className="text-sm font-medium text-foreground line-clamp-1">{r.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(r.started_at), "d MMM yyyy HH:mm", { locale: es })}
                            {r.machine ? ` · ${r.machine}` : ""}
                            {r.ended_at ? "" : " · En curso"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Wrench className="h-4 w-4 text-primary" /> Incidencias reportadas
                  </p>
                  {incidents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin incidencias registradas.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {incidents.map((i) => (
                        <li key={i.id} className="flex items-center justify-between gap-2 py-2">
                          <span className="truncate text-sm text-foreground">{i.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {format(new Date(i.created_at), "d MMM", { locale: es })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="mb-2 text-sm font-semibold text-foreground">Tareas completadas</p>
                  {tasks.filter((t) => t.status === "completed").length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin tareas completadas.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {tasks.filter((t) => t.status === "completed").slice(0, 10).map((task) => (
                        <li key={task.id} className="flex items-center justify-between gap-2 py-2">
                          <span className="truncate text-sm text-foreground">{task.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {task.completed_at ? format(new Date(task.completed_at), "d MMM", { locale: es }) : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WorkerProfileDialog;
