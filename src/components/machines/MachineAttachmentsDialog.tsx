import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Attachment {
  id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  uploaded_by_user_id: string;
}

interface Props {
  machineId: string | null;
  machineName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MachineAttachmentsDialog = ({ machineId, machineName, open, onOpenChange }: Props) => {
  const { user, isAdmin } = useAuth();
  const db = supabase as any;
  const [items, setItems] = useState<Attachment[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    if (!machineId) return;
    setLoading(true);
    const { data, error } = await db
      .from("machine_attachments")
      .select("id, storage_path, caption, created_at, uploaded_by_user_id")
      .eq("machine_id", machineId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("No se pudieron cargar las fotos");
      setLoading(false);
      return;
    }
    const list = (data ?? []) as Attachment[];
    setItems(list);
    const updates: Record<string, string> = {};
    for (const item of list) {
      const { data: signedData } = await db.storage.from("machine-photos").createSignedUrl(item.storage_path, 60 * 60);
      if (signedData?.signedUrl) updates[item.id] = signedData.signedUrl;
    }
    setSigned(updates);
    setLoading(false);
  };

  useEffect(() => {
    if (open && machineId) void load();
    if (!open) {
      setItems([]);
      setSigned({});
      setCaption("");
    }
  }, [open, machineId]);

  const handleUpload = async (file: File) => {
    if (!user || !machineId) return;
    if (!file.type.startsWith("image/")) return toast.error("Selecciona una imagen válida");
    if (file.size > 5 * 1024 * 1024) return toast.error("La imagen no puede superar 5 MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${machineId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await db.storage.from("machine-photos").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { error: insErr } = await db.from("machine_attachments").insert({
        machine_id: machineId,
        storage_path: path,
        caption: caption.trim() || null,
        uploaded_by_user_id: user.id,
      });
      if (insErr) throw insErr;
      setCaption("");
      toast.success("Foto añadida");
      void load();
    } catch (err) {
      toast.error("No se pudo subir la foto");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (item: Attachment) => {
    const canDelete = isAdmin || item.uploaded_by_user_id === user?.id;
    if (!canDelete) return toast.error("Solo el autor o un admin puede eliminar");
    const { error: delErr } = await db.from("machine_attachments").delete().eq("id", item.id);
    if (delErr) return toast.error("No se pudo eliminar");
    void db.storage.from("machine-photos").remove([item.storage_path]);
    toast.success("Foto eliminada");
    setItems((current) => current.filter((it) => it.id !== item.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-background">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground">Fotos de {machineName || "la máquina"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">Galería completa con histórico de fotos subidas por el equipo.</DialogDescription>
        </DialogHeader>

        {user && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Añadir nueva foto</p>
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Descripción opcional (avería, antes/después, ubicación...)" />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="soft" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? "Subiendo..." : "Seleccionar foto"}
            </Button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {loading && <p className="text-sm text-muted-foreground col-span-full">Cargando galería...</p>}
          {!loading && items.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">Aún no hay fotos para esta máquina.</p>
          )}
          {items.map((item) => {
            const url = signed[item.id];
            const canDelete = isAdmin || item.uploaded_by_user_id === user?.id;
            return (
              <div key={item.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="relative aspect-square bg-muted">
                  {url ? (
                    <img src={url} alt={item.caption || "Foto máquina"} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Cargando…</div>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void removeAttachment(item)}
                      className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 text-destructive shadow-sm hover:bg-background"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="p-2 space-y-0.5">
                  {item.caption && <p className="text-xs text-foreground line-clamp-2">{item.caption}</p>}
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {format(new Date(item.created_at), "d MMM yyyy · HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MachineAttachmentsDialog;
