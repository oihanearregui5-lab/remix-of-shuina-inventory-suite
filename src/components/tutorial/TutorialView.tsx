import { useEffect, useRef, useState } from "react";
import { GraduationCap, Upload, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { TutorialPlayer } from "./TutorialPlayer";

interface VideoRow {
  id: string;
  storage_path: string;
  original_filename: string;
  size_bytes: number;
  uploaded_at: string;
}

const ACCEPTED = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_BYTES = 200 * 1024 * 1024;

interface Props {
  isAdminView?: boolean;
}

export default function TutorialView({ isAdminView = false }: Props) {
  const { user, isAdmin } = useAuth();
  const canManage = isAdmin && isAdminView;
  const [video, setVideo] = useState<VideoRow | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("tutorial_videos")
      .select("id, storage_path, original_filename, size_bytes, uploaded_at")
      .eq("is_active", true)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.error(error);
    if (data) {
      setVideo(data as VideoRow);
      const { data: urlData, error: urlErr } = await supabase.storage
        .from("tutorial-videos")
        .createSignedUrl((data as VideoRow).storage_path, 3600);
      if (urlErr) console.error(urlErr);
      setSignedUrl(urlData?.signedUrl ?? null);
    } else {
      setVideo(null);
      setSignedUrl(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleFile = async (file: File) => {
    if (!user) return;
    if (!ACCEPTED.includes(file.type)) {
      toast({ title: "Formato no válido", description: "Sube MP4, MOV o WebM.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "Archivo demasiado grande", description: "Máximo 200 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    setProgress(5);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/${Date.now()}.${ext}`;
      // Fake progress while upload (supabase-js v2 doesn't expose progress for file uploads)
      const progressTimer = setInterval(() => {
        setProgress((p) => (p < 85 ? p + 5 : p));
      }, 400);
      const { error: upErr } = await supabase.storage
        .from("tutorial-videos")
        .upload(path, file, { contentType: file.type, upsert: false });
      clearInterval(progressTimer);
      if (upErr) throw upErr;
      setProgress(95);
      const { error: insErr } = await (supabase as any).from("tutorial_videos").insert({
        storage_path: path,
        original_filename: file.name,
        size_bytes: file.size,
        uploaded_by: user.id,
        is_active: true,
      });
      if (insErr) throw insErr;
      setProgress(100);
      toast({ title: "Vídeo subido correctamente" });
      await load();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error al subir", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!video) return;
    try {
      await supabase.storage.from("tutorial-videos").remove([video.storage_path]);
      await (supabase as any).from("tutorial_videos").delete().eq("id", video.id);
      toast({ title: "Vídeo eliminado" });
      await load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setConfirmDelete(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tutorial</h1>
          <p className="text-sm text-muted-foreground">Vídeo guía de la aplicación con capítulos.</p>
        </div>
      </header>

      {loading ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : !video || !signedUrl ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Aún no hay tutorial disponible"
              : "Pídele a administración que suba el vídeo del tutorial."}
          </p>
          {canManage && (
            <Button className="mt-4" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="mr-2 h-4 w-4" />
              Subir vídeo
            </Button>
          )}
        </div>
      ) : (
        user && <TutorialPlayer src={signedUrl} videoId={video.id} userId={user.id} />
      )}

      {canManage && video && (
        <div className="rounded-2xl border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Administración del vídeo</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            {video.original_filename} · {(video.size_bytes / 1024 / 1024).toFixed(1)} MB
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reemplazar vídeo
            </Button>
            <Button variant="destructive" onClick={() => setConfirmDelete(true)} disabled={uploading}>
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </Button>
          </div>
        </div>
      )}

      {uploading && (
        <div className="rounded-2xl border bg-card p-4">
          <p className="mb-2 text-sm">Subiendo vídeo… {progress}%</p>
          <Progress value={progress} />
        </div>
      )}

      {canManage && (
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar vídeo del tutorial?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los usuarios dejarán de ver el tutorial hasta que subas uno nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
