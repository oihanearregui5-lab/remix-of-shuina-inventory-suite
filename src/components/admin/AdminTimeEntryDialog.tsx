import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface WorkerOption {
  user_id: string;
  full_name: string;
}

interface ExistingEntry {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: ExistingEntry | null;
  onSaved?: () => void;
}

const toLocalInput = (iso: string | null) => (iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : "");
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

const AdminTimeEntryDialog = ({ open, onOpenChange, entry, onSaved }: Props) => {
  const db = supabase as any;
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(entry?.id);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data } = await db.from("profiles").select("user_id, full_name").order("full_name");
      setWorkers((data ?? []) as WorkerOption[]);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setUserId(entry.user_id);
      setClockIn(toLocalInput(entry.clock_in));
      setClockOut(toLocalInput(entry.clock_out));
      setNotes(entry.notes ?? "");
    } else {
      setUserId("");
      setClockIn(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setClockOut("");
      setNotes("");
    }
  }, [entry, open]);

  const handleSave = async () => {
    if (!userId) return toast.error("Selecciona un trabajador");
    if (!clockIn) return toast.error("Indica la hora de entrada");
    if (clockOut && new Date(clockOut) <= new Date(clockIn)) {
      return toast.error("La salida debe ser posterior a la entrada");
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      clock_in: fromLocalInput(clockIn),
      clock_out: fromLocalInput(clockOut),
      notes: notes.trim() || null,
    };
    const { error } = isEdit
      ? await db.from("time_entries").update(payload).eq("id", entry!.id)
      : await db.from("time_entries").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(isEdit ? "No se pudo actualizar el fichaje" : "No se pudo crear el fichaje");
      return;
    }
    toast.success(isEdit ? "Fichaje actualizado" : "Fichaje creado");
    onSaved?.();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!entry) return;
    if (!window.confirm("¿Eliminar este fichaje? Esta acción no se puede deshacer.")) return;
    setSaving(true);
    const { error } = await db.from("time_entries").delete().eq("id", entry.id);
    setSaving(false);
    if (error) return toast.error("No se pudo eliminar");
    toast.success("Fichaje eliminado");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-background">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isEdit ? "Editar fichaje" : "Crear fichaje manual"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Ajusta entrada y salida del trabajador." : "Registra horas para un trabajador desde administración."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Trabajador</Label>
            <Select value={userId} onValueChange={setUserId} disabled={isEdit}>
              <SelectTrigger><SelectValue placeholder="Selecciona trabajador" /></SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w.user_id} value={w.user_id}>{w.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Entrada</Label>
              <Input type="datetime-local" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Salida (opcional)</Label>
              <Input type="datetime-local" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Motivo de la edición, incidencias..." className="min-h-20" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {isEdit && (
            <Button variant="outline" onClick={() => void handleDelete()} disabled={saving} className="mr-auto text-destructive hover:text-destructive">
              Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Crear fichaje"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminTimeEntryDialog;
