import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================
// TIPOS
// ============================================================
type ShiftCode = "M" | "T" | "N";

interface StaffOption {
  id: string;
  full_name: string;
  color_tag: string | null;
}

interface JourneyAssignment {
  id: string;
  staff_member_id: string;
  journey_date: string; // yyyy-MM-dd
  shift: ShiftCode;
  color: string | null;
  badge_label: string | null;
  notes: string | null;
}

const SHIFT_LABELS: Record<ShiftCode, string> = {
  M: "Mañana",
  T: "Tarde",
  N: "Noche",
};

// Calcula color de texto según luminosidad del fondo
const computeTextColor = (hex: string): string => {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (full.length !== 6) return "#1a1a1a";
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1a1a1a" : "#ffffff";
};

// ============================================================
// COMPONENTE
// ============================================================
const JourneysGrid = () => {
  const { user, canViewAdmin } = useAuth();
  const db = supabase as any;

  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [journeys, setJourneys] = useState<JourneyAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog estado
  const [dialogState, setDialogState] = useState<{ date: string; shift: ShiftCode } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ staff_member_id: string; color: string; badge_label: string }>({
    staff_member_id: "",
    color: "",
    badge_label: "",
  });
  const [saving, setSaving] = useState(false);

  // ============ CARGA ============
  const loadStaff = async () => {
    const { data } = await db
      .from("staff_directory")
      .select("id, full_name, color_tag")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("full_name", { ascending: true });
    setStaff((data ?? []) as StaffOption[]);
  };

  const loadJourneys = async () => {
    setLoading(true);
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const { data, error } = await db
      .from("staff_journeys")
      .select("id, staff_member_id, journey_date, shift, color, badge_label, notes")
      .gte("journey_date", monthStart)
      .lte("journey_date", monthEnd);
    if (error) {
      toast.error("No se pudieron cargar las jornadas");
      setLoading(false);
      return;
    }
    setJourneys((data ?? []) as JourneyAssignment[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadStaff();
  }, []);

  useEffect(() => {
    void loadJourneys();
  }, [currentMonth]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("journeys-grid")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_journeys" }, () => void loadJourneys())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentMonth]);

  // ============ MAPAS DE BÚSQUEDA ============
  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const journeyByCell = useMemo(() => {
    const map = new Map<string, JourneyAssignment>();
    journeys.forEach((j) => map.set(`${j.journey_date}|${j.shift}`, j));
    return map;
  }, [journeys]);

  // ============ DÍAS DEL MES ============
  const daysOfMonth = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  }, [currentMonth]);

  // ============ HANDLERS ============
  const openCellDialog = (date: string, shift: ShiftCode) => {
    if (!canViewAdmin) {
      toast.info("Solo administración puede modificar la planilla");
      return;
    }
    const existing = journeyByCell.get(`${date}|${shift}`);
    if (existing) {
      setEditingId(existing.id);
      setForm({
        staff_member_id: existing.staff_member_id,
        color: existing.color || "",
        badge_label: existing.badge_label || "",
      });
    } else {
      setEditingId(null);
      setForm({ staff_member_id: "", color: "", badge_label: "" });
    }
    setDialogState({ date, shift });
  };

  const closeDialog = () => {
    setDialogState(null);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!dialogState || !user) return;
    if (!form.staff_member_id) {
      toast.error("Elige un trabajador");
      return;
    }
    setSaving(true);
    const payload = {
      staff_member_id: form.staff_member_id,
      journey_date: dialogState.date,
      shift: dialogState.shift,
      color: form.color || null,
      badge_label: form.badge_label.trim() || null,
      created_by_user_id: user.id,
    };

    const { error } = editingId
      ? await db.from("staff_journeys").update(payload).eq("id", editingId)
      : await db.from("staff_journeys").insert(payload);

    setSaving(false);
    if (error) {
      // Posible conflicto único: ya hay alguien en esa celda. Avisar.
      if (String(error.message || "").includes("staff_journeys_staff_member_id_journey_date_shift_key")) {
        toast.error("Este trabajador ya está asignado en ese turno");
      } else {
        toast.error(editingId ? "No se pudo actualizar" : "No se pudo asignar");
      }
      return;
    }
    toast.success(editingId ? "Asignación actualizada" : "Asignación creada");
    closeDialog();
    void loadJourneys();
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!window.confirm("¿Quitar la asignación?")) return;
    const { error } = await db.from("staff_journeys").delete().eq("id", editingId);
    if (error) return toast.error("No se pudo eliminar");
    toast.success("Asignación eliminada");
    closeDialog();
    void loadJourneys();
  };

  // ============ RENDER ============
  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: es });

  return (
    <div className="space-y-3">
      {/* Header con navegación */}
      <header className="panel-surface flex flex-wrap items-center gap-2 p-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold capitalize">{monthLabel}</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth((d) => subMonths(d, 1))} title="Mes anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
            Hoy
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth((d) => addMonths(d, 1))} title="Mes siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Rejilla mensual */}
      {loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
          {daysOfMonth.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isToday = isSameDay(day, new Date());
            return (
              <article
                key={dateStr}
                className={cn(
                  "panel-surface p-0 overflow-hidden flex flex-col",
                  isToday && "ring-2 ring-primary",
                )}
              >
                <header className="flex items-center justify-between border-b border-border px-2 py-1.5 bg-muted/30">
                  <span className="text-xs font-bold text-foreground">{day.getDate()}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {format(day, "EEE", { locale: es })}
                  </span>
                </header>
                <div className="flex flex-col divide-y divide-border">
                  {(["M", "T", "N"] as ShiftCode[]).map((shift) => {
                    const assignment = journeyByCell.get(`${dateStr}|${shift}`);
                    const member = assignment ? staffById.get(assignment.staff_member_id) : null;
                    const bgColor = assignment?.color || member?.color_tag || null;

                    return (
                      <button
                        key={shift}
                        type="button"
                        onClick={() => openCellDialog(dateStr, shift)}
                        className={cn(
                          "flex items-center gap-1 px-1.5 py-1.5 text-left transition-colors min-h-[28px]",
                          !assignment && "hover:bg-muted/40",
                        )}
                        title={assignment && member ? `${SHIFT_LABELS[shift]} · ${member.full_name}` : `Asignar ${SHIFT_LABELS[shift].toLowerCase()}`}
                      >
                        <span className="w-3 flex-none text-[10px] font-bold text-muted-foreground">{shift}</span>
                        {assignment && member ? (
                          <span
                            className="flex-1 truncate rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{
                              backgroundColor: bgColor || "#94a3b8",
                              color: bgColor ? computeTextColor(bgColor) : "#ffffff",
                            }}
                          >
                            {member.full_name.split(" ")[0]}
                            {assignment.badge_label && (
                              <span className="ml-1 rounded-full bg-black/15 px-1 text-[9px] font-bold">
                                {assignment.badge_label}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="flex-1 text-xs text-muted-foreground/60">—</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Leyenda */}
      <p className="text-center text-[11px] text-muted-foreground">
        💡 Pulsa cualquier celda M/T/N para asignar un trabajador. El color de fondo es el del trabajador (puedes sobrescribirlo).
      </p>

      {/* Dialog */}
      <Dialog open={dialogState !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar asignación" : "Nueva asignación"}
            </DialogTitle>
            <DialogDescription>
              {dialogState && (
                <>
                  {format(new Date(dialogState.date), "EEEE d 'de' MMMM", { locale: es })} · turno {SHIFT_LABELS[dialogState.shift]}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {/* Trabajador */}
            <div className="space-y-1.5">
              <Label>Trabajador</Label>
              <Select value={form.staff_member_id} onValueChange={(v) => {
                const member = staffById.get(v);
                // Al cambiar de trabajador, si no había color personalizado, usamos el suyo
                setForm((f) => ({
                  ...f,
                  staff_member_id: v,
                  color: f.color || member?.color_tag || "",
                }));
              }}>
                <SelectTrigger><SelectValue placeholder="Elige un trabajador" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: s.color_tag || "#94a3b8" }}
                        />
                        {s.full_name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color (sobrescribible) */}
            <div className="space-y-1.5">
              <Label>Color de fondo</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={form.color || "#3b82f6"}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-10 w-16 cursor-pointer p-1"
                />
                <Input
                  type="text"
                  placeholder="#3B82F6"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-10 flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 px-2"
                  onClick={() => {
                    const member = staffById.get(form.staff_member_id);
                    setForm((f) => ({ ...f, color: member?.color_tag || "" }));
                  }}
                  title="Restaurar color del trabajador"
                >
                  Reset
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Si lo dejas vacío, se usa el color del trabajador automáticamente.
              </p>
            </div>

            {/* Etiqueta opcional */}
            <div className="space-y-1.5">
              <Label>Etiqueta (opcional)</Label>
              <Input
                type="text"
                placeholder="SM, MS, M, etc."
                value={form.badge_label}
                onChange={(e) => setForm((f) => ({ ...f, badge_label: e.target.value }))}
                maxLength={6}
              />
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Guardando…" : editingId ? "Guardar" : "Asignar"}
              </Button>
              {editingId && (
                <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => void handleDelete()}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" onClick={closeDialog}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JourneysGrid;
