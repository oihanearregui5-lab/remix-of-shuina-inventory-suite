import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { UIModeProvider } from "@/hooks/useUIMode";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import PWABanner from "@/components/shared/PWABanner";
import OfflineBanner from "@/components/shared/OfflineBanner";
import { shouldRetryError } from "@/lib/error-utils";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import beeLogo from "@/assets/bee-logo.png";

/**
 * Limpieza única de datos residuales de pruebas en localStorage
 * tras el reset de la base de datos. Se ejecuta una sola vez por
 * navegador (marca con flag).
 */
const RESET_FLAG = "transtubari-reset-2026-04-24";
const useLocalStorageReset = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(RESET_FLAG)) return;
    const keysToRemove = [
      "transtubari-gasoline-records",
      "transtubari-chat-drafts",
      "transtubari-chat-last-seen",
      "transtubari-fichaje-draft",
    ];
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    // limpia cualquier draft o residuo que coincida con prefijos de pruebas
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith("transtubari-draft-") || key.startsWith("transtubari-test-")) {
        window.localStorage.removeItem(key);
      }
    });
    window.localStorage.setItem(RESET_FLAG, "1");
  }, []);
};


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="hero-surface w-full max-w-md rounded-[28px] px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-[var(--shadow-elevated)] animate-pulse">
            <img src={beeLogo} alt="Abeja Transtubari" className="h-10 w-10 object-contain" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">Preparando tu espacio de trabajo</p>
            <p className="text-sm text-muted-foreground">Cargando accesos, permisos y datos operativos de Transtubari.</p>
          </div>
        </div>
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
};

const App = () => {
  useLocalStorageReset();
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <UIModeProvider>
            <TooltipProvider>
              <Sonner />
              <BrowserRouter>
                <PWABanner />
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </UIModeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
