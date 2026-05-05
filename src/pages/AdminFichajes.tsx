import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Download, Calendar, Clock, ChevronDown, ChevronRight, Search, Filter, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, differenceInMinutes, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import WorkerLiveStatusPanel from "@/components/shared/WorkerLiveStatusPanel";
import { useWorkerLiveStatus } from "@/hooks/useWorkerLiveStatus";
import WorkerProfileDialog from "@/components/staff/WorkerProfileDialog";
import HoursBalancePanel from "@/components/shared/HoursBalancePanel";
import { formatMinutes, summarizeEntriesForRange } from "@/lib/time-balance";
import FichajeStatusCard from "@/components/fichajes/FichajeStatusCard";
import { useClockEntry } from "@/hooks/useClockEntry";
import AdminTimeEntryDialog from "@/components/admin/AdminTimeEntryDialog";

interface EntryWithProfile {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  profiles: { full_name: string } | null;
}

const AdminFichajes = () => {
  const { isAdmin, canViewAdmin } = useAuth();
  const { items: liveWorkers, loading: liveWorkersLoading, summary: liveSummary } = useWorkerLiveStatus();
  const { activeEntry: adminActiveEntry, entries: adminEntries, loading: adminClockLoading, toggleClock: adminToggleClock } = useClockEntry();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntryWithProfile[]>([]);
  const [staffColors, setStaffColors] = useState<Map<string, { color: string; staffId: string }>>(new Map());
  const [allStaff, setAllStaff] = useState<Array<{ id: string; full_name: string; color: string; linked_user_id: string | null }>>([]);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [editEntry, setEditEntry] = useState<EntryWithProfile | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const openCreate = () => { setEditEntry(null); setEditOpen(true); };
  const openEdit = (e: EntryWithProfile) => { setEditEntry(e); setEditOpen(true); };

  const toggleEmployee = (userId: string) => {
    setExpandedEmployees((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");

  const applyQuickRange = (mode: "today" | "week" | "month") => {
    const now = new Date();
    if (mode === "today") {
      const d = format(now, "yyyy-MM-dd");
      setDateFrom(d); setDateTo(d);
    } else if (mode === "week") {
      setDateFrom(format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"));
      setDateTo(format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"));
    } else {
      setDateFrom(format(startOfMonth(now), "yyyy-MM-dd"));
      setDateTo(format(endOfMonth(now), "yyyy-MM-dd"));
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Carga el mapa userId -> { color, staffId } una sola vez
  useEffect(() => {
    const loadStaffColors = async () => {
      const { data } = await (supabase as any)
        .from("staff_directory")
        .select("id, full_name, color_tag, linked_user_id")
        .eq("active", true)
        .order("sort_order");
      const map = new Map<string, { color: string; staffId: string }>();
      const list: Array<{ id: string; full_name: string; color: string; linked_user_id: string | null }> = [];
      const palette: Record<string, string> = {
        red: "#ef4444", indigo: "#6366f1", teal: "#14b8a6", slate: "#64748b",
        amber: "#f59e0b", blue: "#3b82f6", emerald: "#10b981", orange: "#f97316",
        violet: "#8b5cf6", cyan: "#06b6d4", rose: "#f43f5e", lime: "#84cc16", yellow: "#eab308",
      };
      const toHex = (tag: string | null) => {
        if (!tag) return "#4F5A7A";
        if (tag.startsWith("#")) return tag;
        return palette[tag] || "#4F5A7A";
      };
      (data ?? []).forEach((row: any) => {
        const color = toHex(row.color_tag);
        list.push({ id: row.id, full_name: row.full_name, color, linked_user_id: row.linked_user_id });
        if (row.linked_user_id) {
          map.set(row.linked_user_id, { color, staffId: row.id });
        }
      });
      setStaffColors(map);
      setAllStaff(list);
    };
    if (canViewAdmin) void loadStaffColors();
  }, [canViewAdmin]);

  useEffect(() => {
    if (canViewAdmin) fetchEntries();
  }, [canViewAdmin, dateFrom, dateTo]);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("time_entries")
      .select("id, user_id, clock_in, clock_out, profiles!inner(full_name)")
      .gte("clock_in", `${dateFrom}T00:00:00`)
      .lte("clock_in", `${dateTo}T23:59:59`)
      .order("clock_in", { ascending: false });

    if (data) setEntries(data as unknown as EntryWithProfile[]);
    if (error) toast.error("Error cargando datos");
    setLoading(false);
  };

  const formatDuration = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return "En curso";
    const mins = differenceInMinutes(new Date(clockOut), new Date(clockIn));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const getTotalHours = () => {
    let totalMins = 0;
    filteredEntries.forEach((e) => {
      if (e.clock_out) {
        totalMins += differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in));
      }
    });
    return `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;
  };

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (statusFilter === "open" && e.clock_out) return false;
      if (statusFilter === "closed" && !e.clock_out) return false;
      if (q && !(e.profiles?.full_name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, search, statusFilter]);

  const exportCSV = () => {
    const sep = ";";
    const headers = ["Empleado", "Fecha", "Entrada", "Salida", "Duración", "Minutos"].join(sep) + "\n";
    const rows = filteredEntries
      .map((e) => {
        const name = (e.profiles?.full_name ?? "Desconocido").replace(/;/g, ",");
        const date = format(new Date(e.clock_in), "dd/MM/yyyy");
        const inTime = format(new Date(e.clock_in), "HH:mm");
        const outTime = e.clock_out ? format(new Date(e.clock_out), "HH:mm") : "En curso";
        const dur = formatDuration(e.clock_in, e.clock_out);
        const mins = e.clock_out ? differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in)) : 0;
        return [name, date, inTime, outTime, dur, mins].join(sep);
      })
      .join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fichajes_transtubari_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV exportado (${filteredEntries.length} registros)`);
  };

  if (!canViewAdmin) {
    return (
      <div className="animate-fade-in text-center py-16">
        <p className="text-muted-foreground">No tienes permisos de administrador</p>
      </div>
    );
  }

  const byEmployee = filteredEntries.reduce<Record<string, { name: string; entries: EntryWithProfile[]; staffId?: string }>>(
    (acc, e) => {
      const name = e.profiles?.full_name ?? "Desconocido";
      if (!acc[e.user_id]) acc[e.user_id] = { name, entries: [] };
      acc[e.user_id].entries.push(e);
      return acc;
    },
    {}
  );
  // Añadir todos los trabajadores del directorio aunque no tengan fichajes,
  // para que aparezcan como "carpeta" abrible con su ficha (Abel, David, Jon, Raquel, etc.).
  allStaff.forEach((s) => {
    const key = s.linked_user_id ?? `staff:${s.id}`;
    if (!byEmployee[key]) {
      byEmployee[key] = { name: s.full_name, entries: [], staffId: s.id };
    }
  });
  const adminHoursSummary = summarizeEntriesForRange(filteredEntries, new Date(`${dateFrom}T00:00:00`), new Date(`${dateTo}T23:59:59`));

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6 gap-3 md:gap-4">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-foreground">Panel Admin — Fichajes</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Control de horas de todos los empleados {isAdmin ? "con permisos de gestión" : "en modo visualización"}</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          {isAdmin && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 md:mr-2" /> <span className="hidden sm:inline">Nuevo fichaje</span>
            </Button>
          )}
          <Button size="sm" onClick={exportCSV} variant="outline">
            <Download className="w-4 h-4 md:mr-2" /> <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* Fichaje propio del administrador */}
      <section className="mb-6 panel-surface p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tu fichaje</p>
        {(() => {
          const todayAdminEntries = adminEntries.filter((e) => new Date(e.clock_in).toDateString() === new Date().toDateString());
          const workedToday = todayAdminEntries.reduce(
            (acc, e) => acc + Math.max(0, differenceInMinutes(e.clock_out ? new Date(e.clock_out) : new Date(), new Date(e.clock_in))),
            0,
          );
          const workedLabel = `${Math.floor(workedToday / 60)}h ${workedToday % 60}m`;
          const sessionLabel = adminActiveEntry
            ? (() => {
                const mins = differenceInMinutes(new Date(), new Date(adminActiveEntry.clock_in));
                return `${Math.floor(mins / 60)}h ${mins % 60}m`;
              })()
            : "Sin jornada activa";
          const lastMovement = adminEntries[0]
            ? `${adminEntries[0].clock_out ? "Salida" : "Entrada"} ${format(new Date(adminEntries[0].clock_out ?? adminEntries[0].clock_in), "HH:mm")}`
            : "Sin registros";
          return (
            <FichajeStatusCard
              active={!!adminActiveEntry}
              loading={adminClockLoading}
              currentTime={currentTime}
              workedTodayLabel={workedLabel}
              currentSessionLabel={sessionLabel}
              lastMovementLabel={lastMovement}
              onPrimaryAction={() => void adminToggleClock()}
            />
          );
        })()}
      </section>

      {/* Filters */}
      <div className="panel-surface p-3 sm:p-4 mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[160px_160px_1fr_180px]">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-12 md:h-10" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-12 md:h-10" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Search className="h-3 w-3" /> Buscar trabajador</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre…" className="h-12 md:h-10" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Filter className="h-3 w-3" /> Estado</label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-12 md:h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">En curso</SelectItem>
                <SelectItem value="closed">Cerrados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => applyQuickRange("today")}>Hoy</Button>
          <Button size="sm" variant="outline" onClick={() => applyQuickRange("week")}>Esta semana</Button>
          <Button size="sm" variant="outline" onClick={() => applyQuickRange("month")}>Este mes</Button>
          {(search || statusFilter !== "all") && (
            <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Limpiar filtros</Button>
          )}
          <span className="ml-auto self-center text-xs text-muted-foreground">{filteredEntries.length} de {entries.length} fichajes</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
        <div className="bg-card border border-border rounded-lg p-3 md:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1 md:mb-2">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <span className="text-xs md:text-sm text-muted-foreground">Empleados</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-foreground">{Object.keys(byEmployee).length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 md:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1 md:mb-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-info" />
            <span className="text-xs md:text-sm text-muted-foreground">Fichajes</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-foreground">{filteredEntries.length}</p>
        </div>
        <div className="col-span-2 lg:col-span-1 bg-card border border-border rounded-lg p-3 md:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1 md:mb-2">
            <Clock className="w-4 h-4 md:w-5 md:h-5 text-success" />
            <span className="text-xs md:text-sm text-muted-foreground">Total Horas</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-foreground tabular-nums">{getTotalHours()}</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Trabajando</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{liveSummary.working}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-info" />
              <span className="text-sm text-muted-foreground">En pausa</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{liveSummary.paused}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Fuera</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{liveSummary.off}</p>
          </div>
        </div>

        <WorkerLiveStatusPanel
          items={liveWorkers}
          loading={liveWorkersLoading}
          title="Estado del equipo"
          description="Toca un trabajador para abrir su ficha en vivo."
          compact
          onSelectWorker={setSelectedWorkerId}
        />
        <WorkerProfileDialog staffId={selectedWorkerId} open={Boolean(selectedWorkerId)} onOpenChange={(open) => !open && setSelectedWorkerId(null)} />
      </div>

      <div className="mb-8 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <HoursBalancePanel
          summary={adminHoursSummary}
          title="Balance del rango"
          description="Cálculo global de horas frente al objetivo de 8h por día laborable dentro del rango filtrado."
        />

        <section className="panel-surface p-4 md:p-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Balance por trabajador</h2>
            <p className="mt-1 text-sm text-muted-foreground">Lectura rápida del rango seleccionado.</p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(byEmployee).map(([userId, { name, entries: empEntries }]) => {
              const personSummary = summarizeEntriesForRange(empEntries, new Date(`${dateFrom}T00:00:00`), new Date(`${dateTo}T23:59:59`));
              const staffInfo = staffColors.get(userId);
              const color = staffInfo?.color || "#4F5A7A";
              return (
                <div
                  key={userId}
                  onDoubleClick={() => staffInfo && setSelectedWorkerId(staffInfo.staffId)}
                  title={staffInfo ? "Doble clic para ver ficha completa" : undefined}
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-l-2 border-border bg-background p-3 transition-colors hover:bg-muted/30"
                  style={{ borderLeftColor: color, borderLeftWidth: "3px" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        className="mt-1 h-2 w-2 flex-none rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Trab. {formatMinutes(personSummary.workedMinutes)} · Ext. {formatMinutes(personSummary.overtimeMinutes)} · Falt. {formatMinutes(personSummary.missingMinutes)}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      {formatMinutes(personSummary.balanceMinutes)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* By employee — agrupados como carpetas individuales por trabajador */}
      {Object.entries(byEmployee).map(([userId, { name, entries: empEntries, staffId: directStaffId }]) => {
        const totalMins = empEntries.reduce(
          (sum, e) => sum + (e.clock_out ? differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in)) : 0),
          0
        );
        const staffInfo = staffColors.get(userId);
        const directStaff = directStaffId ? allStaff.find((s) => s.id === directStaffId) : null;
        const color = staffInfo?.color || directStaff?.color || "#4F5A7A";
        const resolvedStaffId = staffInfo?.staffId || directStaffId || null;
        const isExpanded = expandedEmployees.has(userId);
        return (
          <div key={userId} className="mb-3">
            <button
              type="button"
              onClick={() => toggleEmployee(userId)}
              className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
              style={{ borderLeft: `4px solid ${color}` }}
              onDoubleClick={(e) => {
                e.preventDefault();
                if (resolvedStaffId) setSelectedWorkerId(resolvedStaffId);
              }}
              title={resolvedStaffId ? "Clic para abrir/cerrar · doble clic para ver ficha" : "Clic para abrir/cerrar"}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <h3 className="font-semibold text-foreground">{name}</h3>
                <span className="text-xs text-muted-foreground">({empEntries.length} fichajes)</span>
              </div>
              <span className="text-sm font-medium text-primary">
                {Math.floor(totalMins / 60)}h {totalMins % 60}m total
              </span>
            </button>
            {isExpanded && (
              <div className="mt-2 space-y-2 pl-2">
                {empEntries.map((e) => (
                  <div key={e.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between gap-2 shadow-sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {format(new Date(e.clock_in), "EEEE d MMM", { locale: es })}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 tabular-nums">
                        <span className="text-foreground font-medium text-sm whitespace-nowrap">
                          {format(new Date(e.clock_in), "HH:mm")}
                        </span>
                        <span className="text-muted-foreground text-xs">→</span>
                        <span className="text-foreground font-medium text-sm whitespace-nowrap">
                          {e.clock_out ? format(new Date(e.clock_out), "HH:mm") : "En curso"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-1.5">
                      <span className={`text-xs md:text-sm font-semibold whitespace-nowrap tabular-nums ${e.clock_out ? "text-primary" : "text-success"}`}>
                        {formatDuration(e.clock_in, e.clock_out)}
                      </span>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(e)} title="Editar fichaje">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {entries.length === 0 && !loading && (
        <p className="text-muted-foreground text-center py-8">No hay fichajes en el rango seleccionado</p>
      )}

      <AdminTimeEntryDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        entry={editEntry ? { id: editEntry.id, user_id: editEntry.user_id, clock_in: editEntry.clock_in, clock_out: editEntry.clock_out, notes: null } : null}
        onSaved={fetchEntries}
      />
    </div>
  );
};

export default AdminFichajes;
