import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Camera, CheckCircle2, ClipboardList, Droplets, FileText, Loader2, Pencil, Plus, Save, ShieldCheck, Trash2, TrendingUp, Truck, Wrench, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================
// TIPOS
// ============================================================
interface MachineFull {
  id: string;
  display_name: string;
  asset_family: string;
  asset_code: string | null;
  license_plate: string | null;
  status: "active" | "maintenance" | "repair" | "inspection";
  notes: string | null;
  itv_last_date: string | null;
  itv_next_date: string | null;
  oil_last_date: string | null;
  oil_last_hours: number | null;
  oil_next_hours: number | null;
  hydraulic_oil_last_date: string | null;
  coolant_last_date: string | null;
  air_filter_last_date: string | null;
  fuel_filter_last_date: string | null;
  tires_last_check_date: string | null;
  insurance_expiry_date: string | null;
  technical_notes: string | null;
  watch_points: string[] | null;
}

interface IncidentRow {
  id: string;
  machine_id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  reported_by_user_id: string | null;
  created_at: string;
}

interface ServiceRow {
  id: string;
  machine_id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface MachineCardDialogProps {
  machineId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Opcional: callback para refrescar la lista al cerrar */
  onChanged?: () => void;
}

const MachineCardDialog = ({ machineId, open, onOpenChange, onChanged }: MachineCardDialogProps) => {
  const { user, canViewAdmin } = useAuth();
  const db = supabase as any;
  const [machine, setMachine] = useState<MachineFull | null>(null);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<string>("flota");

  // Edición de campos técnicos (solo admin)
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<MachineFull>>({});
  const [saving, setSaving] = useState(false);

  // Edición inline de bloques (solo admin)
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [editingWatch, setEditingWatch] = useState(false);
  const [watchDraft, setWatchDraft] = useState("");
  const [savingBlock, setSavingBlock] = useState(false);

  // Nueva avería (trabajador y admin)
  const [newIncident, setNewIncident] = useState({ title: "", description: "" });
  const [savingIncident, setSavingIncident] = useState(false);

  // Nuevo mantenimiento (admin)
  const [newService, setNewService] = useState({ title: "", description: "", due_date: "" });
  const [savingService, setSavingService] = useState(false);

  // ============ CARGA ============
  const loadAll = async () => {
    if (!machineId) return;
    setLoading(true);
    const [machineRes, incidentsRes, servicesRes] = await Promise.all([
      db.from("machine_assets").select("*").eq("id", machineId).maybeSingle(),
      db.from("machine_incidents").select("*").eq("machine_id", machineId).order("created_at", { ascending: false }),
      db.from("machine_service_records").select("*").eq("machine_id", machineId).order("created_at", { ascending: false }),
    ]);
    if (machineRes.error) {
      toast.error("No se pudo cargar la máquina");
      setLoading(false);
      return;
    }
    const m = machineRes.data as MachineFull;
    setMachine(m);
    setDraft(m);
    setIncidents((incidentsRes.data ?? []) as IncidentRow[]);
    setServices((servicesRes.data ?? []) as ServiceRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open && machineId) void loadAll();
    if (!open) {
      setEditing(false);
      setNewIncident({ title: "", description: "" });
      setNewService({ title: "", description: "", due_date: "" });
    }
  }, [open, machineId]);

  // ============ HANDLERS ============
  const saveTechnical = async () => {
    if (!machine) return;
    setSaving(true);
    const payload = {
      itv_last_date: draft.itv_last_date || null,
      itv_next_date: draft.itv_next_date || null,
      oil_last_date: draft.oil_last_date || null,
      oil_last_hours: draft.oil_last_hours ?? null,
      oil_next_hours: draft.oil_next_hours ?? null,
      hydraulic_oil_last_date: draft.hydraulic_oil_last_date || null,
      coolant_last_date: draft.coolant_last_date || null,
      air_filter_last_date: draft.air_filter_last_date || null,
      fuel_filter_last_date: draft.fuel_filter_last_date || null,
      tires_last_check_date: draft.tires_last_check_date || null,
      insurance_expiry_date: draft.insurance_expiry_date || null,
      technical_notes: draft.technical_notes || null,
    };
    const { error } = await db.from("machine_assets").update(payload).eq("id", machine.id);
    setSaving(false);
    if (error) return toast.error("No se pudo guardar");
    toast.success("Datos técnicos actualizados");
    setEditing(false);
    void loadAll();
    onChanged?.();
  };

  const addIncident = async () => {
    if (!machineId || !user) return;
    if (!newIncident.title.trim()) {
      toast.error("Indica un título para la avería");
      return;
    }
    setSavingIncident(true);
    const { error } = await db.from("machine_incidents").insert({
      machine_id: machineId,
      title: newIncident.title.trim(),
      description: newIncident.description.trim() || null,
      status: "open",
      reported_by_user_id: user.id,
    });
    setSavingIncident(false);
    if (error) return toast.error("No se pudo registrar la avería");
    toast.success("Avería registrada");
    setNewIncident({ title: "", description: "" });
    void loadAll();
    onChanged?.();
  };

  const resolveIncident = async (id: string) => {
    const { error } = await db.from("machine_incidents").update({ status: "resolved" }).eq("id", id);
    if (error) return toast.error("No se pudo resolver");
    toast.success("Avería resuelta");
    void loadAll();
    onChanged?.();
  };

  const reopenIncident = async (id: string) => {
    const { error } = await db.from("machine_incidents").update({ status: "open" }).eq("id", id);
    if (error) return toast.error("No se pudo reabrir");
    void loadAll();
    onChanged?.();
  };

  const deleteIncident = async (id: string) => {
    if (!window.confirm("¿Eliminar esta avería?")) return;
    const { error } = await db.from("machine_incidents").delete().eq("id", id);
    if (error) return toast.error("No se pudo eliminar");
    toast.success("Eliminada");
    void loadAll();
    onChanged?.();
  };

  const addService = async () => {
    if (!machineId) return;
    if (!newService.title.trim()) {
      toast.error("Título obligatorio");
      return;
    }
    setSavingService(true);
    const { error } = await db.from("machine_service_records").insert({
      machine_id: machineId,
      title: newService.title.trim(),
      description: newService.description.trim() || null,
      status: "pending",
      due_date: newService.due_date || null,
    });
    setSavingService(false);
    if (error) return toast.error("No se pudo guardar");
    toast.success("Mantenimiento añadido");
    setNewService({ title: "", description: "", due_date: "" });
    void loadAll();
    onChanged?.();
  };

  const completeService = async (id: string) => {
    const { error } = await db.from("machine_service_records").update({ status: "completed" }).eq("id", id);
    if (error) return toast.error("No se pudo completar");
    toast.success("Marcado como completado");
    void loadAll();
    onChanged?.();
  };

  // ============ DATOS DERIVADOS ============
  const openIncidents = useMemo(() => incidents.filter((i) => i.status !== "resolved"), [incidents]);
  const pendingServices = useMemo(() => services.filter((s) => s.status !== "completed"), [services]);

  if (!machineId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                {machine?.display_name ?? "Cargando..."}
                {openIncidents.length > 0 && (
                  <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground animate-pulse flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {openIncidents.length}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                {machine?.asset_family} {machine?.license_plate ? ` · ${machine.license_plate}` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading || !machine ? (
          <div className="space-y-3 py-8">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/50" />)}
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList className="!grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="flota" className="gap-2 py-2.5">
                <ClipboardList className="h-4 w-4" /> Flota
              </TabsTrigger>
              <TabsTrigger value="averias" className="gap-2 py-2.5">
                <AlertTriangle className="h-4 w-4" /> Averías
                {openIncidents.length > 0 && <span className="rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">{openIncidents.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="mantenimiento" className="gap-2 py-2.5">
                <Wrench className="h-4 w-4" /> Mantenimientos
                {pendingServices.length > 0 && <span className="rounded-full bg-warning px-1.5 text-[10px] font-bold text-foreground">{pendingServices.length}</span>}
              </TabsTrigger>
            </TabsList>

            {/* ===== TAB FLOTA ===== */}
            <TabsContent value="flota" className="space-y-3 mt-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Datos técnicos</p>
                {canViewAdmin && (
                  editing ? (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => void saveTechnical()} disabled={saving}>
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(machine); }}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                  )
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* ITV */}
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold uppercase tracking-wider">ITV</p>
                  </div>
                  {editing ? (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-[11px]">Última ITV</Label>
                        <Input type="date" value={draft.itv_last_date || ""} onChange={(e) => setDraft((d) => ({ ...d, itv_last_date: e.target.value }))} className="h-8" />
                      </div>
                      <div>
                        <Label className="text-[11px]">Próxima ITV</Label>
                        <Input type="date" value={draft.itv_next_date || ""} onChange={(e) => setDraft((d) => ({ ...d, itv_next_date: e.target.value }))} className="h-8" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs">
                      <p>Última: <span className="font-medium">{machine.itv_last_date ? format(new Date(machine.itv_last_date), "d MMM yyyy", { locale: es }) : "—"}</span></p>
                      <p>Próxima: <span className="font-medium">{machine.itv_next_date ? format(new Date(machine.itv_next_date), "d MMM yyyy", { locale: es }) : "—"}</span></p>
                    </div>
                  )}
                </div>

                {/* Aceite motor */}
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold uppercase tracking-wider">Aceite motor</p>
                  </div>
                  {editing ? (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-[11px]">Último cambio</Label>
                        <Input type="date" value={draft.oil_last_date || ""} onChange={(e) => setDraft((d) => ({ ...d, oil_last_date: e.target.value }))} className="h-8" />
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <Label className="text-[11px]">Horas última</Label>
                          <Input type="number" step="0.1" value={draft.oil_last_hours ?? ""} onChange={(e) => setDraft((d) => ({ ...d, oil_last_hours: e.target.value ? parseFloat(e.target.value) : null }))} className="h-8" />
                        </div>
                        <div>
                          <Label className="text-[11px]">Horas siguiente</Label>
                          <Input type="number" step="0.1" value={draft.oil_next_hours ?? ""} onChange={(e) => setDraft((d) => ({ ...d, oil_next_hours: e.target.value ? parseFloat(e.target.value) : null }))} className="h-8" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs">
                      <p>Último: <span className="font-medium">{machine.oil_last_date ? format(new Date(machine.oil_last_date), "d MMM yyyy", { locale: es }) : "—"}</span></p>
                      <p>Horas: <span className="font-medium">{machine.oil_last_hours ?? "—"} → {machine.oil_next_hours ?? "—"}</span></p>
                    </div>
                  )}
                </div>

                {/* Otros fluidos */}
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold uppercase tracking-wider">Otros fluidos / filtros</p>
                  </div>
                  {editing ? (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-[11px]">Aceite hidráulico</Label>
                        <Input type="date" value={draft.hydraulic_oil_last_date || ""} onChange={(e) => setDraft((d) => ({ ...d, hydraulic_oil_last_date: e.target.value }))} className="h-8" />
                      </div>
                      <div>
                        <Label className="text-[11px]">Refrigerante</Label>
                        <Input type="date" value={draft.coolant_last_date || ""} onChange={(e) => setDraft((d) => ({ ...d, coolant_last_date: e.target.value }))} className="h-8" />
                      </div>
                      <div>
                        <Label className="text-[11px]">Filtro aire</Label>
                        <Input type="date" value={draft.air_filter_last_date || ""} onChange={(e) => setDraft((d) => ({ ...d, air_filter_last_date: e.target.value }))} className="h-8" />
                      </div>
                      <div>
                        <Label className="text-[11px]">Filtro combustible</Label>
                        <Input type="date" value={draft.fuel_filter_last_date || ""} onChange={(e) => setDraft((d) => ({ ...d, fuel_filter_last_date: e.target.value }))} className="h-8" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs">
                      <p>Hidráulico: <span className="font-medium">{machine.hydraulic_oil_last_date ? format(new Date(machine.hydraulic_oil_last_date), "d MMM yyyy", { locale: es }) : "—"}</span></p>
                      <p>Refrigerante: <span className="font-medium">{machine.coolant_last_date ? format(new Date(machine.coolant_last_date), "d MMM yyyy", { locale: es }) : "—"}</span></p>
                      <p>Filtro aire: <span className="font-medium">{machine.air_filter_last_date ? format(new Date(machine.air_filter_last_date), "d MMM yyyy", { locale: es }) : "—"}</span></p>
                      <p>Filtro combustible: <span className="font-medium">{machine.fuel_filter_last_date ? format(new Date(machine.fuel_filter_last_date), "d MMM yyyy", { locale: es }) : "—"}</span></p>
                    </div>
                  )}
                </div>

                {/* Neumáticos y seguro */}
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold uppercase tracking-wider">Neumáticos y seguro</p>
                  </div>
                  {editing ? (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-[11px]">Última revisión neumáticos</Label>
                        <Input type="date" value={draft.tires_last_check_date || ""} onChange={(e) => setDraft((d) => ({ ...d, tires_last_check_date: e.target.value }))} className="h-8" />
                      </div>
                      <div>
                        <Label className="text-[11px]">Vencimiento seguro</Label>
                        <Input type="date" value={draft.insurance_expiry_date || ""} onChange={(e) => setDraft((d) => ({ ...d, insurance_expiry_date: e.target.value }))} className="h-8" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs">
                      <p>Neumáticos: <span className="font-medium">{machine.tires_last_check_date ? format(new Date(machine.tires_last_check_date), "d MMM yyyy", { locale: es }) : "—"}</span></p>
                      <p>Seguro vence: <span className="font-medium">{machine.insurance_expiry_date ? format(new Date(machine.insurance_expiry_date), "d MMM yyyy", { locale: es }) : "—"}</span></p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notas técnicas */}
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Notas técnicas</p>
                </div>
                {editing ? (
                  <Textarea value={draft.technical_notes || ""} onChange={(e) => setDraft((d) => ({ ...d, technical_notes: e.target.value }))} className="min-h-20" />
                ) : (
                  <p className="text-xs whitespace-pre-wrap">{machine.technical_notes || "—"}</p>
                )}
              </div>
            </TabsContent>

            {/* ===== TAB AVERÍAS ===== */}
            <TabsContent value="averias" className="space-y-3 mt-0">
              {/* Formulario nueva avería (todos los autenticados) */}
              <div className="rounded-xl border-2 border-dashed border-destructive/30 bg-destructive/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-destructive mb-2">Reportar avería</p>
                <div className="space-y-2">
                  <Input
                    placeholder="Título corto (ej: 'Pierde aceite hidráulico')"
                    value={newIncident.title}
                    onChange={(e) => setNewIncident((s) => ({ ...s, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Detalles, dónde, cuándo lo viste, etc."
                    value={newIncident.description}
                    onChange={(e) => setNewIncident((s) => ({ ...s, description: e.target.value }))}
                    className="min-h-16"
                  />
                  <Button onClick={() => void addIncident()} disabled={savingIncident || !newIncident.title.trim()} className="w-full">
                    {savingIncident ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Registrar avería
                  </Button>
                </div>
              </div>

              {/* Lista de averías */}
              {incidents.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">Sin averías registradas.</p>
              ) : (
                <ul className="space-y-2">
                  {incidents.map((inc) => {
                    const isOpen = inc.status !== "resolved";
                    return (
                      <li
                        key={inc.id}
                        className={cn(
                          "rounded-xl border p-3",
                          isOpen ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/20 opacity-70",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className={cn("font-semibold text-sm", isOpen && "text-destructive")}>
                              {isOpen && <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />}
                              {inc.title}
                            </p>
                            {inc.description && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{inc.description}</p>}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {format(new Date(inc.created_at), "d MMM yyyy · HH:mm", { locale: es })}
                            </p>
                          </div>
                          <div className="flex flex-none items-center gap-1">
                            {isOpen ? (
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-success" onClick={() => void resolveIncident(inc.id)}>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Resolver
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => void reopenIncident(inc.id)}>
                                Reabrir
                              </Button>
                            )}
                            {(canViewAdmin || inc.reported_by_user_id === user?.id) && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => void deleteIncident(inc.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            {/* ===== TAB MANTENIMIENTOS ===== */}
            <TabsContent value="mantenimiento" className="space-y-3 mt-0">
              {canViewAdmin && (
                <div className="rounded-xl border-2 border-dashed border-warning/30 bg-warning/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2">Nuevo mantenimiento</p>
                  <div className="space-y-2">
                    <Input
                      placeholder="Título (ej: 'Cambio de aceite cada 250h')"
                      value={newService.title}
                      onChange={(e) => setNewService((s) => ({ ...s, title: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Detalles del mantenimiento"
                      value={newService.description}
                      onChange={(e) => setNewService((s) => ({ ...s, description: e.target.value }))}
                      className="min-h-16"
                    />
                    <Input
                      type="date"
                      placeholder="Fecha límite"
                      value={newService.due_date}
                      onChange={(e) => setNewService((s) => ({ ...s, due_date: e.target.value }))}
                    />
                    <Button onClick={() => void addService()} disabled={savingService || !newService.title.trim()} className="w-full">
                      {savingService ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Añadir mantenimiento
                    </Button>
                  </div>
                </div>
              )}

              {services.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">Sin mantenimientos registrados.</p>
              ) : (
                <ul className="space-y-2">
                  {services.map((svc) => {
                    const isPending = svc.status !== "completed";
                    return (
                      <li
                        key={svc.id}
                        className={cn(
                          "rounded-xl border p-3",
                          isPending ? "border-warning/40 bg-warning/5" : "border-border bg-success/5 opacity-80",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm">
                              {!isPending && <CheckCircle2 className="inline h-3.5 w-3.5 mr-1 text-success" />}
                              {svc.title}
                            </p>
                            {svc.description && <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>}
                            {svc.due_date && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Fecha: {format(new Date(svc.due_date), "d MMM yyyy", { locale: es })}
                              </p>
                            )}
                          </div>
                          {isPending && canViewAdmin && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-success" onClick={() => void completeService(svc.id)}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Completar
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MachineCardDialog;
