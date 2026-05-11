import { useEffect, useRef, useState } from "react";
import { Mic, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatAudioRecorderProps {
  disabled?: boolean;
  /** Llamado al soltar si la grabación duró ≥1s y no se canceló */
  onRecorded: (blob: Blob, durationSeconds: number) => void;
}

const MAX_SECONDS = 120;

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const ChatAudioRecorder = ({ disabled, onRecorded }: ChatAudioRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [cancelHovered, setCancelHovered] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const cancelRef = useRef(false);
  const startXRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const cleanupStream = () => {
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    chunksRef.current = [];
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => cleanupStream(), []);

  const start = async (clientX: number | null) => {
    if (disabled || recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Tu navegador no permite grabar audio");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      cancelRef.current = false;
      startXRef.current = clientX;
      startedAtRef.current = Date.now();
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const dur = Math.round((Date.now() - startedAtRef.current) / 1000);
        cleanupStream();
        setRecording(false);
        setSeconds(0);
        setCancelHovered(false);
        if (cancelRef.current) return;
        if (dur < 1) {
          toast.message("Mantén pulsado para grabar");
          return;
        }
        onRecorded(blob, Math.min(dur, MAX_SECONDS));
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_SECONDS) stop(false);
      }, 250);
    } catch (e: any) {
      if (e?.name === "NotAllowedError") {
        toast.error("Activa el permiso de micrófono en los ajustes del navegador");
      } else {
        toast.error("No se pudo iniciar la grabación");
      }
    }
  };

  const stop = (cancel: boolean) => {
    cancelRef.current = cancel;
    try {
      recorderRef.current?.stop();
    } catch {
      cleanupStream();
      setRecording(false);
      setSeconds(0);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    void start(e.clientX);
  };
  const onPointerUp = () => {
    if (!recording) return;
    stop(cancelHovered);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!recording || startXRef.current == null) return;
    const dx = e.clientX - startXRef.current;
    setCancelHovered(dx < -60);
  };

  return (
    <>
      {recording ? (
        <div className="absolute inset-x-0 -top-12 mx-3 flex items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive shadow-[var(--shadow-soft)]">
          <span className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-destructive" />
            Grabando {formatTime(seconds)}
          </span>
          <span className={cn("flex items-center gap-1", cancelHovered ? "font-semibold" : "opacity-70")}>
            {cancelHovered ? (
              <>
                <Trash2 className="h-3.5 w-3.5" /> Suelta para cancelar
              </>
            ) : (
              <>← Desliza para cancelar · Suelta para enviar</>
            )}
          </span>
        </div>
      ) : null}
      <button
        type="button"
        aria-label="Mantén pulsado para grabar audio"
        title="Mantén pulsado para grabar audio"
        disabled={disabled}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => stop(true)}
        onPointerLeave={onPointerUp}
        onPointerMove={onPointerMove}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "inline-flex h-12 w-12 flex-none items-center justify-center rounded-2xl border transition-all duration-200 select-none touch-none",
          recording
            ? "border-destructive bg-destructive text-destructive-foreground scale-110 animate-pulse"
            : "border-border bg-card text-muted-foreground hover:text-primary hover:border-primary",
          disabled && "opacity-40 cursor-not-allowed",
        )}
      >
        <Mic className="h-5 w-5" />
      </button>
    </>
  );
};

export default ChatAudioRecorder;
