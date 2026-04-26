import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MachinePhoto {
  id: string;
  machine_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  uploaded_by_user_id: string;
  signedUrl?: string;
}

interface MachinePhotosDialogProps {
  open: boolean;
  machineId: string | null;
  machineName: string;
  onOpenChange: (open: boolean) => void;
  onCountChange?: (machineId: string, count: number) => void;
}

const BUCKET = "machine-photos";

const MachinePhotosDialog = ({ open, machineId, machineName, onOpenChange, onCountChange }: MachinePhotosDialogProps) => {
  const { user, isAdmin } = useAuth();
  const [photos, setPhotos] = useState<MachinePhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const db = supabase as any;

  const loadPhotos = async () => {
    if (!machineId) return;
    setLoading(true);
    const { data, error } = await db
      .from("machine_attachments")
      .select("id, machine_id, storage_path, caption, created_at, uploaded_by_user_id")
      .eq("machine_id", machineId)
      .order("created_at", { ascending: false });
    if (error) {
      setLoading(false);
      toast.error("No se pudieron cargar las fotos");
      return;
    }
    const rows = (data ?? []) as MachinePhoto[];
    // Obtener signed URLs para cada foto
    const withUrls = await Promise.all(
      rows.map(async (photo) => {
        const { data: urlData } = await supabase.storage.from(BUCKET).createSignedUrl(photo.storage_path, 3600);
        return { ...photo, signedUrl: urlData?.signedUrl };
      }),
    );
    setPhotos(withUrls);
    setLoading(false);
    onCountChange?.(machineId, withUrls.length);
  };

  useEffect(() => {
    if (open && machineId) {
      void loadPhotos();
    } else {
      setPhotos([]);
    }
  }, [open, machineId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !machineId || !user) return;
    setUploading(true);
    let uploaded = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}: no es una imagen`);
        continue;
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${machineId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (uploadError) {
        toast.error(`Error subiendo ${file.name}`);
        continue;
      }
      const { error: insertError } = await db.from("machine_attachments").insert({
        machine_id: machineId,
        storage_path: path,
        caption: null,
        uploaded_by_user_id: user.id,
      });
      if (insertError) {
        toast.error(`Error registrando ${file.name}`);
        // Intentamos limpiar el storage si falló el insert
        await supabase.storage.from(BUCKET).remove([path]);
        continue;
      }
      uploaded += 1;
    }
    if (uploaded > 0) toast.success(`${uploaded} foto${uploaded > 1 ? "s" : ""} subida${uploaded > 1 ? "s" : ""}`);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    void loadPhotos();
  };

  const deletePhoto = async (photo: MachinePhoto) => {
    if (!window.confirm("¿Eliminar esta foto?")) return;
    const { error: dbError } = await db.from("machine_attachments").delete().eq("id", photo.id);
    if (dbError) {
      toast.error("No se pudo eliminar");
      return;
    }
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    toast.success("Foto eliminada");
    void loadPhotos();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="border-b border-border p-5 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                <DialogTitle>Fotos · {machineName}</DialogTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Subida */}
            <div className="rounded-xl border-2 border-dashed border-border bg-background p-4">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => void handleFiles(e.target.files)}
              />
              <Button onClick={() => inputRef.current?.click()} disabled={uploading} className="w-full gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Subiendo..." : "Subir fotos"}
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Puedes seleccionar varias imágenes a la vez
              </p>
            </div>

            {/* Galería */}
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />)}
              </div>
            ) : photos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay fotos para esta máquina.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                    {photo.signedUrl ? (
                      <button
                        type="button"
                        onClick={() => setLightbox(photo.signedUrl!)}
                        className="absolute inset-0 h-full w-full"
                      >
                        <img
                          src={photo.signedUrl}
                          alt={photo.caption || "Foto de máquina"}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    )}
                    {(isAdmin || photo.uploaded_by_user_id === user?.id) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deletePhoto(photo);
                        }}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox simple */}
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-5xl border-none bg-black/95 p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Vista ampliada</DialogTitle>
          </DialogHeader>
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {lightbox && (
            <img src={lightbox} alt="Vista ampliada" className="max-h-[90vh] w-full object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MachinePhotosDialog;
