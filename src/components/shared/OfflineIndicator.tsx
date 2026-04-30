import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

const OfflineIndicator = () => {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform rounded-full border border-destructive bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground shadow-lg animate-fade-in">
      <span className="flex items-center gap-2">
        <WifiOff className="h-3.5 w-3.5" />
        Sin conexión — los cambios se guardarán cuando vuelva
      </span>
    </div>
  );
};

export default OfflineIndicator;
