import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface PendingRequest {
  id: string;
  request_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string | null;
  requester_user_id: string | null;
  staff_member_id: string | null;
}

interface OwnRequest extends PendingRequest {
  admin_response: string | null;
  created_at: string;
}

interface StaffOption { id: string; full_name: string; linked_user_id: string | null }

const typeLabel: Record<string, string> = {
  vacation: "Vacaciones",
  leave: "Asuntos propios",
  medical: "Baja / revisión",
};

const AdminStaffSimpleView = () => {
  const { user } = useAuth();
  const db = supabase as any;
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [own, setOwn] = useState<OwnRequest[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [requestType, setRequestType] = useState("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [requesterNames, setRequesterNames] = useState<Record<string, string>>({});

  const loadAll = async () => {
    if (!user) return;
    const [pendingRes, ownRes, staffRes] = await Promise.all([
      db.from("vacation_requests")
        .select("id, request_type, start_date, end_date, status, reason, requester_user_id, staff_member_id")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      db.from("vacation_requests")
        .select("id, request_type, start_date, end_date, status, reason, admin_response, created_at, requester_user_id, staff_member_id")
        .eq("requester_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      db.from("staff_directory").select("id, full_name, linked_user_id").eq("active", true),
    ]);
    if (pendingRes.error) toast.error("No se pudieron cargar las solicitudes");
    setPending((pendingRes.data ?? []) as PendingRequest[]);
    setOwn((ownRes.data ?? []) as OwnRequest[]);
    const staffList = (staffRes.data ?? []) as StaffOption[];
    setStaff(staffList);

    // Cargar nombres de los solicitantes
    const userIds = Array.from(new Set((pendingRes.data ?? []).map((r: any) => r.requester_user_id).filter(Boolean))) as string[];
    if (userIds.length > 0) {
      const { data: profiles } = await db.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const map: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { map[p.user_id] = p.full_name; });
      setRequesterNames(map);
    } else {
      setRequesterNames({});
    }
  };

  useEffect(() => { void loadAll(); }, [user]);

  const respond = async (id: string, status: "approved" | "rejected", response?: string) => {
    const { error } = await db
      .from("vacation_requests")
      .update({
        status,
        admin_response: response ?? (status === "approved" ? "Aprobada" : "Declinada"),
        reviewed_at: new Date().toISOString(),
        reviewed_by_user_id: user?.id,
      })
      .eq("id", id);
    if (error) return toast.error("No se pudo actualizar");
    toast.success(status === "approved" ? "Solicitud aceptada" : "Solicitud declinada");
    void loadAll();
  };

  const submitRequest = async () => {
    if (!user || !startDate || !endDate) return;
    setSaving(true);
    const ownStaff = staff.find((item) => item.linked_user_id === user.id)?.id ?? null;
    const { error } = await db.from("vacation_requests").insert({
      requester_user_id: user.id,
      request_type: requestType,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || null,
      status: "pending",
      staff_member_id: ownStaff,
    });
    setSaving(false);
    if (error) return toast.error("No se pudo enviar la solicitud");
    toast.success("Solicitud enviada");
    setStartDate(""); setEndDate(""); setReason("");
    void loadAll();
  };

  const requesterDisplay = (req: PendingRequest) => {
    if (req.requester_user_id && requesterNames[req.requester_user_id]) return requesterNames[req.requester_user_id];
    if (req.staff_member_id) {
      const s = staff.find((x) => x.id === req.staff_member_id);
      if (s) return s.full_name;
    }
    return "Trabajador";
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="Trabajadores"
        title="Solicitudes de vacaciones"
        description="Acepta o declina las solicitudes pendientes y gestiona tus propias vacaciones."
      />

      <section className="panel-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Pendientes de revisión</h2>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <p className="rounded-xl bg-muted px-4 py-6 text-sm text-muted-foreground">No hay solicitudes pendientes.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((req) => (
              <li key={req.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{requesterDisplay(req)}</p>
                    <p className="text-sm text-muted-foreground">
                      {typeLabel[req.request_type] ?? req.request_type} · {format(new Date(req.start_date), "d MMM", { locale: es })} → {format(new Date(req.end_date), "d MMM yyyy", { locale: es })}
                    </p>
                    {req.reason && <p className="mt-1 text-xs text-muted-foreground">{req.reason}</p>}
                  </div>
                  <div className="flex flex-none gap-2">
                    <Button size="sm" onClick={() => void respond(req.id, "approved")}>
                      <Check className="h-4 w-4" /> Aceptar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void respond(req.id, "rejected")}>
                      <X className="h-4 w-4" /> Declinar
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-surface p-4">
        <h2 className="mb-3 font-semibold text-foreground">Solicitar mis propias vacaciones</h2>
        <div className="space-y-3">
          <Select value={requestType} onValueChange={setRequestType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vacation">Vacaciones</SelectItem>
              <SelectItem value="leave">Asuntos propios</SelectItem>
              <SelectItem value="medical">Baja / revisión</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Desde</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Hasta</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo u observaciones (opcional)" className="min-h-20" />
          <Button onClick={() => void submitRequest()} disabled={saving || !startDate || !endDate}>
            <Send className="h-4 w-4" /> Enviar solicitud
          </Button>
        </div>

        {own.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mis solicitudes recientes</p>
            <ul className="space-y-2">
              {own.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <span className="text-foreground">
                    {typeLabel[r.request_type] ?? r.request_type} · {format(new Date(r.start_date), "d MMM", { locale: es })} → {format(new Date(r.end_date), "d MMM", { locale: es })}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{r.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminStaffSimpleView;
