import { useEffect, useMemo, useState } from "react";
import { addDays, eachDayOfInterval, endOfMonth, format, getYear, isSameDay, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Clock3, Edit3, Send, SunMedium, Sunset } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import StaffRequestDetailDialog, { type StaffRequestDialogItem } from "@/components/staff/StaffRequestDetailDialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MyJourneyView from "@/components/staff/MyJourneyView";
import { toast } from "sonner";

interface VacationRequestItem extends StaffRequestDialogItem { requester_user_id?: string; reviewed_at?: string | null; reviewed_by_user_id?: string | null; staff_member_id?: string | null }
interface StaffShiftItem { id: string; shift_date: string; shift_label: string; starts_at: string | null; ends_at: string | null; location: string | null; notes: string | null; staff_directory?: { full_name: string } | null }
interface AllowanceItem { id: string; staff_member_id: string; vacation_days_base: number; personal_days_base: number; vacation_adjustment_days: number; personal_adjustment_days: number; notes: string | null }
interface StaffOption { id: string; full_name: string; linked_user_id: string | null }

const holidayDatesForYear = (year: number) => [
  `${year}-01-01`, `${year}-01-06`, `${year}-05-01`, `${year}-08-15`, `${year}-10-12`, `${year}-11-01`, `${year}-12-06`, `${year}-12-08`, `${year}-12-25`,
].map((item) => new Date(item));

const StaffHubView = () => {
  const { user, isAdmin } = useAuth();
  const db = supabase as any;
  const [requests, setRequests] = useState<VacationRequestItem[]>([]);
  const [shifts, setShifts] = useState<StaffShiftItem[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [allowances, setAllowances] = useState<AllowanceItem[]>([]);
  const [requestType, setRequestType] = useState("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StaffRequestDialogItem | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [allowanceDraft, setAllowanceDraft] = useState({ vacation_days_base: "30", personal_days_base: "2", vacation_adjustment_days: "0", personal_adjustment_days: "0", notes: "" });

  useEffect(() => { if (!user) return; void Promise.all([fetchRequests(), fetchShifts(), fetchStaff(), fetchAllowances()]); }, [user, isAdmin, calendarMonth]);

  const fetchRequests = async () => {
    let query = db.from("vacation_requests").select("id, request_type, start_date, end_date, status, reason, admin_response, created_at, requester_user_id, reviewed_at, reviewed_by_user_id, staff_member_id");
    // Trabajador solo ve sus propias solicitudes (calendario 100% personal)
    if (!isAdmin && user) {
      query = query.eq("requester_user_id", user.id);
    }
    const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
    if (error) return toast.error("No se pudieron cargar las solicitudes");
    setRequests((data ?? []) as VacationRequestItem[]);
  };

  const fetchShifts = async () => {
    const monthStart = format(startOfMonth(calendarMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(calendarMonth), "yyyy-MM-dd");
    const { data, error } = await db.from("staff_shifts").select("id, shift_date, shift_label, starts_at, ends_at, location, notes, staff_directory(full_name)").gte("shift_date", monthStart).lte("shift_date", monthEnd).order("shift_date", { ascending: true }).limit(100);
    if (error) return toast.error("No se pudieron cargar los turnos");
    setShifts((data ?? []) as StaffShiftItem[]);
  };

  const fetchStaff = async () => {
    const { data } = await db.from("staff_directory").select("id, full_name, linked_user_id").eq("active", true).order("sort_order", { ascending: true });
    const list = (data ?? []) as StaffOption[];
    setStaff(list);
    if (!selectedStaffId && list[0]?.id) setSelectedStaffId(list[0].id);
  };

  const fetchAllowances = async () => {
    const { data } = await db.from("staff_allowances").select("id, staff_member_id, vacation_days_base, personal_days_base, vacation_adjustment_days, personal_adjustment_days, notes");
    setAllowances((data ?? []) as AllowanceItem[]);
  };

  const submitRequest = async () => {
    if (!user || !startDate || !endDate) return;
    setSaving(true);
    const ownStaff = staff.find((item) => item.linked_user_id === user.id)?.id ?? null;
    const { error } = await db.from("vacation_requests").insert({ requester_user_id: user.id, request_type: requestType, start_date: startDate, end_date: endDate, reason: reason.trim() || null, status: "pending", staff_member_id: ownStaff });
    setSaving(false);
    if (error) return toast.error("No se pudo enviar la solicitud");
    toast.success("Solicitud enviada");
    setStartDate(""); setEndDate(""); setReason("");
    void fetchRequests();
  };

  const saveAllowance = async () => {
    if (!selectedStaffId) return;
    const existing = allowances.find((item) => item.staff_member_id === selectedStaffId);
    const payload = { staff_member_id: selectedStaffId, vacation_days_base: Number(allowanceDraft.vacation_days_base), personal_days_base: Number(allowanceDraft.personal_days_base), vacation_adjustment_days: Number(allowanceDraft.vacation_adjustment_days), personal_adjustment_days: Number(allowanceDraft.personal_adjustment_days), notes: allowanceDraft.notes || null };
    const { error } = existing ? await db.from("staff_allowances").update(payload).eq("id", existing.id) : await db.from("staff_allowances").insert(payload);
    if (error) return toast.error("No se pudo guardar el saldo");
    toast.success("Saldo actualizado");
    void fetchAllowances();
  };

  const todayShifts = useMemo(() => shifts.filter((shift) => shift.shift_date === format(new Date(), "yyyy-MM-dd")), [shifts]);
  const holidayDates = useMemo(() => holidayDatesForYear(getYear(calendarMonth)), [calendarMonth]);
  const requestDatesByType = useMemo(() => {
    const build = (type: string, status?: string) => requests.filter((item) => item.request_type === type && (!status || item.status === status)).flatMap((item) => eachDayOfInterval({ start: new Date(item.start_date), end: new Date(item.end_date) }));
    return { vacations: build("vacation", "approved"), leaves: build("leave", "approved"), pending: requests.filter((item) => item.status === "pending").flatMap((item) => eachDayOfInterval({ start: new Date(item.start_date), end: new Date(item.end_date) })) };
  }, [requests]);
  const selectedDayData = useMemo(() => !selectedDate ? { shifts: [], requests: [] as VacationRequestItem[] } : ({ shifts: shifts.filter((shift) => isSameDay(new Date(shift.shift_date), selectedDate)), requests: requests.filter((request) => selectedDate >= new Date(request.start_date) && selectedDate <= new Date(request.end_date)) }), [requests, selectedDate, shifts]);
  const currentStaffId = useMemo(() => staff.find((item) => item.linked_user_id === user?.id)?.id ?? null, [staff, user]);
  const myAllowance = useMemo(() => allowances.find((item) => item.staff_member_id === currentStaffId) ?? null, [allowances, currentStaffId]);
  const approvedVacationDays = useMemo(() => requests.filter((request) => request.staff_member_id === currentStaffId && request.request_type === "vacation" && request.status === "approved").reduce((total, request) => total + eachDayOfInterval({ start: new Date(request.start_date), end: new Date(request.end_date) }).length, 0), [currentStaffId, requests]);
  const approvedPersonalDays = useMemo(() => requests.filter((request) => request.staff_member_id === currentStaffId && request.request_type === "leave" && request.status === "approved").reduce((total, request) => total + eachDayOfInterval({ start: new Date(request.start_date), end: new Date(request.end_date) }).length, 0), [currentStaffId, requests]);
  const weekRange = useMemo(() => {
    const baseDate = selectedDate ?? new Date();
    const start = startOfWeek(baseDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selectedDate]);
  const weekSummary = useMemo(() => {
    const days = weekRange.map((date) => {
      const dayRequests = requests.filter((request) => date >= new Date(request.start_date) && date <= new Date(request.end_date));
      const dayShifts = shifts.filter((shift) => isSameDay(new Date(shift.shift_date), date));
      return { date, requests: dayRequests.length, shifts: dayShifts.length };
    });
    return {
      days,
      totalRequests: days.reduce((sum, day) => sum + day.requests, 0),
      totalShifts: days.reduce((sum, day) => sum + day.shifts, 0),
    };
  }, [requests, shifts, weekRange]);
  const nextOwnRequests = useMemo(() => requests.filter((request) => request.staff_member_id === currentStaffId).slice(0, 3), [currentStaffId, requests]);

  useEffect(() => {
    const target = allowances.find((item) => item.staff_member_id === selectedStaffId);
    setAllowanceDraft({ vacation_days_base: String(target?.vacation_days_base ?? 30), personal_days_base: String(target?.personal_days_base ?? 2), vacation_adjustment_days: String(target?.vacation_adjustment_days ?? 0), personal_adjustment_days: String(target?.personal_adjustment_days ?? 0), notes: target?.notes ?? "" });
  }, [allowances, selectedStaffId]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader eyebrow="Personal" title="Turnos, vacaciones y ausencias" description="Vista móvil clara, calendario en español y saldos visibles para cada trabajador." />

      <Tabs defaultValue="journey" className="w-full">
        <TabsList>
          <TabsTrigger value="journey">Mi jornada</TabsTrigger>
          <TabsTrigger value="requests">Solicitudes</TabsTrigger>
        </TabsList>

        <TabsContent value="journey" className="mt-4">
          <MyJourneyView />
        </TabsContent>

        <TabsContent value="requests" className="mt-4 space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <div className="panel-surface p-4"><p className="text-sm text-muted-foreground">Vacaciones restantes</p><p className="mt-2 text-3xl font-bold text-foreground">{Math.max(0, (myAllowance?.vacation_days_base ?? 30) + (myAllowance?.vacation_adjustment_days ?? 0) - approvedVacationDays)}</p></div>
        <div className="panel-surface p-4"><p className="text-sm text-muted-foreground">Asuntos propios restantes</p><p className="mt-2 text-3xl font-bold text-foreground">{Math.max(0, (myAllowance?.personal_days_base ?? 2) + (myAllowance?.personal_adjustment_days ?? 0) - approvedPersonalDays)}</p></div>
        <div className="panel-surface p-4"><p className="text-sm text-muted-foreground">Turnos hoy</p><p className="mt-2 text-3xl font-bold text-foreground">{todayShifts.length}</p></div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="panel-surface p-4">
          <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">Lectura semanal</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Solicitudes</p><p className="mt-1 text-xl font-semibold text-foreground">{weekSummary.totalRequests}</p></div>
            <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Turnos</p><p className="mt-1 text-xl font-semibold text-foreground">{weekSummary.totalShifts}</p></div>
            <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Día activo</p><p className="mt-1 text-xl font-semibold text-foreground">{selectedDate ? format(selectedDate, "EEE d", { locale: es }) : "—"}</p></div>
            <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Próximos hitos</p><p className="mt-1 text-xl font-semibold text-foreground">{nextOwnRequests.length}</p></div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {weekSummary.days.map((day) => (
              <div key={day.date.toISOString()} className="rounded-lg border border-border bg-background px-2 py-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{format(day.date, "EEE", { locale: es })}</p>
                <p className="mt-1 text-base font-semibold text-foreground">{format(day.date, "d")}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{day.requests} sol.</p>
                <p className="text-[11px] text-muted-foreground">{day.shifts} turnos</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-surface p-4">
          <div className="mb-4 flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">Próximos movimientos</p></div>
          <div className="space-y-3">
            {nextOwnRequests.length === 0 ? <div className="rounded-xl bg-muted px-4 py-6 text-sm text-muted-foreground">No tienes solicitudes recientes en calendario.</div> : nextOwnRequests.map((request) => (
              <button key={request.id} onClick={() => setSelectedRequest(request)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{request.request_type === "vacation" ? "Vacaciones" : request.request_type === "leave" ? "Asuntos propios" : "Baja / revisión"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{format(new Date(request.start_date), "d MMM", { locale: es })} → {format(new Date(request.end_date), "d MMM yyyy", { locale: es })}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">{request.status}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </section>

      <section className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <section className="panel-surface p-4">
            <div className="mb-4 flex items-center gap-2"><Send className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">Nueva solicitud</p></div>
            <div className="space-y-3">
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacaciones</SelectItem>
                  <SelectItem value="leave">Asuntos propios</SelectItem>
                  <SelectItem value="medical">Baja / revisión</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-2">
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
                {startDate && (
                  <button
                    type="button"
                    onClick={() => setEndDate(startDate)}
                    className="text-xs text-primary hover:underline"
                  >
                    Solo este día
                  </button>
                )}
                <p className="text-[11px] text-muted-foreground">
                  💡 Pulsa un día en el calendario y se autocompletará el formulario.
                </p>
              </div>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo u observaciones" className="min-h-24 hide-on-simple" />
              <Button onClick={() => void submitRequest()} disabled={saving || !startDate || !endDate}><Send className="h-4 w-4" /> Enviar solicitud</Button>
            </div>
          </section>

          {/* Sección "Saldos por trabajador" eliminada por petición del cliente */}

          <section className="panel-surface p-4">
            <div className="mb-4 flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">Historial de solicitudes</p></div>
            <div className="space-y-2">
              {requests.map((request) => (
                <button key={request.id} onClick={() => setSelectedRequest(request)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{request.request_type === "vacation" ? "Vacaciones" : request.request_type === "leave" ? "Asuntos propios" : "Baja / revisión"}</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(request.start_date), "d MMM", { locale: es })} → {format(new Date(request.end_date), "d MMM yyyy", { locale: es })}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">{request.status}</span>
                  </div>
                </button>
              ))}
              {requests.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay solicitudes.</p>}
            </div>
          </section>
        </div>

        <section className="panel-surface p-4">
          <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><p className="font-semibold text-foreground">Calendario laboral</p></div>
          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="rounded-xl border border-border bg-background p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  if (date) {
                    const iso = format(date, "yyyy-MM-dd");
                    // Si no hay rango previo o el nuevo día queda fuera del rango actual, abrimos un único día.
                    // Si ya hay startDate y la nueva fecha es posterior, la usamos como endDate.
                    if (!startDate) {
                      setStartDate(iso);
                      setEndDate(iso);
                    } else if (!endDate || iso < startDate) {
                      setStartDate(iso);
                      setEndDate(iso);
                    } else if (iso >= startDate) {
                      setEndDate(iso);
                    }
                  }
                }}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                locale={es}
                modifiers={{ holiday: holidayDates, vacation: requestDatesByType.vacations, leave: requestDatesByType.leaves, pending: requestDatesByType.pending }}
                modifiersClassNames={{ holiday: "bg-destructive/15 text-destructive font-semibold", vacation: "bg-success/20 text-success font-semibold", leave: "bg-primary text-primary-foreground font-semibold", pending: "ring-1 ring-warning text-foreground" }}
                className="w-full"
              />
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-destructive">Festivo</span>
                <span className="rounded-full bg-success/20 px-2.5 py-1 text-success">Vacaciones</span>
                <span className="rounded-full bg-primary px-2.5 py-1 text-primary-foreground">Asuntos propios</span>
                <span className="rounded-full border border-warning/40 px-2.5 py-1 text-foreground">Pendiente</span>
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-border bg-background p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedDate ? format(selectedDate, "EEEE d MMMM yyyy", { locale: es }) : "Selecciona un día"}</p>
                <p className="text-xs text-muted-foreground">Turnos y solicitudes del día.</p>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solicitudes</p>
                <div className="space-y-2">
                  {selectedDayData.requests.map((request) => <button key={request.id} onClick={() => setSelectedRequest(request)} className="w-full rounded-xl border border-border bg-card px-3 py-3 text-left text-sm text-foreground">{request.request_type === "vacation" ? "Vacaciones" : request.request_type === "leave" ? "Asuntos propios" : "Baja / revisión"}<span className="mt-1 block text-xs text-muted-foreground">{request.status}</span></button>)}
                  {selectedDayData.requests.length === 0 && <p className="text-sm text-muted-foreground">Sin solicitudes este día.</p>}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Turnos</p>
                <div className="space-y-2">
                  {selectedDayData.shifts.map((shift) => <div key={shift.id} className="rounded-xl border border-border bg-card px-3 py-3"><p className="font-medium text-foreground">{shift.shift_label}</p><p className="mt-1 text-xs text-muted-foreground">{shift.starts_at?.slice(0, 5) ?? "--:--"} · {shift.ends_at?.slice(0, 5) ?? "--:--"} · {shift.location ?? "Sin lugar"}</p></div>)}
                  {selectedDayData.shifts.length === 0 && <p className="text-sm text-muted-foreground">Sin turnos este día.</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {shifts.map((shift) => (
              <div key={shift.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{shift.staff_directory?.full_name ?? "Equipo"}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(shift.shift_date), "EEEE d MMMM", { locale: es })}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">{shift.shift_label.toLowerCase().includes("tarde") ? <Sunset className="h-3.5 w-3.5" /> : <SunMedium className="h-3.5 w-3.5" />}{shift.shift_label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
        </TabsContent>
      </Tabs>

      <StaffRequestDetailDialog open={Boolean(selectedRequest)} request={selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)} />
    </div>
  );
};

export default StaffHubView;