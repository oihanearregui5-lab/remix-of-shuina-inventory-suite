import { useEffect, useState } from "react";
import { X, Hand } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "transtubari-welcome-dismissed-v1";

const WelcomeBanner = () => {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setOpen(true);
      // Marcar como visto INMEDIATAMENTE al mostrarse
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
  }, []);

  const dismiss = () => {
    setOpen(false);
  };

  if (!open) return null;

  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="relative mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 animate-fade-in">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div className="rounded-full bg-primary/15 p-2">
          <Hand className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            ¡Bienvenido{firstName ? `, ${firstName}` : ""} a Transtubari!
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>• <strong>Inicio:</strong> aquí ves tu día y fichas entrada/salida.</li>
            <li>• <strong>Parte:</strong> registra el trabajo del día con fotos.</li>
            <li>• <strong>Tareas:</strong> lo que tienes pendiente.</li>
            <li>• <strong>Chat:</strong> mensajes con el equipo.</li>
            <li>• Pulsa tu nombre arriba a la derecha para más opciones.</li>
          </ul>
          <p className="pt-2 text-[11px] text-muted-foreground/80">
            Este aviso solo aparece la primera vez. Si necesitas ayuda, pregunta en el chat general.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
