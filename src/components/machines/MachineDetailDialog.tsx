import { format, differenceInDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarClock,
  CircleGauge,
  Droplet,
  Fuel,
  Gauge,
  PlayCircle,
  ShieldCheck,
  ShoppingCart,
  TimerReset,
  Users,
  Wrench,
  AlertTriangle,
  StickyNote,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export interface MachineDialogNote {
  id: string;
  note: string;
  is_highlight: boolean;
  created_at: string;
}

export interface MachineDialogTechnical {
  itvLast: string | null;
  itvNext: string | null;
  oilLastDate: string | null;
  oilLastHours: number | null;
  oilNextHours: number | null;
  hydraulicOilLast: string | null;
  airFilterLast: string | null;
  fuelFilterLast: string | null;
  coolantLast: string | null;
  tiresLastCheck: string | null;
  insuranceExpiry: string | null;
  notes: string | null;
}

export interface MachineDialogItem {
  id: string;
  name: string;
  plate: string;
  family: string;
  status: "active" | "maintenance" | "repair" | "inspection";
  priority?: "critical" | "attention" | "stable";
  focus: string[];
  provider: string;
  providerContact?: string | null;
  providerNotes?: string | null;
  generalNotes?: string | null;
  nextInspection: string;
  nextIvt: string;
  fluids: string[];
  notes: MachineDialogNote[];
  technical?: MachineDialogTechnical;
  serviceOverview?: Array<{ id: string; title: string; status: string; dueDate: string | null }>;
  incidentOverview?: Array<{ id: string; title: string; status: string; dueDate: string | null }>;
  usage: {
    totalHours30d: string;
    activeOperator: string;
    activeSince: string;
    operators: number;
    recentTimeline: Array<{
      id: string;
      workerName: string;
      startedAt: string;
      endedAt: string | null;
      durationLabel: string;
      isActive: boolean;
    }>;
  };
}

interface MachineDetailDialogProps {
  open: boolean;
  machine: MachineDialogItem | null;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
  onSaveTechnical?: (machineId: string, patch: Record<string, string | number | null>) => Promise<void> | void;
}

const statusLabel = {
  active: "Operativa",
  maintenance: "Mantenimiento",
  repair: "Avería",
  inspection: "Inspección",
};

const statusTone = {
  active: "bg-success/15 text-success",
  maintenance: "bg-warning/15 text-foreground",
  repair: "bg-destructive/10 text-destructive",
  inspection: "bg-info/10 text-info",
};

const priorityTone = {
  critical: "bg-destructive/10 text-destructive",
  attention: "bg-warning/15 text-foreground",
  stable: "bg-success/15 text-success",
};

const priorityLabel = {
  critical: "Crítica",
  attention: "Atención",
  stable: "Estable",
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "d MMM yyyy", { locale: es });
  } catch {
    return value;
  }
};

const dateBadge = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    const days = differenceInDays(parseISO(value), new Date());
    if (days < 0) return <Badge variant="destructive" className="text-[10px]">Vencido hace {Math.abs(days)}d</Badge>;
    if (days <= 15) return <Badge className="bg-warning text-foreground text-[10px]">En {days}d</Badge>;
    if (days <= 45) return <Badge variant="secondary" className="text-[10px]">En {days}d</Badge>;
    return <Badge variant="outline" className="text-[10px]">En {days}d</Badge>;
  } catch {
    return null;
  }
};

const TechRow = ({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: any;
  label: string;
  value: string | null | undefined;
  hint?: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card p-3">
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-primary mt-0.5" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value || "—"}</p>
      </div>
    </div>
    {hint}
  </div>
);

const MachineDetailDialog = ({ open, machine, onOpenChange }: MachineDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-background">
        {!machine ? null : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-xl text-foreground">{machine.name}</DialogTitle>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[machine.status]}`}>
                  {statusLabel[machine.status]}
                </span>
                {machine.priority && (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${priorityTone[machine.priority]}`}>
                    {priorityLabel[machine.priority]}
                  </span>
                )}
              </div>
              <DialogDescription className="text-muted-foreground">
                {machine.plate} · {machine.family}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="info" className="mt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="tecnico">Técnico</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              {/* TAB INFO */}
              <TabsContent value="info" className="space-y-4 pt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <CircleGauge className="h-4 w-4 text-secondary" /> Matrícula
                    </div>
                    <p className="font-semibold text-foreground">{machine.plate}</p>
                    <p className="text-sm text-muted-foreground">{machine.family}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <ShoppingCart className="h-4 w-4 text-primary" /> Proveedor
                    </div>
                    <p className="font-semibold text-foreground">{machine.provider}</p>
                    {machine.providerContact && (
                      <p className="text-xs text-muted-foreground mt-1">{machine.providerContact}</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 text-primary" /> Próximos hitos
                    </div>
                    <p className="text-sm text-foreground"><span className="text-muted-foreground">Revisión:</span> {machine.nextInspection}</p>
                    <p className="text-sm text-foreground"><span className="text-muted-foreground">ITV:</span> {machine.nextIvt}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <TimerReset className="h-4 w-4 text-primary" /> Uso 30 días
                    </div>
                    <p className="text-lg font-semibold text-foreground">{machine.usage.totalHours30d}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <PlayCircle className="h-4 w-4 text-secondary" /> Activa ahora
                    </div>
                    <p className="font-semibold text-foreground">{machine.usage.activeOperator}</p>
                    <p className="text-sm text-muted-foreground">{machine.usage.activeSince}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4 text-primary" /> Operarios
                    </div>
                    <p className="text-lg font-semibold text-foreground">{machine.usage.operators}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <Wrench className="h-4 w-4 text-warning" /> Puntos a vigilar
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {machine.focus.map((item) => (
                      <span key={item} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">{item}</span>
                    ))}
                  </div>
                </div>

                {machine.generalNotes && (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                      <StickyNote className="h-4 w-4 text-primary" /> Notas generales
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-line">{machine.generalNotes}</p>
                  </div>
                )}
              </TabsContent>

              {/* TAB TÉCNICO */}
              <TabsContent value="tecnico" className="space-y-4 pt-4">
                {!machine.technical ? (
                  <p className="text-sm text-muted-foreground">Sin datos técnicos registrados.</p>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <TechRow
                        icon={ShieldCheck}
                        label="ITV — última"
                        value={formatDate(machine.technical.itvLast)}
                      />
                      <TechRow
                        icon={ShieldCheck}
                        label="ITV — próxima"
                        value={formatDate(machine.technical.itvNext)}
                        hint={dateBadge(machine.technical.itvNext)}
                      />
                      <TechRow
                        icon={Droplet}
                        label="Aceite motor — última"
                        value={
                          machine.technical.oilLastDate
                            ? `${formatDate(machine.technical.oilLastDate)}${machine.technical.oilLastHours ? ` · ${machine.technical.oilLastHours}h` : ""}`
                            : "—"
                        }
                      />
                      <TechRow
                        icon={Gauge}
                        label="Próximo cambio aceite"
                        value={machine.technical.oilNextHours ? `${machine.technical.oilNextHours}h` : "—"}
                      />
                      <TechRow
                        icon={Droplet}
                        label="Aceite hidráulico"
                        value={formatDate(machine.technical.hydraulicOilLast)}
                      />
                      <TechRow
                        icon={Fuel}
                        label="Filtro combustible"
                        value={formatDate(machine.technical.fuelFilterLast)}
                      />
                      <TechRow
                        icon={Wrench}
                        label="Filtro de aire"
                        value={formatDate(machine.technical.airFilterLast)}
                      />
                      <TechRow
                        icon={Droplet}
                        label="Refrigerante"
                        value={formatDate(machine.technical.coolantLast)}
                      />
                      <TechRow
                        icon={CircleGauge}
                        label="Neumáticos — última revisión"
                        value={formatDate(machine.technical.tiresLastCheck)}
                      />
                      <TechRow
                        icon={ShieldCheck}
                        label="Seguro — vence"
                        value={formatDate(machine.technical.insuranceExpiry)}
                        hint={dateBadge(machine.technical.insuranceExpiry)}
                      />
                    </div>

                    {machine.technical.notes && (
                      <div className="rounded-lg border border-border bg-card p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                          <StickyNote className="h-4 w-4 text-primary" /> Observaciones técnicas
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-line">{machine.technical.notes}</p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* TAB HISTÓRICO */}
              <TabsContent value="historico" className="space-y-4 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                      <CalendarClock className="h-4 w-4 text-primary" /> Mantenimientos
                    </div>
                    <div className="space-y-3">
                      {(machine.serviceOverview?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Sin mantenimientos destacados.</p>}
                      {machine.serviceOverview?.map((item) => (
                        <div key={item.id} className="rounded-lg bg-muted p-3">
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.status} · {item.dueDate ? format(new Date(item.dueDate), "d MMM yyyy", { locale: es }) : "Sin fecha"}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                      <AlertTriangle className="h-4 w-4 text-warning" /> Incidencias
                    </div>
                    <div className="space-y-3">
                      {(machine.incidentOverview?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Sin incidencias abiertas destacadas.</p>}
                      {machine.incidentOverview?.map((item) => (
                        <div key={item.id} className="rounded-lg bg-muted p-3">
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.status} · {item.dueDate ? format(new Date(item.dueDate), "d MMM yyyy", { locale: es }) : "Sin fecha"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <PlayCircle className="h-4 w-4 text-primary" /> Uso reciente
                  </div>
                  <div className="space-y-3">
                    {machine.usage.recentTimeline.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay uso operativo vinculado a esta máquina.</p>}
                    {machine.usage.recentTimeline.map((item) => (
                      <div key={item.id} className="rounded-lg bg-muted p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.workerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(item.startedAt), "d MMM yyyy · HH:mm", { locale: es })}
                              {item.endedAt ? ` → ${format(new Date(item.endedAt), "HH:mm", { locale: es })}` : " · En curso"}
                            </p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${item.isActive ? "bg-primary/15 text-foreground" : "bg-background text-muted-foreground"}`}>
                            {item.durationLabel}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <StickyNote className="h-4 w-4 text-primary" /> Observaciones del equipo
                  </div>
                  <div className="space-y-3">
                    {machine.notes.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay movimientos registrados en esta máquina.</p>}
                    {machine.notes.map((note) => (
                      <div key={note.id} className="rounded-lg bg-muted p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${note.is_highlight ? "bg-primary/15 text-foreground" : "bg-background text-muted-foreground"}`}>
                            {note.is_highlight ? "Reseñable" : "Seguimiento"}
                          </span>
                          <span className="text-xs text-muted-foreground">{format(new Date(note.created_at), "d MMM yyyy · HH:mm", { locale: es })}</span>
                        </div>
                        <p className="mt-2 text-sm text-foreground">{note.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MachineDetailDialog;
