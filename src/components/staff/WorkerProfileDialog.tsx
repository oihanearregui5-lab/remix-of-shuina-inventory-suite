import { Activity, Clock3, FileText, Mail, Phone, StickyNote, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWorkerProfile, formatTimeSince } from "@/hooks/useWorkerProfile";

interface WorkerProfileDialogProps {
  staffId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WorkerProfileDialog = ({ staffId, open, onOpenChange }: WorkerProfileDialogProps) => {
  const { staff, lastEntry, activeReport, pendingTasksCount, recentTasks, loading } = useWorkerProfile(open ? staffId : null);

  const isWorking = Boolean(lastEntry && !lastEntry.clock_out);
  const presenceLabel = isWorking ? "Trabajando ahora" : "Fuera";
  const presenceClass = isWorking ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
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

        <div className="space-y-4 p-5">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />)}
            </div>
          ) : !staff ? (
            <p className="text-sm text-muted-foreground">No se encontró información del trabajador.</p>
          ) : (
            <>
              {/* Contacto */}
              {(staff.email || staff.phone) ? (
                <div className="space-y-1.5">
                  {staff.email ? (
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Mail className="h-4 w-4 text-muted-foreground" /> {staff.email}
                    </div>
                  ) : null}
                  {staff.phone ? (
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Phone className="h-4 w-4 text-muted-foreground" /> {staff.phone}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Estado en vivo */}
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
                  {activeReport ? (
                    <p className="text-xs text-muted-foreground">{formatTimeSince(activeReport.started_at)}</p>
                  ) : null}
                </div>
              </div>

              {/* Tareas */}
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerProfileDialog;
