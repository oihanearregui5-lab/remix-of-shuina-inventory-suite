import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Download, Pencil, Plus, TimerReset, Trash2, UserRound, Wrench } from "lucide-react";
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

  const machineCards = useMemo(() => machines.map((machine) => ({
    ...machine,
    noteItems: notes.filter((note) => note.machine_id === machine.id),
    serviceItems: services.filter((service) => service.machine_id === machine.id),
    incidentItems: incidents.filter((incident) => incident.machine_id === machine.id),
    usage: buildMachineUsageSummary(machine, workReports),
  })), [incidents, machines, notes, services, workReports]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader eyebrow="Máquinas" title="Flota unificada" description="Mismo lenguaje visual, CRUD completo y descarga de toda la información relacionada por máquina." />
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
          {machineCards.map((machine) => (
            <article key={machine.id} className="panel-surface p-4">
              <button className="w-full text-left" onClick={() => setSelectedMachine({ id: machine.id, name: machine.display_name, plate: machine.license_plate || "Sin matrícula", family: machine.asset_family, status: machine.status === "inactive" ? "inspection" : machine.status, focus: [machine.asset_code || "Sin código", machine.asset_family], provider: "Proveedor pendiente", nextInspection: machine.serviceItems[0]?.due_date ? format(new Date(machine.serviceItems[0].due_date), "d MMM yyyy", { locale: es }) : "Sin revisión programada", nextIvt: machine.incidentItems[0]?.due_date ? format(new Date(machine.incidentItems[0].due_date), "d MMM yyyy", { locale: es }) : "Sin ITV registrada", fluids: ["Aceite motor", "Aceite hidráulico", "Anticongelante"], notes: machine.noteItems, usage: { totalHours30d: formatHoursCompact(machine.usage.totalHours30d), activeOperator: machine.usage.activeReport?.worker_name ?? "Sin uso activo", activeSince: machine.usage.activeReport?.started_at ? `Desde ${format(new Date(machine.usage.activeReport.started_at), "d MMM · HH:mm", { locale: es })}` : "No hay sesión abierta", operators: machine.usage.uniqueOperators, recentTimeline: machine.usage.recentTimeline.map((item) => ({ id: item.id, workerName: item.workerName, startedAt: item.startedAt, endedAt: item.endedAt, durationLabel: formatHoursCompact(item.durationHours), isActive: item.isActive })) } })}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{machine.display_name}</p>
                    <p className="text-sm text-muted-foreground">{machine.license_plate || "Sin matrícula"} · {machine.asset_family}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">{machine.status}</span>
                </div>
              </button>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-muted px-2 py-3 text-foreground"><p className="font-semibold">{machine.noteItems.length}</p><p className="text-muted-foreground">Notas</p></div>
                <div className="rounded-xl bg-muted px-2 py-3 text-foreground"><p className="font-semibold">{formatHoursCompact(machine.usage.totalHours30d)}</p><p className="text-muted-foreground">Uso 30d</p></div>
                <div className="rounded-xl bg-muted px-2 py-3 text-foreground"><p className="font-semibold">{machine.usage.uniqueOperators}</p><p className="text-muted-foreground">Operarios</p></div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-background px-3 py-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><Activity className="h-4 w-4 text-primary" /> Estado operativo</div>
                  <p className="mt-2 font-semibold text-foreground">{machine.usage.activeReport ? "En uso ahora" : "Sin uso activo"}</p>
                  <p className="text-xs text-muted-foreground">{machine.usage.lastActivityAt ? `Último movimiento ${format(new Date(machine.usage.lastActivityAt), "d MMM · HH:mm", { locale: es })}` : "Sin partes vinculados"}</p>
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><UserRound className="h-4 w-4 text-secondary" /> Último operario</div>
                  <p className="mt-2 font-semibold text-foreground">{machine.usage.lastOperator ?? "Sin asignar"}</p>
                  <p className="text-xs text-muted-foreground">{machine.usage.sessions30d} jornadas en 30 días</p>
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
          {machineCards.length === 0 && <div className="panel-surface col-span-full px-4 py-8 text-sm text-muted-foreground">Todavía no hay máquinas registradas.</div>}
        </section>
      </section>

      <MachineDetailDialog open={Boolean(selectedMachine)} machine={selectedMachine} onOpenChange={(open) => !open && setSelectedMachine(null)} />
    </div>
  );
};

export default MachineFleetView;