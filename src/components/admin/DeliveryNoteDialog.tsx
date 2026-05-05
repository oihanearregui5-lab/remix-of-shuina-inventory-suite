import { useEffect, useState } from "react";
import { Loader2, Trash2, Upload, ImageIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DeliveryNoteCompany = "sirek" | "wurth" | "mainate" | "acedesa";

export type DeliveryNoteExpenseTarget = "maquina" | "taller" | "otros";

export interface DeliveryNoteRow {
  id: string;
  order_number: string;
  company: DeliveryNoteCompany;
  expense_target: DeliveryNoteExpenseTarget;
  machine_asset_id: string | null;
  amount: number | null;
  delivery_date: string;
  notes: string | null;
  photo_path: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DeliveryNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: DeliveryNoteRow | null;
}

export const COMPANY_OPTIONS: { value: DeliveryNoteCompany; label: string }[] = [
  { value: "acedesa", label: "Acedesa" },
  { value: "sirek", label: "Sirek" },
  { value: "wurth", label: "Würth" },
  { value: "mainate", label: "Mainate" },
];

export const EXPENSE_TARGET_OPTIONS: { value: DeliveryNoteExpenseTarget; label: string }[] = [
  { value: "maquina", label: "Máquina" },
  { value: "taller", label: "Taller" },
  { value: "otros", label: "Otros" },
];

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const DeliveryNoteDialog = ({ open, onOpenChange, note }: DeliveryNoteDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = Boolean(note);

  const [orderNumber, setOrderNumber] = useState("");
  const [company, setCompany] = useState<DeliveryNoteCompany>("nacohi");
  const [expenseTarget, setExpenseTarget] = useState<DeliveryNoteExpenseTarget>("taller");
  const [machineAssetId, setMachineAssetId] = useState<string>("none");
  const [amount, setAmount] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: machines = [] } = useQuery({
    queryKey: ["delivery-note-machines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machine_assets")
        .select("id, display_name")
        .order("display_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (note) {
      setOrderNumber(note.order_number);
      setCompany(note.company);
      setExpenseTarget(note.expense_target);
      setMachineAssetId(note.machine_asset_id ?? "none");
      setAmount(note.amount?.toString() ?? "");
      setDeliveryDate(note.delivery_date);
      setNotes(note.notes ?? "");
      setExistingPhotoPath(note.photo_path);
    } else {
      setOrderNumber("");
      setCompany("nacohi");
      setExpenseTarget("taller");
      setMachineAssetId("none");
      setAmount("");
      setDeliveryDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setExistingPhotoPath(null);
    }
    setPhotoFile(null);
  }, [note, open]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!orderNumber.trim()) {
      toast({ title: "Faltan datos", description: "Indica el número de pedido.", variant: "destructive" });
      return;
    }
    if (expenseTarget === "maquina" && machineAssetId === "none") {
      toast({ title: "Selecciona la máquina", description: "Si el gasto es para una máquina, indica cuál.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let photoPath = existingPhotoPath;

      if (photoFile) {
        const safeName = sanitizeFileName(photoFile.name);
        const path = `${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("delivery-notes")
          .upload(path, photoFile, { contentType: photoFile.type || "image/jpeg" });
        if (uploadError) throw uploadError;

        if (existingPhotoPath) {
          await supabase.storage.from("delivery-notes").remove([existingPhotoPath]);
        }
        photoPath = path;
      }

      const payload = {
        order_number: orderNumber.trim(),
        company,
        expense_target: expenseTarget,
        machine_asset_id: expenseTarget === "maquina" && machineAssetId !== "none" ? machineAssetId : null,
        amount: amount ? Number(amount) : null,
        delivery_date: deliveryDate,
        notes: notes.trim() || null,
        photo_path: photoPath,
      };

      if (isEditing && note) {
        const { error } = await supabase.from("delivery_notes").update(payload).eq("id", note.id);
        if (error) throw error;
        toast({ title: "Albarán actualizado" });
      } else {
        const { error } = await supabase
          .from("delivery_notes")
          .insert({ ...payload, created_by_user_id: user.id });
        if (error) throw error;
        toast({ title: "Albarán creado" });
      }

      queryClient.invalidateQueries({ queryKey: ["delivery-notes"] });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    if (!confirm("¿Eliminar este albarán y su foto asociada?")) return;
    setSubmitting(true);
    try {
      if (note.photo_path) {
        await supabase.storage.from("delivery-notes").remove([note.photo_path]);
      }
      const { error } = await supabase.from("delivery_notes").delete().eq("id", note.id);
      if (error) throw error;
      toast({ title: "Albarán eliminado" });
      queryClient.invalidateQueries({ queryKey: ["delivery-notes"] });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar albarán" : "Nuevo albarán"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="order_number">Nº de pedido *</Label>
              <Input id="order_number" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="P-2026-001" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delivery_date">Fecha del albarán</Label>
              <Input id="delivery_date" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Select value={company} onValueChange={(v) => setCompany(v as DeliveryNoteCompany)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Destino del gasto</Label>
              <Select value={expenseTarget} onValueChange={(v) => setExpenseTarget(v as DeliveryNoteExpenseTarget)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_TARGET_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {expenseTarget === "maquina" && (
            <div className="space-y-1.5">
              <Label>Máquina relacionada *</Label>
              <Select value={machineAssetId} onValueChange={setMachineAssetId}>
                <SelectTrigger><SelectValue placeholder="Selecciona una máquina" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="amount">Importe (€)</Label>
            <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Detalles del gasto, referencias, observaciones…" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="photo">Foto del albarán</Label>
            <div className="flex flex-col gap-2">
              {existingPhotoPath && !photoFile && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <span className="flex-1 truncate">{existingPhotoPath.split("/").pop()}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExistingPhotoPath(null)}
                  >
                    Quitar
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              {photoFile && <p className="text-xs text-muted-foreground">Nueva: {photoFile.name}</p>}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between gap-2 sm:justify-between">
          {isEditing ? (
            <Button type="button" variant="ghost" onClick={handleDelete} disabled={submitting} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Crear albarán"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryNoteDialog;
