import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Download, Calendar, Clock, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format, differenceInMinutes, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import WorkerLiveStatusPanel from "@/components/shared/WorkerLiveStatusPanel";
import { useWorkerLiveStatus } from "@/hooks/useWorkerLiveStatus";
import WorkerProfileDialog from "@/components/staff/WorkerProfileDialog";
import HoursBalancePanel from "@/components/shared/HoursBalancePanel";
import { formatMinutes, summarizeEntriesForRange } from "@/lib/time-balance";
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
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntryWithProfile[]>([]);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EntryWithProfile | null>(null);

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
    entries.forEach((e) => {
      if (e.clock_out) {
        totalMins += differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in));
      }
    });
    return `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;
  };

  const exportCSV = () => {
    const headers = "Empleado,Fecha,Entrada,Salida,Duración\n";
    const rows = entries
      .map((e) => {
        const name = e.profiles?.full_name ?? "Desconocido";
        const date = format(new Date(e.clock_in), "dd/MM/yyyy");
        const inTime = format(new Date(e.clock_in), "HH:mm");
        const outTime = e.clock_out ? format(new Date(e.clock_out), "HH:mm") : "En curso";
        const dur = formatDuration(e.clock_in, e.clock_out);
        return `${name},${date},${inTime},${outTime},${dur}`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fichajes_transtubari_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  if (!canViewAdmin) {
    return (
      <div className="animate-fade-in text-center py-16">
        <p className="text-muted-foreground">No tienes permisos de administrador</p>
      </div>
    );
  }

  const byEmployee = entries.reduce<Record<string, { name: string; entries: EntryWithProfile[] }>>(
    (acc, e) => {
      const name = e.profiles?.full_name ?? "Desconocido";
      if (!acc[e.user_id]) acc[e.user_id] = { name, entries: [] };
      acc[e.user_id].entries.push(e);
      return acc;
    },
    {}
  );
  const adminHoursSummary = summarizeEntriesForRange(entries, new Date(`${dateFrom}T00:00:00`), new Date(`${dateTo}T23:59:59`));

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel Admin — Fichajes</h1>
          <p className="text-muted-foreground mt-1">Control de horas de todos los empleados {isAdmin ? "con permisos de gestión" : "en modo visualización"}</p>
        </div>
        <div className="flex gap-2 self-start">
          {isAdmin && (
            <Button onClick={() => { setEditingEntry(null); setEntryDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo fichaje
            </Button>
          )}
          <Button onClick={exportCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Empleados</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{Object.keys(byEmployee).length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-info" />
            <span className="text-sm text-muted-foreground">Fichajes</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{entries.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-success" />
            <span className="text-sm text-muted-foreground">Total Horas</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{getTotalHours()}</p>
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
          <div className="mt-4 space-y-3">
            {Object.entries(byEmployee).map(([userId, { name, entries: empEntries }]) => {
              const personSummary = summarizeEntriesForRange(empEntries, new Date(`${dateFrom}T00:00:00`), new Date(`${dateTo}T23:59:59`));
              return (
                <div key={userId} className="rounded-xl border border-border bg-background px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Trabajadas {formatMinutes(personSummary.workedMinutes)} · Extra {formatMinutes(personSummary.overtimeMinutes)} · Faltantes {formatMinutes(personSummary.missingMinutes)}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                      {formatMinutes(personSummary.balanceMinutes)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* By employee */}
      {Object.entries(byEmployee).map(([userId, { name, entries: empEntries }]) => {
        const totalMins = empEntries.reduce(
          (sum, e) => sum + (e.clock_out ? differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in)) : 0),
          0
        );
        return (
          <div key={userId} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">{name}</h3>
              <span className="text-sm text-primary font-medium">
                {Math.floor(totalMins / 60)}h {totalMins % 60}m total
              </span>
            </div>
            <div className="space-y-2">
              {empEntries.map((e) => (
                <div key={e.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(e.clock_in), "EEEE d MMM", { locale: es })}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-foreground font-medium text-sm">
                        {format(new Date(e.clock_in), "HH:mm")}
                      </span>
                      <span className="text-muted-foreground text-xs">→</span>
                      <span className="text-foreground font-medium text-sm">
                        {e.clock_out ? format(new Date(e.clock_out), "HH:mm") : "En curso"}
                      </span>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${e.clock_out ? "text-primary" : "text-success"}`}>
                    {formatDuration(e.clock_in, e.clock_out)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {entries.length === 0 && !loading && (
        <p className="text-muted-foreground text-center py-8">No hay fichajes en el rango seleccionado</p>
      )}
    </div>
  );
};

export default AdminFichajes;
