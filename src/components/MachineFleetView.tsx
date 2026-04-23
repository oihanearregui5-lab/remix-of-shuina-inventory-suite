import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Download, Pencil, Plus, Search, TimerReset, Trash2, UserRound, Wrench } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import MachineDetailDialog, { type MachineDialogItem } from "@/components/machines/MachineDetailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { buildMachineUsageSummary, formatHoursCompact, type MachineUsageReport } from "@/lib/machine-usage";

type MachineStatus = "active" | "maintenance" | "repair" | "inspection" | "inactive";

const machineStatusLabel: Record<MachineStatus, string> = {
  active: "Operativa",
  maintenance: "Mantenimiento",
  repair: "Avería",
  inspection: "Inspección",
  inactive: "Inactiva",
};

const machineStatusTone: Record<MachineStatus, string> = {
  active: "bg-success/15 text-success",
  maintenance: "bg-warning/15 text-foreground",
  repair: "bg-destructive/10 text-destructive",
  inspection: "bg-info/10 text-info",
  inactive: "bg-muted text-muted-foreground",
};

interface MachineAssetItem {
  id: string;
  display_name: string;
  asset_family: string;
  asset_code: string | null;
  license_plate: string | null;
  status: MachineStatus;
  notes: string | null;
}

interface MachineNoteItem { id: string; machine_id: string; note: string; is_highlight: boolean; created_at: string }
interface ServiceItem { id: string; machine_id: string; title: string; due_date: string | null; status: string }
interface IncidentItem { id: string; machine_id: string; title: string; status: string; due_date: string | null }
interface WorkReportItem extends MachineUsageReport {}

const MachineFleetView = () => {
  const { user, isAdmin } = useAuth();
  const db = supabase as any;
  const [machines, setMachines] = useState<MachineAssetItem[]>([]);
  const [notes, setNotes] = useState<MachineNoteItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [workReports, setWorkReports] = useState<WorkReportItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selectedMachine, setSelectedMachine] = useState<MachineDialogItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<MachineStatus | "all">("all");
  const [form, setForm] = useState({ display_name: "", asset_family: "", asset_code: "", license_plate: "", status: "active" as MachineStatus, notes: "" });

  useEffect(() => { if (user) void Promise.all([fetchMachines(), fetchNotes(), fetchServices(), fetchIncidents(), fetchWorkReports()]); }, [user]);

  const fetchMachines = async () => {
    const { data, error } = await db.from("machine_assets").select("id, display_name, asset_family, asset_code, license_plate, status, notes").order("display_name");
    if (error) return toast.error("No se pudieron cargar las máquinas");
    setMachines((data ?? []) as MachineAssetItem[]);
  };
  const fetchNotes = async () => { const { data } = await db.from("machine_notes").select("id, machine_id, note, is_highlight, created_at").order("created_at", { ascending: false }).limit(300); setNotes((data ?? []) as MachineNoteItem[]); };
  const fetchServices = async () => { const { data } = await db.from("machine_service_records").select("id, machine_id, title, due_date, status").order("due_date"); setServices((data ?? []) as ServiceItem[]); };
  const fetchIncidents = async () => { const { data } = await db.from("machine_incidents").select("id, machine_id, title, due_date, status").order("created_at", { ascending: false }); setIncidents((data ?? []) as IncidentItem[]); };
  const fetchWorkReports = async () => {
    const { data } = await db.from("work_reports").select("id, machine, worker_name, started_at, ended_at").order("started_at", { ascending: false }).limit(500);
    setWorkReports((data ?? []) as WorkReportItem[]);
  };

  const saveMachine = async () => {
    if (!form.display_name.trim() || !form.asset_family.trim()) return;
    const payload = { display_name: form.display_name.trim(), asset_family: form.asset_family.trim(), asset_code: form.asset_code.trim() || null, license_plate: form.license_plate.trim() || null, status: form.status, notes: form.notes.trim() || null };
    const { error } = editingId ? await db.from("machine_assets").update(payload).eq("id", editingId) : await db.from("machine_assets").insert(payload);
    if (error) return toast.error(editingId ? "No se pudo editar la máquina" : "No se pudo crear la máquina");
    toast.success(editingId ? "Máquina actualizada" : "Máquina creada");
    setEditingId(null);
    setForm({ display_name: "", asset_family: "", asset_code: "", license_plate: "", status: "active", notes: "" });
    void fetchMachines();
  };

  const deleteMachine = async (machineId: string) => {
    const { error } = await db.from("machine_assets").delete().eq("id", machineId);
    if (error) return toast.error("No se pudo eliminar la máquina");
    toast.success("Máquina eliminada");
    void fetchMachines();
  };

  const saveNote = async (machineId: string) => {
    if (!user || !drafts[machineId]?.trim()) return;
    const { error } = await db.from("machine_notes").insert({ machine_id: machineId, author_user_id: user.id, note: drafts[machineId].trim(), is_highlight: drafts[machineId].trim().length > 90 });
    if (error) return toast.error("No se pudo guardar la observación");
    setDrafts((current) => ({ ...current, [machineId]: "" }));
    toast.success("Observación guardada");
    void fetchNotes();
  };

  const exportMachine = (machine: MachineAssetItem) => {
    const payload = {
      machine,
      notes: notes.filter((note) => note.machine_id === machine.id),
      services: services.filter((service) => service.machine_id === machine.id),
      incidents: incidents.filter((incident) => incident.machine_id === machine.id),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${machine.display_name.toLowerCase().replace(/\s+/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const machineCards = useMemo(() => machines.map((machine) => {
    const noteItems = notes.filter((note) => note.machine_id === machine.id);
    const serviceItems = services.filter((service) => service.machine_id === machine.id);
    const incidentItems = incidents.filter((incident) => incident.machine_id === machine.id);
    const usage = buildMachineUsageSummary(machine, workReports);
    const today = new Date();
    const sevenDaysAhead = new Date(today.getTime() + 7 * 24 * 36e5);
    const upcomingService = serviceItems.find((service) => service.due_date);
    const dueSoonCount = [...serviceItems, ...incidentItems].filter((item) => {
      if (!item.due_date) return false;
      const dueDate = new Date(item.due_date);
      return dueDate <= sevenDaysAhead;
    }).length;
    const openIncidents = incidentItems.filter((incident) => incident.status !== "resolved").length;
    const pendingServices = serviceItems.filter((service) => service.status !== "completed").length;
    const riskScore =
      (machine.status === "repair" ? 4 : 0) +
      (machine.status === "maintenance" ? 2 : 0) +
      (machine.status === "inspection" ? 2 : 0) +
      openIncidents * 2 +
      pendingServices +
      dueSoonCount;
    const riskLevel: "critical" | "attention" | "stable" = riskScore >= 6 ? "critical" : riskScore >= 3 ? "attention" : "stable";

    return {
      ...machine,
      noteItems,
      serviceItems,
      incidentItems,
      usage,
      dueSoonCount,
      openIncidents,
      pendingServices,
      upcomingService,
      riskLevel,
      riskScore,
    };
  }), [incidents, machines, notes, services, workReports]);

  const fleetSummary = useMemo(() => ({
    total: machineCards.length,
    activeNow: machineCards.filter((machine) => Boolean(machine.usage.activeReport)).length,
    inRepair: machineCards.filter((machine) => machine.status === "repair").length,
    dueSoon: machineCards.reduce((sum, machine) => sum + machine.dueSoonCount, 0),
    withAlerts: machineCards.filter((machine) => machine.riskLevel !== "stable").length,
  }), [machineCards]);

  const priorityMachines = useMemo(() =>
    [...machineCards]
      .filter((machine) => machine.riskLevel !== "stable")
      .sort((left, right) => right.riskScore - left.riskScore || right.openIncidents - left.openIncidents)
      .slice(0, 4),
  [machineCards]);

  const filteredMachineCards = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return machineCards.filter((machine) => {
      const matchesStatus = statusFilter === "all" || machine.status === statusFilter;
      const matchesSearch = !normalizedSearch || [machine.display_name, machine.asset_family, machine.license_plate, machine.asset_code]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesSearch;
    });
  }, [machineCards, searchTerm, statusFilter]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader eyebrow="Máquinas" title="Flota unificada" description="Lectura operativa, prioridades de taller y seguimiento completo de cada unidad en un solo panel." />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <article className="panel-surface p-4 xl:col-span-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Flota</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{fleetSummary.total}</p>
          <p className="text-sm text-muted-foreground">unidades registradas</p>
        </article>
        <article className="panel-surface p-4 xl:col-span-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">En uso</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{fleetSummary.activeNow}</p>
          <p className="text-sm text-muted-foreground">partes activos ahora mismo</p>
        </article>
        <article className="panel-surface p-4 xl:col-span-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Averías</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{fleetSummary.inRepair}</p>
          <p className="text-sm text-muted-foreground">máquinas fuera de ritmo</p>
        </article>
        <article className="panel-surface p-4 xl:col-span-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Vencimientos</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{fleetSummary.dueSoon}</p>
          <p className="text-sm text-muted-foreground">hitos próximos o vencidos</p>
        </article>
        <article className="panel-surface p-4 xl:col-span-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Radar</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{fleetSummary.withAlerts}</p>
          <p className="text-sm text-muted-foreground">unidades con atención prioritaria</p>
        </article>
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <div className="panel-surface p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Control de flota</p>
              <p className="text-sm text-muted-foreground">Busca por máquina, familia, matrícula o código y filtra por estado.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar unidad" className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={(value: MachineStatus | "all") => setStatusFilter(value)}>
                <SelectTrigger className="min-w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Operativa</SelectItem>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  <SelectItem value="repair">Avería</SelectItem>
                  <SelectItem value="inspection">Inspección</SelectItem>
                  <SelectItem value="inactive">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <aside className="panel-surface p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><AlertTriangle className="h-4 w-4 text-warning" /> Radar prioritario</div>
          <div className="mt-3 space-y-3">
            {priorityMachines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay máquinas críticas ni revisiones urgentes en este momento.</p>
            ) : priorityMachines.map((machine) => (
              <button
                key={machine.id}
                type="button"
                onClick={() => setSelectedMachine({
                  id: machine.id,
                  name: machine.display_name,
                  plate: machine.license_plate || "Sin matrícula",
                  family: machine.asset_family,
                  status: machine.status === "inactive" ? "inspection" : machine.status,
                  focus: [machine.asset_code || "Sin código", `${machine.openIncidents} incidencias abiertas`, `${machine.pendingServices} mantenimientos pendientes`],
                  provider: "Proveedor pendiente",
                  nextInspection: machine.upcomingService?.due_date ? format(new Date(machine.upcomingService.due_date), "d MMM yyyy", { locale: es }) : "Sin revisión programada",
                  nextIvt: machine.incidentItems[0]?.due_date ? format(new Date(machine.incidentItems[0].due_date), "d MMM yyyy", { locale: es }) : "Sin ITV registrada",
                  fluids: ["Aceite motor", "Aceite hidráulico", "Anticongelante"],
                  notes: machine.noteItems,
                  priority: machine.riskLevel,
                  serviceOverview: machine.serviceItems.slice(0, 4).map((item) => ({ id: item.id, title: item.title, status: item.status, dueDate: item.due_date })),
                  incidentOverview: machine.incidentItems.slice(0, 4).map((item) => ({ id: item.id, title: item.title, status: item.status, dueDate: item.due_date })),
                  usage: { totalHours30d: formatHoursCompact(machine.usage.totalHours30d), activeOperator: machine.usage.activeReport?.worker_name ?? "Sin uso activo", activeSince: machine.usage.activeReport?.started_at ? `Desde ${format(new Date(machine.usage.activeReport.started_at), "d MMM · HH:mm", { locale: es })}` : "No hay sesión abierta", operators: machine.usage.uniqueOperators, recentTimeline: machine.usage.recentTimeline.map((item) => ({ id: item.id, workerName: item.workerName, startedAt: item.startedAt, endedAt: item.endedAt, durationLabel: formatHoursCompact(item.durationHours), isActive: item.isActive })) }
                })}
                className="w-full rounded-lg border border-border bg-background px-3 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{machine.display_name}</p>
                    <p className="text-xs text-muted-foreground">{machine.asset_family} · {machine.license_plate || "Sin matrícula"}</p>
                  </div>
                  <span className="rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-medium text-foreground">{machine.dueSoonCount} hitos</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{machine.openIncidents} incidencias abiertas · {machine.pendingServices} mantenimientos pendientes</p>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-3 lg:grid-cols-[360px_1fr]">
        {isAdmin && (
          <aside className="panel-surface p-4">
            <div className="mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">{editingId ? "Editar máquina" : "Nueva máquina"}</p></div>
            <div className="space-y-3">
              <Input value={form.display_name} onChange={(e) => setForm((current) => ({ ...current, display_name: e.target.value }))} placeholder="Nombre visible" />
              <Input value={form.asset_family} onChange={(e) => setForm((current) => ({ ...current, asset_family: e.target.value }))} placeholder="Familia" />
              <Input value={form.asset_code} onChange={(e) => setForm((current) => ({ ...current, asset_code: e.target.value }))} placeholder="Código interno" />
              <Input value={form.license_plate} onChange={(e) => setForm((current) => ({ ...current, license_plate: e.target.value }))} placeholder="Matrícula" />
              <Select value={form.status} onValueChange={(value: MachineStatus) => setForm((current) => ({ ...current, status: value }))}>
                <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Operativa</SelectItem>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  <SelectItem value="repair">Avería</SelectItem>
                  <SelectItem value="inspection">Inspección</SelectItem>
                  <SelectItem value="inactive">Inactiva</SelectItem>
                </SelectContent>
              </Select>
              <Textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Observaciones generales" className="min-h-24" />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => void saveMachine()}>Guardar</Button>
                {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm({ display_name: "", asset_family: "", asset_code: "", license_plate: "", status: "active", notes: "" }); }}>Cancelar</Button>}
              </div>
            </div>
          </aside>
        )}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredMachineCards.map((machine) => (
            <article key={machine.id} className="panel-surface p-4">
              <button className="w-full text-left" onClick={() => setSelectedMachine({ id: machine.id, name: machine.display_name, plate: machine.license_plate || "Sin matrícula", family: machine.asset_family, status: machine.status === "inactive" ? "inspection" : machine.status, focus: [machine.asset_code || "Sin código", machine.asset_family, `${machine.openIncidents} incidencias`, `${machine.pendingServices} servicios pendientes`], provider: "Proveedor pendiente", nextInspection: machine.serviceItems[0]?.due_date ? format(new Date(machine.serviceItems[0].due_date), "d MMM yyyy", { locale: es }) : "Sin revisión programada", nextIvt: machine.incidentItems[0]?.due_date ? format(new Date(machine.incidentItems[0].due_date), "d MMM yyyy", { locale: es }) : "Sin ITV registrada", fluids: ["Aceite motor", "Aceite hidráulico", "Anticongelante"], notes: machine.noteItems, priority: machine.riskLevel, serviceOverview: machine.serviceItems.slice(0, 4).map((item) => ({ id: item.id, title: item.title, status: item.status, dueDate: item.due_date })), incidentOverview: machine.incidentItems.slice(0, 4).map((item) => ({ id: item.id, title: item.title, status: item.status, dueDate: item.due_date })), usage: { totalHours30d: formatHoursCompact(machine.usage.totalHours30d), activeOperator: machine.usage.activeReport?.worker_name ?? "Sin uso activo", activeSince: machine.usage.activeReport?.started_at ? `Desde ${format(new Date(machine.usage.activeReport.started_at), "d MMM · HH:mm", { locale: es })}` : "No hay sesión abierta", operators: machine.usage.uniqueOperators, recentTimeline: machine.usage.recentTimeline.map((item) => ({ id: item.id, workerName: item.workerName, startedAt: item.startedAt, endedAt: item.endedAt, durationLabel: formatHoursCompact(item.durationHours), isActive: item.isActive })) } })}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{machine.display_name}</p>
                    <p className="text-sm text-muted-foreground">{machine.license_plate || "Sin matrícula"} · {machine.asset_family}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${machineStatusTone[machine.status]}`}>{machineStatusLabel[machine.status]}</span>
                </div>
              </button>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-muted px-2 py-3 text-foreground"><p className="font-semibold">{machine.noteItems.length}</p><p className="text-muted-foreground">Notas</p></div>
                <div className="rounded-xl bg-muted px-2 py-3 text-foreground"><p className="font-semibold">{formatHoursCompact(machine.usage.totalHours30d)}</p><p className="text-muted-foreground">Uso 30d</p></div>
                <div className="rounded-xl bg-muted px-2 py-3 text-foreground"><p className="font-semibold">{machine.usage.uniqueOperators}</p><p className="text-muted-foreground">Operarios</p></div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-background px-2.5 py-1 text-foreground">{machine.openIncidents} incidencias abiertas</span>
                <span className="rounded-full bg-background px-2.5 py-1 text-foreground">{machine.pendingServices} mantenimientos</span>
                <span className={`rounded-full px-2.5 py-1 ${machine.riskLevel === "critical" ? "bg-destructive/10 text-destructive" : machine.riskLevel === "attention" ? "bg-warning/15 text-foreground" : "bg-success/15 text-success"}`}>
                  {machine.riskLevel === "critical" ? "Crítica" : machine.riskLevel === "attention" ? "Atención" : "Estable"}
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-background px-3 py-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><Activity className="h-4 w-4 text-primary" /> Estado operativo</div>
                  <p className="mt-2 font-semibold text-foreground">{machine.usage.activeReport ? "En uso ahora" : "Sin uso activo"}</p>
                  <p className="text-xs text-muted-foreground">{machine.usage.lastActivityAt ? `Último movimiento ${format(new Date(machine.usage.lastActivityAt), "d MMM · HH:mm", { locale: es })}` : "Sin partes vinculados"}</p>
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><UserRound className="h-4 w-4 text-secondary" /> Taller y alertas</div>
                  <p className="mt-2 font-semibold text-foreground">{machine.upcomingService?.title ?? "Sin revisión inmediata"}</p>
                  <p className="text-xs text-muted-foreground">{machine.dueSoonCount > 0 ? `${machine.dueSoonCount} hitos vencidos o próximos` : `${machine.usage.sessions30d} jornadas en 30 días`}</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-background p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground"><TimerReset className="h-4 w-4 text-primary" /> Tiempos recientes</div>
                <div className="space-y-2 text-sm">
                  {machine.usage.recentTimeline.length === 0 ? <p className="text-muted-foreground">Sin uso operativo reciente.</p> : machine.usage.recentTimeline.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
                      <div>
                        <p className="font-medium text-foreground">{item.workerName}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(item.startedAt), "d MMM · HH:mm", { locale: es })}{item.endedAt ? ` → ${format(new Date(item.endedAt), "HH:mm", { locale: es })}` : " · En curso"}</p>
                      </div>
                      <span className="text-xs font-semibold text-foreground">{formatHoursCompact(item.durationHours)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Textarea value={drafts[machine.id] || ""} onChange={(e) => setDrafts((current) => ({ ...current, [machine.id]: e.target.value }))} placeholder="Nueva observación de seguimiento" className="min-h-20" />
                <Button className="w-full" variant="soft" onClick={() => void saveNote(machine.id)}><Wrench className="h-4 w-4" /> Guardar observación</Button>
              </div>

              <div className="mt-4 space-y-2">
                {(machine.noteItems.slice(0, 2)).map((note) => <div key={note.id} className="rounded-xl bg-muted px-3 py-3 text-sm text-foreground">{note.note}</div>)}
                {machine.noteItems.length === 0 && <p className="text-sm text-muted-foreground">Sin observaciones todavía.</p>}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => exportMachine(machine)}><Download className="h-4 w-4" /> Descargar</Button>
                {isAdmin && <Button size="sm" variant="outline" onClick={() => { setEditingId(machine.id); setForm({ display_name: machine.display_name, asset_family: machine.asset_family, asset_code: machine.asset_code || "", license_plate: machine.license_plate || "", status: machine.status, notes: machine.notes || "" }); }}><Pencil className="h-4 w-4" /> Editar</Button>}
                {isAdmin && <Button size="sm" variant="outline" onClick={() => void deleteMachine(machine.id)}><Trash2 className="h-4 w-4" /> Eliminar</Button>}
              </div>
            </article>
          ))}
          {filteredMachineCards.length === 0 && <div className="panel-surface col-span-full px-4 py-8 text-sm text-muted-foreground">No hay máquinas que coincidan con los filtros actuales.</div>}
        </section>
      </section>

      <MachineDetailDialog open={Boolean(selectedMachine)} machine={selectedMachine} onOpenChange={(open) => !open && setSelectedMachine(null)} />
    </div>
  );
};

export default MachineFleetView;