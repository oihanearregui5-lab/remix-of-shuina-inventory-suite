import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUIMode } from "@/hooks/useUIMode";
import PageHeader from "@/components/shared/PageHeader";
import MachineDetailDialog, { type MachineDialogItem } from "@/components/machines/MachineDetailDialog";
import MachineCardDialog from "@/components/machines/MachineCardDialog";
import MachinePhotosDialog from "@/components/machines/MachinePhotosDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { buildMachineUsageSummary, formatHoursCompact, type MachineUsageReport } from "@/lib/machine-usage";
import { evaluateExpiry, severityRank, type ExpirySeverity } from "@/lib/machine-expiry";
import { cn } from "@/lib/utils";
import baneraTisvolImage from "@/assets/banera-tisvol-r6823bdp.jpg";
import camionicoNissanImage from "@/assets/camionico-nissan-3971bkd.jpg";
import komatsuImage from "@/assets/komatsu.jpg";
import liebherrImage from "@/assets/liebherr-900.jpg";
import palaVolvoImage from "@/assets/pala-volvo-vieja-220.jpg";
import retroHitachiImage from "@/assets/retro-hitachi.jpg";
import scaniaAzulImage from "@/assets/scania-azul-3930jjd.jpg";
import volvoNuevaImage from "@/assets/volvo-nueva-150.jpg";
import wirtgen2100Image from "@/assets/wirtgen-2100.jpg";
import wirtgen2200SmImage from "@/assets/wirtgen-2200-sm.jpg";

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

const machineVisuals: Record<string, string> = {
  "banera-tisvol-r6823bdp": baneraTisvolImage,
  "camionico-nissan-3971bkd": camionicoNissanImage,
  komatsu: komatsuImage,
  "liebherr-900": liebherrImage,
  "pala-volvo-vieja-220": palaVolvoImage,
  "retro-hitachi": retroHitachiImage,
  "scania-azul-3930jjd": scaniaAzulImage,
  "volvo-nueva-150": volvoNuevaImage,
  "wirtgen-2100": wirtgen2100Image,
  "wirtgen-2200-sm": wirtgen2200SmImage,
};

// Mapeo adicional por nombre/matrícula normalizados.
// Permite que la foto se vincule aunque la máquina de Supabase tenga un UUID
// distinto al id del seed. El matching se hace sobre nombre visible o matrícula.
const normalize = (value: string | null | undefined): string =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const machineVisualsByName: Record<string, string> = {
  "banera-tisvol": baneraTisvolImage,
  "r6823bdp": baneraTisvolImage,
  "camionico-nissan": camionicoNissanImage,
  "3971-bkd": camionicoNissanImage,
  "komatsu": komatsuImage,
  "liebherr-900": liebherrImage,
  "liebherr": liebherrImage,
  "pala-volvo-vieja-220": palaVolvoImage,
  "pala-volvo-220": palaVolvoImage,
  "retro-hitachi": retroHitachiImage,
  "scania-azul": scaniaAzulImage,
  "3930-jjd": scaniaAzulImage,
  "volvo-nueva-150": volvoNuevaImage,
  "volvo-150": volvoNuevaImage,
  "wirtgen-2100": wirtgen2100Image,
  "wirtgen-2200-sm": wirtgen2200SmImage,
  "wirtgen-2200": wirtgen2200SmImage,
};

const resolveMachineImage = (machine: { id: string; display_name: string; license_plate: string | null }): string | null => {
  // 1) Si el id coincide con el seed → usamos esa
  const bySeedId = machineVisuals[machine.id];
  if (bySeedId) return bySeedId;
  // 2) Buscar por nombre normalizado
  const byName = machineVisualsByName[normalize(machine.display_name)];
  if (byName) return byName;
  // 3) Buscar por matrícula normalizada
  if (machine.license_plate) {
    const byPlate = machineVisualsByName[normalize(machine.license_plate)];
    if (byPlate) return byPlate;
  }
  return null;
};

interface MachineAssetItem {
  id: string;
  display_name: string;
  asset_family: string;
  asset_code: string | null;
  license_plate: string | null;
  status: MachineStatus;
  notes: string | null;
  photo_url?: string | null;
  // Campos técnicos (Tanda 1 SQL)
  itv_last_date?: string | null;
  itv_next_date?: string | null;
  oil_last_date?: string | null;
  oil_last_hours?: number | null;
  oil_next_hours?: number | null;
  hydraulic_oil_last_date?: string | null;
  air_filter_last_date?: string | null;
  fuel_filter_last_date?: string | null;
  coolant_last_date?: string | null;
  tires_last_check_date?: string | null;
  insurance_expiry_date?: string | null;
  technical_notes?: string | null;
  provider_name?: string | null;
  provider_contact?: string | null;
  provider_notes?: string | null;
  next_inspection_date?: string | null;
}

interface MachineNoteItem { id: string; machine_id: string; note: string; is_highlight: boolean; created_at: string }
interface ServiceItem { id: string; machine_id: string; title: string; due_date: string | null; status: string }
interface IncidentItem { id: string; machine_id: string; title: string; status: string; due_date: string | null }
interface WorkReportItem extends MachineUsageReport {}

const emptyForm = { display_name: "", asset_family: "", asset_code: "", license_plate: "", status: "active" as MachineStatus, notes: "" };

const MachineFleetView = () => {
  const { user, isAdmin } = useAuth();
  const { isSimple } = useUIMode();
  const db = supabase as any;

  const [machines, setMachines] = useState<MachineAssetItem[]>([]);
  const [notes, setNotes] = useState<MachineNoteItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [workReports, setWorkReports] = useState<WorkReportItem[]>([]);
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});

  const [selectedMachine, setSelectedMachine] = useState<MachineDialogItem | null>(null);
  const [cardDialogId, setCardDialogId] = useState<string | null>(null);
  const [photosDialog, setPhotosDialog] = useState<{ id: string; name: string } | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [density, setDensity] = useState<"comfy" | "compact">(() => {
    if (typeof window === "undefined") return "comfy";
    return (window.localStorage.getItem("transtubari-machines-density") as "comfy" | "compact") || "comfy";
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<MachineStatus | "all">("all");

  const toggleDensity = () => {
    const next = density === "comfy" ? "compact" : "comfy";
    setDensity(next);
    if (typeof window !== "undefined") window.localStorage.setItem("transtubari-machines-density", next);
  };

  useEffect(() => {
    if (!user) return;
    void Promise.all([fetchMachines(), fetchNotes(), fetchServices(), fetchIncidents(), fetchWorkReports(), fetchPhotoCounts()]);
  }, [user]);

  const fetchMachines = async () => {
    const { data, error } = await db
      .from("machine_assets")
      .select("id, display_name, asset_family, asset_code, license_plate, status, notes, photo_url, itv_last_date, itv_next_date, oil_last_date, oil_last_hours, oil_next_hours, hydraulic_oil_last_date, air_filter_last_date, fuel_filter_last_date, coolant_last_date, tires_last_check_date, insurance_expiry_date, technical_notes, provider_name, provider_contact, provider_notes, next_inspection_date")
      .order("display_name");
    if (error) return toast.error("No se pudieron cargar las máquinas");
    setMachines((data ?? []) as MachineAssetItem[]);
  };
  const fetchNotes = async () => {
    const { data } = await db.from("machine_notes").select("id, machine_id, note, is_highlight, created_at").order("created_at", { ascending: false }).limit(300);
    setNotes((data ?? []) as MachineNoteItem[]);
  };
  const fetchServices = async () => {
    const { data } = await db.from("machine_service_records").select("id, machine_id, title, due_date, status").order("due_date");
    setServices((data ?? []) as ServiceItem[]);
  };
  const fetchIncidents = async () => {
    const { data } = await db.from("machine_incidents").select("id, machine_id, title, due_date, status").order("created_at", { ascending: false });
    setIncidents((data ?? []) as IncidentItem[]);
  };
  const fetchWorkReports = async () => {
    const { data } = await db.from("work_reports").select("id, machine, worker_name, started_at, ended_at").order("started_at", { ascending: false }).limit(500);
    setWorkReports((data ?? []) as WorkReportItem[]);
  };
  const fetchPhotoCounts = async () => {
    const { data } = await db.from("machine_photos").select("machine_id");
    const counts: Record<string, number> = {};
    ((data ?? []) as Array<{ machine_id: string }>).forEach((row) => {
      counts[row.machine_id] = (counts[row.machine_id] ?? 0) + 1;
    });
    setPhotoCounts(counts);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormDialogOpen(true);
  };

  const openEdit = (machine: MachineAssetItem) => {
    setEditingId(machine.id);
    setForm({
      display_name: machine.display_name,
      asset_family: machine.asset_family,
      asset_code: machine.asset_code || "",
      license_plate: machine.license_plate || "",
      status: machine.status,
      notes: machine.notes || "",
    });
    setFormDialogOpen(true);
  };

  const saveMachine = async (keepOpen = false) => {
    if (!form.display_name.trim() || !form.asset_family.trim()) {
      toast.error("Nombre y familia son obligatorios");
      return;
    }
    const payload = {
      display_name: form.display_name.trim(),
      asset_family: form.asset_family.trim(),
      asset_code: form.asset_code.trim() || null,
      license_plate: form.license_plate.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
    };
    const { error } = editingId
      ? await db.from("machine_assets").update(payload).eq("id", editingId)
      : await db.from("machine_assets").insert(payload);
    if (error) return toast.error(editingId ? "No se pudo editar la máquina" : "No se pudo crear la máquina");
    toast.success(editingId ? "Máquina actualizada" : "Máquina creada");
    setEditingId(null);
    setForm(emptyForm);
    if (!keepOpen) setFormDialogOpen(false);
    void fetchMachines();
  };

  const deleteMachine = async (machineId: string) => {
    if (!window.confirm("¿Eliminar esta máquina?")) return;
    const { error } = await db.from("machine_assets").delete().eq("id", machineId);
    if (error) return toast.error("No se pudo eliminar la máquina");
    toast.success("Máquina eliminada");
    void fetchMachines();
  };

  const machineCards = useMemo(
    () =>
      machines.map((machine) => {
        const noteItems = notes.filter((note) => note.machine_id === machine.id);
        const serviceItems = services.filter((service) => service.machine_id === machine.id);
        const incidentItems = incidents.filter((incident) => incident.machine_id === machine.id);
        const usage = buildMachineUsageSummary(machine, workReports);
        const openIncidents = incidentItems.filter((incident) => incident.status !== "resolved").length;
        const pendingServices = serviceItems.filter((service) => service.status !== "completed").length;
        const riskScore =
          (machine.status === "repair" ? 4 : 0) +
          (machine.status === "maintenance" ? 2 : 0) +
          (machine.status === "inspection" ? 2 : 0) +
          openIncidents * 2 +
          pendingServices;
        const riskLevel: "critical" | "attention" | "stable" =
          riskScore >= 6 ? "critical" : riskScore >= 3 ? "attention" : "stable";

        const itvExpiry = evaluateExpiry(machine.itv_next_date);
        const insuranceExpiry = evaluateExpiry(machine.insurance_expiry_date);
        const worstSeverity: ExpirySeverity =
          severityRank[itvExpiry.severity] >= severityRank[insuranceExpiry.severity]
            ? itvExpiry.severity
            : insuranceExpiry.severity;

        return {
          ...machine,
          visual: machine.photo_url || resolveMachineImage(machine) || null,
          noteItems,
          serviceItems,
          incidentItems,
          usage,
          openIncidents,
          pendingServices,
          riskLevel,
          photoCount: photoCounts[machine.id] ?? 0,
          itvExpiry,
          insuranceExpiry,
          worstSeverity,
        };
      }),
    [incidents, machines, notes, services, workReports, photoCounts],
  );

  const fleetSummary = useMemo(
    () => ({
      total: machineCards.length,
      activeNow: machineCards.filter((machine) => Boolean(machine.usage.activeReport)).length,
      inRepair: machineCards.filter((machine) => machine.status === "repair").length,
      withAlerts: machineCards.filter((machine) => machine.riskLevel !== "stable").length,
    }),
    [machineCards],
  );

  const filteredMachineCards = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return machineCards.filter((machine) => {
      const matchesStatus = statusFilter === "all" || machine.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        [machine.display_name, machine.asset_family, machine.license_plate, machine.asset_code]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesSearch;
    });
  }, [machineCards, searchTerm, statusFilter]);

  const openDetail = (machine: (typeof machineCards)[number]) => {
    setSelectedMachine({
      id: machine.id,
      name: machine.display_name,
      plate: machine.license_plate || "Sin matrícula",
      family: machine.asset_family,
      status: machine.status === "inactive" ? "inspection" : machine.status,
      focus: [machine.asset_code || "Sin código", machine.asset_family],
      provider: machine.provider_name || "Proveedor pendiente",
      providerContact: machine.provider_contact || null,
      providerNotes: machine.provider_notes || null,
      generalNotes: machine.notes || null,
      nextInspection: machine.next_inspection_date || machine.serviceItems[0]?.due_date || "Sin revisión programada",
      nextIvt: machine.itv_next_date || "Sin ITV registrada",
      fluids: [],
      technical: {
        itvLast: machine.itv_last_date ?? null,
        itvNext: machine.itv_next_date ?? null,
        oilLastDate: machine.oil_last_date ?? null,
        oilLastHours: machine.oil_last_hours ?? null,
        oilNextHours: machine.oil_next_hours ?? null,
        hydraulicOilLast: machine.hydraulic_oil_last_date ?? null,
        airFilterLast: machine.air_filter_last_date ?? null,
        fuelFilterLast: machine.fuel_filter_last_date ?? null,
        coolantLast: machine.coolant_last_date ?? null,
        tiresLastCheck: machine.tires_last_check_date ?? null,
        insuranceExpiry: machine.insurance_expiry_date ?? null,
        notes: machine.technical_notes ?? null,
      },
      notes: machine.noteItems,
      priority: machine.riskLevel,
      serviceOverview: machine.serviceItems.slice(0, 4).map((item) => ({ id: item.id, title: item.title, status: item.status, dueDate: item.due_date })),
      incidentOverview: machine.incidentItems.slice(0, 4).map((item) => ({ id: item.id, title: item.title, status: item.status, dueDate: item.due_date })),
      usage: {
        totalHours30d: formatHoursCompact(machine.usage.totalHours30d),
        activeOperator: machine.usage.activeReport?.worker_name ?? "Sin uso activo",
        activeSince: machine.usage.activeReport?.started_at ?? "No hay sesión abierta",
        operators: machine.usage.uniqueOperators,
        recentTimeline: machine.usage.recentTimeline.map((item) => ({
          id: item.id,
          workerName: item.workerName,
          startedAt: item.startedAt,
          endedAt: item.endedAt,
          durationLabel: formatHoursCompact(item.durationHours),
          isActive: item.isActive,
        })),
      },
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        eyebrow="Máquinas"
        title="Flota"
        description="Estado, mantenimiento y fotos de cada unidad."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDensity}
              title={density === "comfy" ? "Pasar a vista compacta (4 columnas)" : "Pasar a vista espaciada (3 columnas)"}
            >
              {density === "comfy" ? "Vista compacta" : "Vista espaciada"}
            </Button>
            {isAdmin ? (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Nueva máquina
              </Button>
            ) : null}
          </div>
        }
      />

      {!isSimple && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="panel-surface p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Flota</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{fleetSummary.total}</p>
          </article>
          <article className="panel-surface p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">En uso ahora</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{fleetSummary.activeNow}</p>
          </article>
          <article className="panel-surface p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Averías</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{fleetSummary.inRepair}</p>
          </article>
          <article className="panel-surface p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Con alertas</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{fleetSummary.withAlerts}</p>
          </article>
        </section>
      )}

      {/* Filtros */}
      <section className="panel-surface p-3 md:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar máquina, familia o matrícula"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: MachineStatus | "all") => setStatusFilter(value)}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
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
      </section>

      {/* Grid de tarjetas compactas */}
      {filteredMachineCards.length === 0 ? (
        <div className="panel-surface p-8 text-center text-sm text-muted-foreground">
          No hay máquinas que coincidan con los filtros actuales.
        </div>
      ) : (
        <section className={cn(
          "grid",
          density === "compact"
            ? "gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "gap-5 sm:grid-cols-2 lg:grid-cols-3",
        )}>
          {filteredMachineCards.map((machine) => (
            <article key={machine.id} className="panel-surface flex flex-col overflow-hidden p-0">
              {/* Foto con overlay de fotos disponibles */}
              <button
                type="button"
                onClick={() => openDetail(machine)}
                className="group relative block aspect-[16/10] w-full overflow-hidden bg-muted"
              >
                {machine.visual ? (
                  <img
                    src={machine.visual}
                    alt={machine.display_name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                    <Camera className="h-8 w-8" />
                    <span className="text-[10px] uppercase tracking-wider">Sin foto</span>
                  </div>
                )}
                {machine.photoCount > 0 && (
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                    <Camera className="h-3 w-3" />
                    {machine.photoCount}
                  </span>
                )}
              </button>

              {/* Info compacta */}
              <div className="flex flex-1 flex-col gap-2 p-3">
                <button type="button" onClick={() => openDetail(machine)} className="text-left">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{machine.display_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {machine.license_plate || "Sin matrícula"} · {machine.asset_family}
                      </p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", machineStatusTone[machine.status])}>
                      {machineStatusLabel[machine.status]}
                    </span>
                  </div>
                </button>

                {/* Chips de info rápida */}
                {(machine.openIncidents > 0 || machine.pendingServices > 0) && (
                  <p className="text-xs text-muted-foreground">
                    {machine.openIncidents > 0 && <span className="mr-2 font-medium text-destructive">{machine.openIncidents} avería{machine.openIncidents > 1 ? "s" : ""}</span>}
                    {machine.pendingServices > 0 && <span className="font-medium text-foreground">{machine.pendingServices} mantenimiento{machine.pendingServices > 1 ? "s" : ""}</span>}
                  </p>
                )}

                {(machine.itvExpiry.severity === "expired" || machine.itvExpiry.severity === "urgent" ||
                  machine.insuranceExpiry.severity === "expired" || machine.insuranceExpiry.severity === "urgent") && (
                  <div className="flex flex-wrap gap-1.5">
                    {(machine.itvExpiry.severity === "expired" || machine.itvExpiry.severity === "urgent") && (
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        machine.itvExpiry.severity === "expired" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-warning/40 bg-warning/15 text-foreground")}>
                        <AlertTriangle className="h-3 w-3" />
                        ITV {machine.itvExpiry.severity === "expired" ? `vencida (${Math.abs(machine.itvExpiry.days!)}d)` : `en ${machine.itvExpiry.days}d`}
                      </span>
                    )}
                    {(machine.insuranceExpiry.severity === "expired" || machine.insuranceExpiry.severity === "urgent") && (
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        machine.insuranceExpiry.severity === "expired" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-warning/40 bg-warning/15 text-foreground")}>
                        <AlertTriangle className="h-3 w-3" />
                        Seguro {machine.insuranceExpiry.severity === "expired" ? `vencido (${Math.abs(machine.insuranceExpiry.days!)}d)` : `en ${machine.insuranceExpiry.days}d`}
                      </span>
                    )}
                  </div>
                )}

                {machine.riskLevel === "critical" && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Atención prioritaria
                  </div>
                )}

                {/* Acciones */}
                <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 gap-1 px-2 text-xs"
                    onClick={() => setCardDialogId(machine.id)}
                    title="Ficha completa con tabs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Ficha
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 px-2 text-xs"
                    onClick={() => setPhotosDialog({ id: machine.id, name: machine.display_name })}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {machine.photoCount > 0 ? `Ver fotos (${machine.photoCount})` : "Fotos"}
                  </Button>
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(machine)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void deleteMachine(machine.id)} title="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Ficha completa con tabs (Tanda 5 v4) */}
      <MachineCardDialog
        machineId={cardDialogId}
        open={Boolean(cardDialogId)}
        onOpenChange={(o) => !o && setCardDialogId(null)}
        onChanged={() => void fetchMachines()}
      />

      {/* Detalle */}
      <MachineDetailDialog
        open={Boolean(selectedMachine)}
        machine={selectedMachine}
        onOpenChange={(open) => !open && setSelectedMachine(null)}
        canEdit={isAdmin}
        onSaveTechnical={async (machineId, patch) => {
          const { error } = await db.from("machine_assets").update(patch).eq("id", machineId);
          if (error) throw error;
          await fetchMachines();
          // refrescar el dialog con nuevos datos
          setSelectedMachine((current) => {
            if (!current || current.id !== machineId) return current;
            return {
              ...current,
              technical: {
                ...current.technical!,
                itvLast: (patch.itv_last_date as string) ?? null,
                itvNext: (patch.itv_next_date as string) ?? null,
                oilLastDate: (patch.oil_last_date as string) ?? null,
                oilLastHours: (patch.oil_last_hours as number) ?? null,
                oilNextHours: (patch.oil_next_hours as number) ?? null,
                hydraulicOilLast: (patch.hydraulic_oil_last_date as string) ?? null,
                airFilterLast: (patch.air_filter_last_date as string) ?? null,
                fuelFilterLast: (patch.fuel_filter_last_date as string) ?? null,
                coolantLast: (patch.coolant_last_date as string) ?? null,
                tiresLastCheck: (patch.tires_last_check_date as string) ?? null,
                insuranceExpiry: (patch.insurance_expiry_date as string) ?? null,
                notes: (patch.technical_notes as string) ?? null,
              },
            };
          });
        }}
      />

      {/* Fotos */}
      <MachinePhotosDialog
        open={Boolean(photosDialog)}
        machineId={photosDialog?.id ?? null}
        machineName={photosDialog?.name ?? ""}
        onOpenChange={(open) => !open && setPhotosDialog(null)}
        onCountChange={(machineId, count) => setPhotoCounts((current) => ({ ...current, [machineId]: count }))}
      />

      {/* Dialog alta/edición */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar máquina" : "Nueva máquina"}</DialogTitle>
            <DialogDescription>Datos básicos de la unidad. Las fotos y el detalle se gestionan desde la tarjeta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Nombre de la máquina" />
            <Input value={form.asset_family} onChange={(e) => setForm({ ...form, asset_family: e.target.value })} placeholder="Familia (pala, camión, etc.)" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={form.asset_code} onChange={(e) => setForm({ ...form, asset_code: e.target.value })} placeholder="Código" />
              <Input value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value })} placeholder="Matrícula" />
            </div>
            <Select value={form.status} onValueChange={(value: MachineStatus) => setForm({ ...form, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Operativa</SelectItem>
                <SelectItem value="maintenance">Mantenimiento</SelectItem>
                <SelectItem value="repair">Avería</SelectItem>
                <SelectItem value="inspection">Inspección</SelectItem>
                <SelectItem value="inactive">Inactiva</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones" className="min-h-20" />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button className="flex-1 min-w-[140px]" onClick={() => void saveMachine(false)}>
                {editingId ? "Guardar cambios" : "Crear máquina"}
              </Button>
              {!editingId && (
                <Button variant="outline" className="flex-1 min-w-[140px]" onClick={() => void saveMachine(true)}>
                  Crear y añadir otra
                </Button>
              )}
              <Button variant="ghost" onClick={() => setFormDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MachineFleetView;
