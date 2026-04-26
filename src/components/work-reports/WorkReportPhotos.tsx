import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BUCKET = "work-report-photos";

interface PhotoRow {
  id: string;
  storage_path: string;
  caption: string | null;
  uploaded_at: string;
  signedUrl?: string;
}

interface WorkReportPhotosProps {
  reportId: string;
  /** Si false, oculta el botón de subir (modo solo-lectura) */
  canEdit?: boolean;
  /** Si true, muestra solo un contador con botón de abrir; útil dentro de listas */
  compact?: boolean;
}

const WorkReportPhotos = ({ reportId, canEdit = true, compact = false }: WorkReportPhotosProps) => {
  const { user } = useAuth();
  const db = supabase as any;
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = async () => {
    setLoading(true);
    const { data, error } = await db
      .from("work_report_photos")
      .select("id, storage_path, caption, uploaded_at")
      .eq("work_report_id", reportId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.warn("No se pudieron cargar las fotos del parte:", error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as PhotoRow[];
    const withUrls = await Promise.all(
      rows.map(async (p) => {
        const { data: u } = await supabase.storage.from(BUCKET).createSignedUrl(p.storage_path, 3600);
        return { ...p, signedUrl: u?.signedUrl };
      }),
    );
    setPhotos(withUrls);
    setLoading(false);
  };

  useEffect(() => {
    if (reportId) void fetchPhotos();
  }, [reportId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    let successCount = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}: solo imágenes`);
        continue;
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${reportId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) {
        toast.error(`No se pudo subir ${file.name}`);
        continue;
      }
      const { error: dbErr } = await db.from("work_report_photos").insert({
        work_report_id: reportId,
        storage_path: path,
        uploaded_by_user_id: user.id,
      });
      if (dbErr) {
        // Limpiar el blob si falla la fila
        await supabase.storage.from(BUCKET).remove([path]);
        toast.error(`No se pudo registrar ${file.name}`);
        continue;
      }
      successCount += 1;
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (successCount > 0) {
      toast.success(`${successCount} foto${successCount !== 1 ? "s" : ""} añadida${successCount !== 1 ? "s" : ""}`);
      void fetchPhotos();
    }
  };

  const deletePhoto = async (photo: PhotoRow) => {
    if (!window.confirm("¿Eliminar esta foto?")) return;
    const { error } = await db.from("work_report_photos").delete().eq("id", photo.id);
    if (error) return toast.error("No se pudo eliminar");
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    toast.success("Foto eliminada");
    void fetchPhotos();
  };

  // ============ MODO COMPACTO ============
  if (compact) {
    if (loading) return <span className="text-xs text-muted-foreground">…</span>;
    if (photos.length === 0 && !canEdit) return null;
    return (
      <>
        <button
          type="button"
          onClick={() => setGalleryOpen(true)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors",
            photos.length > 0
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          <Camera className="h-3 w-3" />
          {photos.length > 0 ? `${photos.length} foto${photos.length !== 1 ? "s" : ""}` : "Sin fotos"}
        </button>
        {/* Dialog de galería */}
        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Fotos del parte</DialogTitle>
            </DialogHeader>
            <FullPhotosBlock
              photos={photos}
              canEdit={canEdit}
              uploading={uploading}
              onUploadClick={() => inputRef.current?.click()}
              onDelete={deletePhoto}
              onOpenLightbox={setLightboxIdx}
            />
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          </DialogContent>
        </Dialog>
        <Lightbox photos={photos} idx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      </>
    );
  }

  // ============ MODO COMPLETO (inline en el formulario) ============
  return (
    <div className="space-y-3">
      <FullPhotosBlock
        photos={photos}
        canEdit={canEdit}
        uploading={uploading}
        onUploadClick={() => inputRef.current?.click()}
        onDelete={deletePhoto}
        onOpenLightbox={setLightboxIdx}
      />
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      <Lightbox photos={photos} idx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
    </div>
  );
};

// ============ SUBCOMPONENTES ============
interface FullPhotosBlockProps {
  photos: PhotoRow[];
  canEdit: boolean;
  uploading: boolean;
  onUploadClick: () => void;
  onDelete: (p: PhotoRow) => void | Promise<void>;
  onOpenLightbox: (idx: number) => void;
}

const FullPhotosBlock = ({ photos, canEdit, uploading, onUploadClick, onDelete, onOpenLightbox }: FullPhotosBlockProps) => {
  return (
    <>
      {canEdit && (
        <Button type="button" variant="outline" onClick={onUploadClick} disabled={uploading} className="w-full gap-2 border-dashed">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Subiendo…" : "Adjuntar fotos"}
        </Button>
      )}

      {photos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
          Aún no hay fotos en este parte.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo, i) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              {photo.signedUrl && (
                <button
                  type="button"
                  onClick={() => onOpenLightbox(i)}
                  className="block h-full w-full"
                >
                  <img src={photo.signedUrl} alt="Foto del parte" className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void onDelete(photo)}
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground opacity-0 shadow-lg transition-opacity hover:bg-destructive group-hover:opacity-100"
                  title="Eliminar foto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

interface LightboxProps {
  photos: PhotoRow[];
  idx: number | null;
  onClose: () => void;
}

const Lightbox = ({ photos, idx, onClose }: LightboxProps) => {
  if (idx === null || !photos[idx]?.signedUrl) return null;
  return (
    <Dialog open={idx !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl border-none bg-black/95 p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Foto del parte</DialogTitle>
        </DialogHeader>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
        <img src={photos[idx].signedUrl!} alt="Foto del parte" className="max-h-[90vh] w-full object-contain" />
      </DialogContent>
    </Dialog>
  );
};

export default WorkReportPhotos;
