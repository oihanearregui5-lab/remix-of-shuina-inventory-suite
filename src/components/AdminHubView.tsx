import { useEffect, useState } from "react";
import { AlertTriangle, CalendarRange, Clock3, ShieldCheck, Truck, Users2, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { complianceHighlights, machineSeed, staffSeed } from "@/data/transtubari";

interface AdminMetrics {
  openTasks: number;
  openIncidents: number;
  serviceItems: number;
  activeClockings: number;
}

const AdminHubView = () => {
  const { isAdmin } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics>({
    openTasks: 0,
    openIncidents: 0,
    serviceItems: 0,
    activeClockings: 0,
  });

  useEffect(() => {
    if (isAdmin) {
      void loadMetrics();
    }
  }, [isAdmin]);

  const loadMetrics = async () => {
    const [tasksRes, incidentsRes, serviceRes, clockingsRes] = await Promise.all([
      supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "completed"),
      supabase.from("machine_incidents").select("id", { count: "exact", head: true }).neq("status", "resolved"),
      supabase.from("machine_service_records").select("id", { count: "exact", head: true }).neq("status", "completed"),
      supabase.from("time_entries").select("id", { count: "exact", head: true }).is("clock_out", null),
    ]);

    setMetrics({
      openTasks: tasksRes.count ?? 0,
      openIncidents: incidentsRes.count ?? 0,
      serviceItems: serviceRes.count ?? 0,
      activeClockings: clockingsRes.count ?? 0,
    });
  };

  if (!isAdmin) {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Esta sección solo está visible para jefes y encargados.</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Administración</h1>
        <p className="text-muted-foreground">Visión centralizada para responsables con control de personas, flota, tareas y cumplimiento.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm"><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4 text-primary" /> Fichajes activos</div><p className="text-3xl font-bold text-foreground">{metrics.activeClockings}</p></div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm"><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><CalendarRange className="h-4 w-4 text-secondary" /> Tareas abiertas</div><p className="text-3xl font-bold text-foreground">{metrics.openTasks}</p></div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm"><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4 text-warning" /> Averías pendientes</div><p className="text-3xl font-bold text-foreground">{metrics.openIncidents}</p></div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm"><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Wrench className="h-4 w-4 text-info" /> Mantenimientos</div><p className="text-3xl font-bold text-foreground">{metrics.serviceItems}</p></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><Users2 className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">Plantilla y responsables</h2></div>
          <div className="space-y-3">
            {staffSeed.map((person) => (
              <div key={person.name} className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{person.name}</p>
                  <p className="text-sm text-muted-foreground">{person.area}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${person.role === "manager" ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground"}`}>
                  {person.role === "manager" ? "Jefatura" : "Trabajador"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">Puntos de control</h2></div>
            <div className="space-y-3">
              {complianceHighlights.map((item) => (
                <div key={item} className="rounded-lg bg-muted px-4 py-3 text-sm text-foreground">{item}</div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><Truck className="h-4 w-4 text-secondary" /><h2 className="font-semibold text-foreground">Resumen de flota</h2></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted px-4 py-4"><p className="text-sm text-muted-foreground">Unidades registradas</p><p className="mt-1 text-2xl font-bold text-foreground">{machineSeed.length}</p></div>
              <div className="rounded-lg bg-muted px-4 py-4"><p className="text-sm text-muted-foreground">En revisión</p><p className="mt-1 text-2xl font-bold text-foreground">{machineSeed.filter((machine) => machine.status === "maintenance" || machine.status === "inspection").length}</p></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminHubView;