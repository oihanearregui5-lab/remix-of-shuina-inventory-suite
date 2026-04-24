import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface HighlightRecord {
  id: string;
  title: string;
  summary: string | null;
  category: string;
  highlight_date: string;
}

interface HighlightComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlight?: HighlightRecord | null;
  onSaved?: () => void;
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "operativa", label: "Operativa" },
  { value: "seguridad", label: "Seguridad" },
  { value: "rrhh", label: "RR.HH." },
  { value: "mantenimiento", label: "Mantenimiento" },
];

const HighlightComposerDialog = ({ open, onOpenChange, highlight, onSaved }: HighlightComposerDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("general");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (highlight) {
      setTitle(highlight.title);
      setSummary(highlight.summary ?? "");
      setCategory(highlight.category || "general");
      setDate(highlight.highlight_date);
    } else {
      setTitle("");
      setSummary("");
      setCategory("general");
      setDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [open, highlight]);

  const handleSave = async () => {
    if (!user) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error("Pon un título para el aviso");
      return;
    }
    setSaving(true);
    const payload = {
      title: cleanTitle,
      summary: summary.trim() || null,
      category,
      highlight_date: date,
    };

    const { error } = highlight
      ? await supabase.from("daily_highlights").update(payload).eq("id", highlight.id)
      : await supabase.from("daily_highlights").insert({ ...payload, created_by_user_id: user.id });

    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar el aviso");
      return;
    }
    toast.success(highlight ? "Aviso actualizado" : "Aviso publicado");
    onSaved?.();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!highlight) return;
    setDeleting(true);
    const { error } = await supabase.from("daily_highlights").delete().eq("id", highlight.id);
    setDeleting(false);
    if (error) {
      toast.error("No se pudo eliminar el aviso");
      return;
    }
    toast.success("Aviso eliminado");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            {highlight ? "Editar aviso" : "Nuevo aviso para el equipo"}
          </DialogTitle>
          <DialogDescription>
            Los avisos aparecen en el panel principal de cada trabajador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="highlight-title">Título</Label>
            <Input
              id="highlight-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Cierre del taller el viernes"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="highlight-summary">Detalle (opcional)</Label>
            <Textarea
              id="highlight-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Información adicional para el equipo"
              className="min-h-[100px]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="highlight-category">Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="highlight-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="highlight-date">Fecha</Label>
              <Input
                id="highlight-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {highlight ? (
            <Button
              variant="outline"
              onClick={() => void handleDelete()}
              disabled={deleting || saving}
              className="text-destructive hover:text-destructive"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar
            </Button>
          ) : <span className="hidden sm:block" />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || deleting}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || deleting}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {highlight ? "Guardar cambios" : "Publicar aviso"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HighlightComposerDialog;
