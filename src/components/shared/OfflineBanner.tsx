import { WifiOff } from "lucide-react";
import useOnlineStatus from "@/hooks/useOnlineStatus";

/**
 * Banner discreto y persistente que avisa cuando se pierde la conexión.
 * Se posiciona arriba del todo y respeta el safe-area en móviles.
 */
const OfflineBanner = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground shadow-md"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Sin conexión. Algunas acciones podrían no guardarse.</span>
    </div>
  );
};

export default OfflineBanner;
