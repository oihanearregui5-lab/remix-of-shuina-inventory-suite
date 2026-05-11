import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MicInputProps {
  value: string;
  onChange: (value: string) => void;
  lang?: string;
  className?: string;
  /** Tamaño del botón en px (mín 40 recomendado para mobile) */
  size?: number;
}

/**
 * Botón flotante reutilizable que dicta voz a texto usando la Web Speech API.
 * Pensado para colocar dentro de un contenedor `relative` junto a un input/textarea.
 * Si el navegador no soporta la API, no renderiza nada (no muestra error).
 */
const MicInput = ({ value, onChange, lang = "es-ES", className, size = 40 }: MicInputProps) => {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baseValueRef = useRef<string>("");

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) setSupported(true);
  }, []);

  const stop = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  };

  const start = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    baseValueRef.current = value ? value.replace(/\s+$/, "") + " " : "";

    rec.onresult = (event: any) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      if (finalText) {
        baseValueRef.current = (baseValueRef.current + finalText).replace(/\s+/g, " ");
        onChange(baseValueRef.current);
      } else if (interim) {
        onChange((baseValueRef.current + interim).replace(/\s+/g, " "));
      }
    };

    rec.onerror = (e: any) => {
      setListening(false);
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        toast.error("Activa el permiso de micrófono en los ajustes del navegador");
      }
    };

    rec.onend = () => setListening(false);

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      aria-label={listening ? "Parar dictado" : "Dictar por voz"}
      title={listening ? "Parar dictado" : "Dictar por voz"}
      onClick={() => (listening ? stop() : start())}
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full border transition-all duration-200",
        listening
          ? "border-destructive bg-destructive text-destructive-foreground animate-pulse"
          : "border-border bg-card text-muted-foreground hover:text-primary hover:border-primary",
        className,
      )}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
};

export default MicInput;
