import { useState } from "react";
import { Download, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/usePWA";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "transtubari-pwa-install-dismissed";

const PWABanner = () => {
  const { isOnline, canInstall, requestInstall, isInstalled, isPWAEligible } = usePWA();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });

  const handleDismiss = () => {
    setDismissed(true);
    window.localStorage.setItem(DISMISS_KEY, "1");
  };

  const showInstall = isPWAEligible && canInstall && !isInstalled && !dismissed;

  if (!showInstall && isOnline) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:max-w-sm">
      {!isOnline && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl border border-amber-300/60 bg-amber-50/95 px-4 py-2.5 text-sm text-amber-900 shadow-[var(--shadow-elevated)] backdrop-blur",
          )}
          role="status"
          aria-live="polite"
        >
          <WifiOff className="h-4 w-4" />
          <span className="font-medium">Sin conexión</span>
          <span className="text-amber-800/80">· Mostrando datos en caché</span>
        </div>
      )}

      {showInstall && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-card/95 px-4 py-3 shadow-[var(--shadow-elevated)] backdrop-blur">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Instalar Transtubari</p>
            <p className="text-xs text-muted-foreground">Acceso directo y uso offline.</p>
          </div>
          <Button size="sm" onClick={requestInstall}>Instalar</Button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Descartar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PWABanner;
