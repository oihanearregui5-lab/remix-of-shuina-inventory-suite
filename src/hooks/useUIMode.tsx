import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type UIMode = "simple" | "full";

const STORAGE_KEY = "ui-density-mode";

const isMobileViewport = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
};

const readInitialMode = (): UIMode => {
  if (typeof window === "undefined") return "simple";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "simple" || stored === "full") return stored;
  return isMobileViewport() ? "simple" : "full";
};

interface UIModeContextValue {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
  toggleMode: () => void;
  isSimple: boolean;
}

const UIModeContext = createContext<UIModeContextValue | null>(null);

export const UIModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setModeState] = useState<UIMode>(() => readInitialMode());

  const setMode = useCallback((next: UIMode) => {
    setModeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "simple" ? "full" : "simple");
  }, [mode, setMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("ui-simple", mode === "simple");
    document.body.classList.toggle("ui-full", mode === "full");
    return () => {
      document.body.classList.remove("ui-simple");
      document.body.classList.remove("ui-full");
    };
  }, [mode]);

  const value = useMemo<UIModeContextValue>(
    () => ({ mode, setMode, toggleMode, isSimple: mode === "simple" }),
    [mode, setMode, toggleMode],
  );

  return <UIModeContext.Provider value={value}>{children}</UIModeContext.Provider>;
};

export const useUIMode = (): UIModeContextValue => {
  const ctx = useContext(UIModeContext);
  if (!ctx) {
    // Fallback seguro: comporta como modo completo si no hay provider
    return { mode: "full", setMode: () => {}, toggleMode: () => {}, isSimple: false };
  }
  return ctx;
};

export default useUIMode;
