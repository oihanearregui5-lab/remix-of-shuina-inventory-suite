import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Clock3, Send, SunMedium, Sunset } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface VacationRequestItem {
  id: string;
  request_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string | null;
  admin_response: string | null;
  created_at: string;
}

interface StaffShiftItem {
  id: string;
  shift_date: string;
  shift_label: string;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  notes: string | null;
  staff_directory?: { full_name: string } | null;
}

const statusTone: Record<string, string> = {
  pending: "bg-warning/15 text-foreground",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const StaffHubView = () => {
  const { user, isAdmin } = useAuth();
  const db = supabase as any;
  const [requests, setRequests] = useState<VacationRequestItem[]>([]);
  const [shifts, setShifts] = useState<StaffShiftItem[]>([]);
  const [requestType, setRequestType] = useState("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void Promise.all([fetchRequests(), fetchShifts()]);
  }, [user, isAdmin]);

  const fetchRequests = async () => {
    const query = db.from("vacation_requests").select("id, request_type, start_date, end_date, status, reason, admin_response, created_at").order("created_at", { ascending: false }).limit(20);
    const { data, error } = await query;

    if (error) {
      toast.error("No se pudieron cargar las solicitudes");
      return;
    }

    setRequests(data ?? []);
  };

  const fetchShifts = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data, error } = await db
      .from("staff_shifts")
      .select("id, shift_date, shift_label, starts_at, ends_at, location, notes, staff_directory(full_name)")
      .gte("shift_date", today)
      .order("shift_date", { ascending: true })
      .limit(14);

    if (error) {
      toast.error("No se pudieron cargar los turnos");
      return;
    }

    setShifts(data ?? []);
  };

  const submitRequest = async () => {
    if (!user || !startDate || !endDate) return;
    setSaving(true);

    const { error } = await db.from("vacation_requests").insert({
      requester_user_id: user.id,
      request_type: requestType,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || null,
      status: "pending",
    });

    if (error) {
      toast.error("No se pudo enviar la solicitud");
    } else {
      toast.success("Solicitud enviada");
      setStartDate("");
      setEndDate("");
      setReason("");
      await fetchRequests();
    }

    setSaving(false);
  };

  const todayShifts = useMemo(() => shifts.filter((shift) => shift.shift_date === format(new Date(), "yyyy-MM-dd")), [shifts]);

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Personal, turnos y vacaciones</h1>
        <p className="text-muted-foreground">Cada trabajador puede consultar su organización diaria y solicitar vacaciones o ausencias.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" /> Solicitudes</div>
          <p className="text-3xl font-bold text-foreground">{requests.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4 text-secondary" /> Turnos hoy</div>
          <p className="text-3xl font-bold text-foreground">{todayShifts.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><SunMedium className="h-4 w-4 text-warning" /> Visibilidad actual</div>
          <p className="text-sm font-medium text-foreground">Todos pueden consultar turnos. {isAdmin ? "Administración puede revisar solicitudes." : "Tus solicitudes quedan registradas para revisión."}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 space-y-1">
            <h2 className="font-semibold text-foreground">Solicitar vacaciones o ausencia</h2>
            <p className="text-sm text-muted-foreground">Envía periodos de vacaciones, permisos o bajas previstas.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <select value={requestType} onChange={(e) => setRequestType(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              <option value="vacation">Vacaciones</option>
              <option value="leave">Permiso</option>
              <option value="medical">Baja / revisión</option>
            </select>
            <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">Estado inicial: pendiente</div>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <div className="md:col-span-2">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Observaciones, motivo o detalles de la solicitud" className="min-h-24" />
            </div>
            <Button onClick={submitRequest} disabled={saving || !startDate || !endDate} className="md:col-span-2">
              <Send className="h-4 w-4" /> Enviar solicitud
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Historial de solicitudes</h3>
            {requests.length === 0 && <p className="rounded-lg bg-muted px-4 py-5 text-sm text-muted-foreground">Aún no hay solicitudes registradas.</p>}
            {requests.map((request) => (
              <div key={request.id} className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium capitalize text-foreground">{request.request_type === "vacation" ? "Vacaciones" : request.request_type === "leave" ? "Permiso" : "Baja / revisión"}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.start_date), "d MMM yyyy", { locale: es })} → {format(new Date(request.end_date), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[request.status] ?? "bg-muted text-muted-foreground"}`}>{request.status}</span>
                </div>
                {request.reason && <p className="mt-2 text-sm text-foreground">{request.reason}</p>}
                {request.admin_response && <p className="mt-2 text-sm text-muted-foreground">Respuesta: {request.admin_response}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 space-y-1">
            <h2 className="font-semibold text-foreground">Turnos y horario</h2>
            <p className="text-sm text-muted-foreground">Consulta si trabajas de día o de tarde y revisa la planificación próxima.</p>
          </div>

          <div className="space-y-3">
            {shifts.length === 0 && <p className="rounded-lg bg-muted px-4 py-5 text-sm text-muted-foreground">Todavía no hay turnos cargados.</p>}
            {shifts.map((shift) => (
              <div key={shift.id} className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{shift.staff_directory?.full_name ?? "Equipo"}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(shift.shift_date), "EEEE d MMMM", { locale: es })}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                    {shift.shift_label.toLowerCase().includes("tarde") ? <Sunset className="h-3.5 w-3.5" /> : <SunMedium className="h-3.5 w-3.5" />}
                    {shift.shift_label}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-foreground sm:grid-cols-3">
                  <p><span className="text-muted-foreground">Horario:</span> {shift.starts_at?.slice(0, 5) ?? "--:--"} · {shift.ends_at?.slice(0, 5) ?? "--:--"}</p>
                  <p><span className="text-muted-foreground">Lugar:</span> {shift.location ?? "Sin definir"}</p>
                  <p><span className="text-muted-foreground">Notas:</span> {shift.notes ?? "Sin observaciones"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default StaffHubView;