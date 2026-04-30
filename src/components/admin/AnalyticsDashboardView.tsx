import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Clock,
  FileText,
  Fuel,
  Loader2,
  ReceiptText,
  ShieldAlert,
  Truck,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Period = "week" | "month" | "year";

interface KpiState {
  // personal
  hoursWorked: number | null;
  activeWorkers: number | null;
  pendingVacations: number | null;
  lateArrivals: number | null;
  // operativa
  closedReports: number | null;
  tonsMoved: number | null;
  deliveryNotes: number | null;
  tolvaTrips: number | null;
  // flota
  maintenanceDone: number | null;
  openIncidents: number | null;
  upcomingItv: number | null;
}

interface TonsByDay {
  date: string;
  label: string;
  tons: number;
}

interface HoursByWorker {
  name: string;
  hours: number;
  color: string;
}

interface TripDist {
  name: string;
  value: number;
  color: string;
}

interface AlertItem {
  id: string;
  icon: typeof AlertTriangle;
  title: string;
  detail: string;
  target?: string;
}

const EMPTY: KpiState = {
  hoursWorked: null,
  activeWorkers: null,
  pendingVacations: null,
  lateArrivals: null,
  closedReports: null,
  tonsMoved: null,
  deliveryNotes: null,
  tolvaTrips: null,
  maintenanceDone: null,
  openIncidents: null,
  upcomingItv: null,
};

const periodToRange = (period: Period): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();
  if (period === "week") start.setDate(start.getDate() - 7);
  else if (period === "month") start.setDate(start.getDate() - 30);
  else start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
};

const fmtIso = (d: Date) => d.toISOString();
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

const Skeleton = () => <div className="h-7 w-16 animate-pulse rounded bg-muted" />;

interface KpiCardProps {
  icon: typeof Clock;
  label: string;
  value: number | null;
  hint?: string;
  format?: (n: number) => string;
  tone?: "primary" | "secondary" | "warning" | "destructive";
}

const KpiCard = ({ icon: Icon, label, value, hint, format: fmt, tone = "primary" }: KpiCardProps) => {
  const toneClass = {
    primary: "text-primary",
    secondary: "text-secondary-foreground",
    warning: "text-amber-500",
    destructive: "text-destructive",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className={`h-4 w-4 ${toneClass}`} /> {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-foreground">
        {value === null ? <Skeleton /> : fmt ? fmt(value) : value.toLocaleString("es-ES")}
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
};

const AnalyticsDashboardView = () => {
  const [period, setPeriod] = useState<Period>("month");
  const [kpis, setKpis] = useState<KpiState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [tonsByDay, setTonsByDay] = useState<TonsByDay[]>([]);
  const [hoursByWorker, setHoursByWorker] = useState<HoursByWorker[]>([]);
  const [tripDist, setTripDist] = useState<TripDist[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());

  const range = useMemo(() => periodToRange(period), [period]);
  const db = supabase as any;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setKpis(EMPTY);
      const { start, end } = range;
      const startIso = fmtIso(start);
      const endIso = fmtIso(end);
      const startDate = fmtDate(start);
      const endDate = fmtDate(end);
      const today = fmtDate(new Date());
      const in30 = fmtDate(new Date(Date.now() + 30 * 86400_000));

      try {
        const [
          timeEntriesRes,
          vacationsRes,
          reportsClosedRes,
          tripsRes,
          deliveryRes,
          maintRes,
          incidentsRes,
          itvRes,
          staffRes,
          oldVacRes,
          openIncidentsAgedRes,
          deliveryNoPhotoRes,
        ] = await Promise.all([
          db
            .from("time_entries")
            .select("user_id, clock_in, clock_out")
            .gte("clock_in", startIso)
            .lte("clock_in", endIso),
          db
            .from("vacation_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
          db
            .from("work_reports")
            .select("id", { count: "exact", head: true })
            .gte("ended_at", startIso)
            .lte("ended_at", endIso)
            .not("ended_at", "is", null),
          db
            .from("tonnage_trips")
            .select("trip_date, weight_kg, trip_type, driver_user_id, driver_staff_id, driver_name_snapshot")
            .gte("trip_date", startDate)
            .lte("trip_date", endDate),
          db
            .from("delivery_notes")
            .select("id, photo_path, delivery_date", { count: "exact" })
            .gte("delivery_date", startDate)
            .lte("delivery_date", endDate),
          db
            .from("machine_service_records")
            .select("id", { count: "exact", head: true })
            .eq("status", "completed")
            .gte("completed_at", startIso)
            .lte("completed_at", endIso),
          db
            .from("machine_incidents")
            .select("id", { count: "exact", head: true })
            .eq("status", "open"),
          db
            .from("machine_assets")
            .select("id, display_name, itv_next_date")
            .gte("itv_next_date", today)
            .lte("itv_next_date", in30),
          db
            .from("staff_directory")
            .select("id, full_name, color_tag, linked_user_id")
            .eq("active", true),
          db
            .from("vacation_requests")
            .select("id, start_date, created_at, staff_member_id")
            .eq("status", "pending")
            .lte("created_at", fmtIso(new Date(Date.now() - 7 * 86400_000))),
          db
            .from("machine_incidents")
            .select("id, title, machine_id, created_at")
            .eq("status", "open")
            .lte("created_at", fmtIso(new Date(Date.now() - 7 * 86400_000))),
          db
            .from("delivery_notes")
            .select("id, order_number, delivery_date, photo_path")
            .gte("delivery_date", fmtDate(new Date(Date.now() - 30 * 86400_000)))
            .is("photo_path", null),
        ]);

        if (cancelled) return;

        // === KPIs PERSONAL ===
        const entries = (timeEntriesRes.data ?? []) as Array<{ user_id: string; clock_in: string; clock_out: string | null }>;
        let totalMs = 0;
        const userSet = new Set<string>();
        let lateCount = 0;
        for (const e of entries) {
          if (e.user_id) userSet.add(e.user_id);
          if (e.clock_out) {
            totalMs += new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime();
          }
          const ci = new Date(e.clock_in);
          const minutes = ci.getHours() * 60 + ci.getMinutes();
          if (minutes > 6 * 60 + 30) lateCount += 1;
        }
        const hoursWorked = Math.round(totalMs / 36e5);

        // === KPIs OPERATIVA ===
        const trips = (tripsRes.data ?? []) as Array<{ trip_date: string; weight_kg: number | null; trip_type: string | null; driver_user_id: string | null; driver_staff_id: string | null; driver_name_snapshot: string | null }>;
        const totalKg = trips.reduce((sum, t) => sum + (Number(t.weight_kg) || 0), 0);
        const tonsMoved = totalKg / 1000;
        const tolvaTrips = trips.filter((t) => t.trip_type === "tolva").length;
        const acopioTrips = trips.length - tolvaTrips;

        // === Estado completo ===
        setKpis({
          hoursWorked,
          activeWorkers: userSet.size,
          pendingVacations: vacationsRes.count ?? 0,
          lateArrivals: lateCount,
          closedReports: reportsClosedRes.count ?? 0,
          tonsMoved,
          deliveryNotes: deliveryRes.count ?? 0,
          tolvaTrips,
          maintenanceDone: maintRes.count ?? 0,
          openIncidents: incidentsRes.count ?? 0,
          upcomingItv: (itvRes.data ?? []).length,
        });

        // === GRÁFICO 1: toneladas/día ===
        const groupByWeek = period === "year";
        const buckets = new Map<string, number>();
        for (const t of trips) {
          const d = new Date(t.trip_date);
          let key: string;
          if (groupByWeek) {
            const onejan = new Date(d.getFullYear(), 0, 1);
            const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
            key = `${d.getFullYear()}-S${String(week).padStart(2, "0")}`;
          } else {
            key = fmtDate(d);
          }
          buckets.set(key, (buckets.get(key) ?? 0) + (Number(t.weight_kg) || 0) / 1000);
        }
        const tonsArr: TonsByDay[] = Array.from(buckets.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, tons]) => ({
            date: key,
            label: groupByWeek ? key.split("-")[1] : format(new Date(key), "d MMM", { locale: es }),
            tons: Math.round(tons * 10) / 10,
          }));
        setTonsByDay(tonsArr);

        // === GRÁFICO 2: horas por trabajador (top 10) ===
        const staff = (staffRes.data ?? []) as Array<{ id: string; full_name: string; color_tag: string | null; linked_user_id: string | null }>;
        const staffByUser = new Map(staff.filter((s) => s.linked_user_id).map((s) => [s.linked_user_id!, s]));
        const hoursPerUser = new Map<string, number>();
        for (const e of entries) {
          if (!e.clock_out) continue;
          const dur = (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 36e5;
          hoursPerUser.set(e.user_id, (hoursPerUser.get(e.user_id) ?? 0) + dur);
        }
        const hbw: HoursByWorker[] = Array.from(hoursPerUser.entries())
          .map(([userId, hours]) => {
            const sd = staffByUser.get(userId);
            return {
              name: sd?.full_name ?? "Usuario",
              hours: Math.round(hours * 10) / 10,
              color: sd?.color_tag ?? "hsl(var(--primary))",
            };
          })
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 10);
        setHoursByWorker(hbw);

        // === GRÁFICO 3: distribución viajes ===
        setTripDist([
          { name: "Acopio", value: acopioTrips, color: "hsl(var(--secondary))" },
          { name: "Tolva", value: tolvaTrips, color: "hsl(var(--primary))" },
        ]);

        // === ALERTAS ===
        const items: AlertItem[] = [];
        const oldVacs = (oldVacRes.data ?? []) as Array<{ id: string; start_date: string }>;
        oldVacs.slice(0, 5).forEach((v) =>
          items.push({
            id: `vac-${v.id}`,
            icon: Users,
            title: "Vacación pendiente >7 días sin revisar",
            detail: `Inicio ${format(new Date(v.start_date), "d MMM yyyy", { locale: es })}`,
            target: "vacations",
          }),
        );
        const itvList = (itvRes.data ?? []) as Array<{ id: string; display_name: string; itv_next_date: string }>;
        itvList.slice(0, 5).forEach((m) =>
          items.push({
            id: `itv-${m.id}`,
            icon: ShieldAlert,
            title: `ITV próxima: ${m.display_name}`,
            detail: `Vence ${format(new Date(m.itv_next_date), "d MMM yyyy", { locale: es })}`,
            target: "machines",
          }),
        );
        const oldInc = (openIncidentsAgedRes.data ?? []) as Array<{ id: string; title: string; created_at: string }>;
        oldInc.slice(0, 5).forEach((i) =>
          items.push({
            id: `inc-${i.id}`,
            icon: Wrench,
            title: `Avería abierta hace +7 días: ${i.title}`,
            detail: format(new Date(i.created_at), "d MMM yyyy", { locale: es }),
            target: "machines",
          }),
        );
        const noPhoto = (deliveryNoPhotoRes.data ?? []) as Array<{ id: string; order_number: string; delivery_date: string }>;
        noPhoto.slice(0, 5).forEach((d) =>
          items.push({
            id: `dn-${d.id}`,
            icon: ReceiptText,
            title: `Albarán #${d.order_number} sin foto`,
            detail: format(new Date(d.delivery_date), "d MMM yyyy", { locale: es }),
            target: "albaranes",
          }),
        );
        setAlerts(items);
        setUpdatedAt(new Date());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [range, period, db]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administración"
        title="Analytics"
        description={`Indicadores clave de la operación. Última actualización: ${format(updatedAt, "HH:mm", { locale: es })}.`}
        actions={
          <div className="inline-flex rounded-lg bg-muted p-1">
            {([
              ["week", "7 días"],
              ["month", "30 días"],
              ["year", "Año"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={
                  period === value
                    ? "rounded-md bg-card px-3 py-1.5 text-sm font-semibold text-primary shadow-sm"
                    : "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground"
                }
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {/* PERSONAL */}
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Personal</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard icon={Clock} label="Horas trabajadas" value={kpis.hoursWorked} hint="Total cerrado en periodo" />
          <KpiCard icon={UserCheck} label="Trabajadores activos" value={kpis.activeWorkers} hint="Han fichado en periodo" />
          <KpiCard icon={CalendarDays} label="Vacaciones pendientes" value={kpis.pendingVacations} tone="warning" />
          <KpiCard icon={AlertTriangle} label="Retrasos detectados" value={kpis.lateArrivals} tone="destructive" hint="Entradas posteriores a 06:30" />
        </div>
      </section>

      {/* OPERATIVA */}
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Operativa</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard icon={FileText} label="Partes cerrados" value={kpis.closedReports} />
          <KpiCard
            icon={Truck}
            label="Toneladas movidas"
            value={kpis.tonsMoved}
            format={(n) => `${n.toFixed(1)} t`}
          />
          <KpiCard icon={ReceiptText} label="Albaranes" value={kpis.deliveryNotes} />
          <KpiCard icon={Fuel} label="Viajes tolva" value={kpis.tolvaTrips} />
        </div>
      </section>

      {/* FLOTA */}
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Flota</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <KpiCard icon={Wrench} label="Mantenimientos completados" value={kpis.maintenanceDone} />
          <KpiCard icon={AlertTriangle} label="Averías abiertas" value={kpis.openIncidents} tone="destructive" hint="Sin filtro de periodo" />
          <KpiCard icon={ShieldAlert} label="ITV próximas (30d)" value={kpis.upcomingItv} tone="warning" />
        </div>
      </section>

      {/* GRÁFICOS */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            Toneladas {period === "year" ? "por semana" : "por día"}
          </div>
          <div className="h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando…
              </div>
            ) : tonsByDay.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin datos en el periodo.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tonsByDay}>
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number) => [`${v.toFixed(1)} t`, "Toneladas"]}
                  />
                  <Bar dataKey="tons" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" /> Top 10 trabajadores · horas
          </div>
          <div className="h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando…
              </div>
            ) : hoursByWorker.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin datos en el periodo.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursByWorker} layout="vertical" margin={{ left: 30 }}>
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number) => [`${v.toFixed(1)} h`, "Horas"]}
                  />
                  <Bar dataKey="hours" radius={[0, 6, 6, 0]}>
                    {hoursByWorker.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <ClipboardCheck className="h-4 w-4 text-primary" /> Distribución viajes Acopio vs Tolva
          </div>
          <div className="h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando…
              </div>
            ) : tripDist.every((t) => t.value === 0) ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin viajes en el periodo.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tripDist} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {tripDist.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* ALERTAS */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas que requieren atención
        </h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay alertas activas. Todo en orden ✅</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <li
                  key={alert.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2"
                >
                  <Icon className="h-4 w-4 flex-none text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{alert.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{alert.detail}</p>
                  </div>
                  <Button size="sm" variant="ghost" disabled className="text-xs">
                    {alert.target ?? "Ver"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AnalyticsDashboardView;
