import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, Upload, FileText } from "lucide-react";
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

export type DeliveryNoteStatus = "pending" | "validated" | "incident" | "archived";

export interface DeliveryNoteRow {
  id: string;
  note_number: string;
  customer: string;
  route: string | null;
  driver_staff_id: string | null;
  driver_name: string | null;
  delivery_date: string;
  weight_kg: number | null;
  status: DeliveryNoteStatus;
  observations: string | null;
  pdf_storage_path: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

interface DeliveryNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: DeliveryNoteRow | null;
}

const statusOptions: { value: DeliveryNoteStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "validated", label: "Validado" },
  { value: "incident", label: "Incidencia" },
  { value: "archived", label: "Archivado" },
];

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const DeliveryNoteDialog = ({ open, onOpenChange, note }: DeliveryNoteDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = Boolean(note);

  const [noteNumber, setNoteNumber] = useState("");
  const [customer, setCustomer] = useState("");
  const [route, setRoute] = useState("");
  const [driverStaffId, setDriverStaffId] = useState<string>("none");
  const [driverName, setDriverName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weightKg, setWeightKg] = useState("");
  const [status, setStatus] = useState<DeliveryNoteStatus>("pending");
  const [observations, setObservations] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [existingPdfPath, setExistingPdfPath] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: drivers = [] } = useQuery({
    queryKey: ["delivery-note-drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_directory")
        .select("id, full_name")
        .eq("active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (note) {
      setNoteNumber(note.note_number);
      setCustomer(note.customer);
      setRoute(note.route ?? "");
      setDriverStaffId(note.driver_staff_id ?? "none");
      setDriverName(note.driver_name ?? "");
      setDeliveryDate(note.delivery_date);
      setWeightKg(note.weight_kg?.toString() ?? "");
      setStatus(note.status);
      setObservations(note.observations ?? "");
      setExistingPdfPath(note.pdf_storage_path);
    } else {
      setNoteNumber("");
      setCustomer("");
      setRoute("");
      setDriverStaffId("none");
      setDriverName("");
      setDeliveryDate(new Date().toISOString().slice(0, 10));
      setWeightKg("");
      setStatus("pending");
      setObservations("");
      setExistingPdfPath(null);
    }
    setPdfFile(null);
  }, [note, open]);

  const driverDisplayName = useMemo(() => {
    if (driverStaffId !== "none") {
      const found = drivers.find((d) => d.id === driverStaffId);
      if (found) return found.full_name;
    }
    return driverName.trim() || null;
  }, [driverStaffId, driverName, drivers]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!noteNumber.trim() || !customer.trim()) {
      toast({ title: "Faltan datos", description: "Indica número de albarán y cliente.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let pdfPath = existingPdfPath;

      if (pdfFile) {
        const safeName = sanitizeFileName(pdfFile.name);
        const path = `${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("delivery-notes")
          .upload(path, pdfFile, { contentType: pdfFile.type || "application/pdf" });
        if (uploadError) throw uploadError;

        // Borra el anterior si existía
        if (existingPdfPath) {
          await supabase.storage.from("delivery-notes").remove([existingPdfPath]);
        }
        pdfPath = path;
      }

      const payload = {
        note_number: noteNumber.trim(),
        customer: customer.trim(),
        route: route.trim() || null,
        driver_staff_id: driverStaffId !== "none" ? driverStaffId : null,
        driver_name: driverDisplayName,
        delivery_date: deliveryDate,
        weight_kg: weightKg ? Number(weightKg) : null,
        status,
        observations: observations.trim() || null,
        pdf_storage_path: pdfPath,
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
    if (!confirm("¿Eliminar este albarán y su PDF asociado?")) return;
    setSubmitting(true);
    try {
      if (note.pdf_storage_path) {
        await supabase.storage.from("delivery-notes").remove([note.pdf_storage_path]);
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
              <Label htmlFor="note_number">Nº albarán *</Label>
              <Input id="note_number" value={noteNumber} onChange={(e) => setNoteNumber(e.target.value)} placeholder="ALB-2025-001" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delivery_date">Fecha de entrega</Label>
              <Input id="delivery_date" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer">Cliente *</Label>
              <Input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Tubacex" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="route">Ruta</Label>
              <Input id="route" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="Bilbao → Miranda" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Chófer (plantilla)</Label>
              <Select value={driverStaffId} onValueChange={setDriverStaffId}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driver_name">Chófer (texto libre)</Label>
              <Input id="driver_name" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Si no está en plantilla" disabled={driverStaffId !== "none"} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="weight">Kilos</Label>
              <Input id="weight" type="number" step="0.01" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as DeliveryNoteStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea id="observations" value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} placeholder="Incidencias, referencias, notas internas…" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pdf">PDF del albarán</Label>
            <div className="flex flex-col gap-2">
              {existingPdfPath && !pdfFile && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="flex-1 truncate">{existingPdfPath.split("/").pop()}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExistingPdfPath(null)}
                  >
                    Quitar
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  id="pdf"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              {pdfFile && <p className="text-xs text-muted-foreground">Nuevo: {pdfFile.name}</p>}
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
