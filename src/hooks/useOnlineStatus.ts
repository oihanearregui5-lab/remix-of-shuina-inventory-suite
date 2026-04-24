import { useEffect, useState } from "react";

/**
 * Hook simple que expone si el navegador está online según `navigator.onLine`
 * y los eventos `online`/`offline`. Devuelve `true` por defecto en SSR.
 */
export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
};

export default useOnlineStatus;
