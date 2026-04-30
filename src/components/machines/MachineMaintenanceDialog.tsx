import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Droplet, Loader2, Trash2, Wind, Fuel, Wrench, Flame, Snowflake, Beaker } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  machineId: string | null;
  machineName: string;
  onOpenChange: (open: boolean) => void;
}

interface LogRow {
  id: string;
  log_date: string;
  hydraulic_oil_done: boolean;
  hydraulic_oil_liters: number | null;
  engine_oil_done: boolean;
  engine_oil_liters: number | null;
  coolant_done: boolean;
  coolant_liters: number | null;
  adblue_done: boolean;
  adblue_liters: number | null;
  notes: string | null;
  created_by_user_id: string | null;
}

const ITEMS = [
  { key: "hydraulic_oil", label: "Aceite hidráulico", Icon: Droplet },
  { key: "engine_oil", label: "Aceite motor", Icon: Flame },
  { key: "coolant", label: "Refrigerante", Icon: Snowflake },
  { key: "adblue", label: "AdBlue", Icon: Beaker },
] as const;

const EXTRAS = [
  { key: "air_filters", label: "Filtros aire", Icon: Wind },
  { key: "fuel_filters", label: "Filtros combustible", Icon: Fuel },
  { key: "general_greasing", label: "Engrase general", Icon: Wrench },
] as const;

type ItemKey = (typeof ITEMS)[number]["key"];
type ExtraKey = (typeof EXTRAS)[number]["key"];

const MachineMaintenanceDialog = ({ open, machineId, machineName, onOpenChange }: Props) => {
  const { user, isAdmin } = useAuth();
  const db = supabase as any;
  const today = format(new Date(), "yyyy-MM-dd");

  const [logDate, setLogDate] = useState(today);
  const [form, setForm] = useState<Record<ItemKey, { done: boolean; liters: string }>>({
    hydraulic_oil: { done: false, liters: "" },
    engine_oil: { done: false, liters: "" },
    coolant: { done: false, liters: "" },
    adblue: { done: false, liters: "" },
  });
  const [extras, setExtras] = useState<Record<ExtraKey, boolean>>({
    air_filters: false,
    fuel_filters: false,
    general_greasing: false,
  });
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState<LogRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !machineId) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, machineId, logDate]);

  const parseNotes = (raw: string | null): { extras: Record<ExtraKey, boolean>; text: string } => {
    const empty = { air_filters: false, fuel_filters: false, general_greasing: false };
    if (!raw) return { extras: empty, text: "" };
    const m = raw.match(/^__extras__:(\{[^\n]*\})\n?/);
    if (!m) return { extras: empty, text: raw };
    try {
      const parsed = JSON.parse(m[1]);
      return {
        extras: {
          air_filters: Boolean(parsed.air_filters),
          fuel_filters: Boolean(parsed.fuel_filters),
          general_greasing: Boolean(parsed.general_greasing),
        },
        text: raw.slice(m[0].length),
      };
    } catch {
      return { extras: empty, text: raw };
    }
  };

  const serializeNotes = (extrasState: Record<ExtraKey, boolean>, text: string): string | null => {
    const anyExtra = Object.values(extrasState).some(Boolean);
    const t = text.trim();
    if (!anyExtra && !t) return null;
    if (!anyExtra) return t || null;
    return `__extras__:${JSON.stringify(extrasState)}\n${t}`;
  };

  const loadAll = async () => {
    if (!machineId) return;
    setLoading(true);
    const [{ data: hist }, { data: existing }] = await Promise.all([
      db.from("machine_maintenance_log").select("*").eq("machine_id", machineId).order("log_date", { ascending: false }).limit(60),
      db.from("machine_maintenance_log").select("*").eq("machine_id", machineId).eq("log_date", logDate).maybeSingle(),
    ]);
    setHistory((hist ?? []) as LogRow[]);
    if (existing) {
      setExistingId(existing.id);
      setForm({
        hydraulic_oil: { done: existing.hydraulic_oil_done, liters: existing.hydraulic_oil_liters?.toString() ?? "" },
        engine_oil: { done: existing.engine_oil_done, liters: existing.engine_oil_liters?.toString() ?? "" },
        coolant: { done: existing.coolant_done, liters: existing.coolant_liters?.toString() ?? "" },
        adblue: { done: existing.adblue_done, liters: existing.adblue_liters?.toString() ?? "" },
      });
      const parsed = parseNotes(existing.notes);
      setExtras(parsed.extras);
      setNotes(parsed.text);
    } else {
      setExistingId(null);
      setForm({
        hydraulic_oil: { done: false, liters: "" },
        engine_oil: { done: false, liters: "" },
        coolant: { done: false, liters: "" },
        adblue: { done: false, liters: "" },
      });
      setExtras({ air_filters: false, fuel_filters: false, general_greasing: false });
      setNotes("");
    }
    setLoading(false);
  };

  const save = async () => {
    if (!machineId || !user) return;
    setSaving(true);
    const payload = {
      machine_id: machineId,
      log_date: logDate,
      hydraulic_oil_done: form.hydraulic_oil.done,
      hydraulic_oil_liters: form.hydraulic_oil.liters ? Number(form.hydraulic_oil.liters) : null,
      engine_oil_done: form.engine_oil.done,
      engine_oil_liters: form.engine_oil.liters ? Number(form.engine_oil.liters) : null,
      coolant_done: form.coolant.done,
      coolant_liters: form.coolant.liters ? Number(form.coolant.liters) : null,
      adblue_done: form.adblue.done,
      adblue_liters: form.adblue.liters ? Number(form.adblue.liters) : null,
      notes: serializeNotes(extras, notes),
      created_by_user_id: user.id,
    };
    const { error } = existingId
      ? await db.from("machine_maintenance_log").update(payload).eq("id", existingId)
      : await db.from("machine_maintenance_log").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar el mantenimiento");
      return;
    }
    toast.success("Mantenimiento guardado");
    void loadAll();
  };

  const removeRow = async (id: string) => {
    if (!window.confirm("¿Eliminar este registro de mantenimiento?")) return;
    const { error } = await db.from("machine_maintenance_log").delete().eq("id", id);
    if (error) return toast.error("No se pudo eliminar");
    toast.success("Eliminado");
    void loadAll();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplet className="h-4 w-4 text-primary" /> Mantenimiento diario · {machineName}
          </DialogTitle>
          <DialogDescription>
            Marca lo realizado hoy y anota los litros añadidos. Una entrada por máquina y día.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground">Fecha</Label>
            <Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="w-44" />
            {existingId && <span className="text-xs text-muted-foreground">(editando registro existente)</span>}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
          ) : (
            <div className="space-y-2 rounded-lg border border-border p-3">
              {ITEMS.map((item) => {
                const value = form[item.key];
                return (
                  <div key={item.key} className={cn("flex items-center gap-3 rounded-md p-2 transition-colors", value.done && "bg-success/5")}>
                    <Checkbox
                      checked={value.done}
                      onCheckedChange={(checked) =>
                        setForm((cur) => ({ ...cur, [item.key]: { ...cur[item.key], done: Boolean(checked) } }))
                      }
                    />
                    <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={value.liters}
                      placeholder="Litros"
                      onChange={(e) =>
                        setForm((cur) => ({ ...cur, [item.key]: { ...cur[item.key], liters: e.target.value } }))
                      }
                      className="w-28"
                      disabled={!value.done}
                    />
                    <span className="w-6 text-xs text-muted-foreground">L</span>
                  </div>
                );
              })}
            </div>
          )}

          <Textarea
            placeholder="Observaciones (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-16"
          />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {existingId ? "Actualizar" : "Guardar"}
            </Button>
          </div>

          {history.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historial reciente</p>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {history.map((row) => {
                  const chips: string[] = [];
                  if (row.hydraulic_oil_done) chips.push(`Hidr. ${row.hydraulic_oil_liters ?? 0}L`);
                  if (row.engine_oil_done) chips.push(`Motor ${row.engine_oil_liters ?? 0}L`);
                  if (row.coolant_done) chips.push(`Anticong. ${row.coolant_liters ?? 0}L`);
                  if (row.adblue_done) chips.push(`AdBlue ${row.adblue_liters ?? 0}L`);
                  return (
                    <div key={row.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{format(new Date(row.log_date + "T00:00:00"), "EEE d MMM yyyy", { locale: es })}</span>
                        <span className="text-xs text-muted-foreground">{chips.join(" · ") || "Sin acciones"}</span>
                      </div>
                      {(isAdmin || row.created_by_user_id === user?.id) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => void removeRow(row.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MachineMaintenanceDialog;
