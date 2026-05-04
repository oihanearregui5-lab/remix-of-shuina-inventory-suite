import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn("Ruta no encontrada:", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="hero-surface w-full max-w-lg rounded-[28px] px-8 py-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-[var(--shadow-elevated)]">
          <img src="/favicon.png" alt="Transtubari" className="h-10 w-10 object-contain" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Error 404</p>
        <h1 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">Página no encontrada</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          La ruta <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{location.pathname}</code> no existe o ha sido movida.
          Vuelve al inicio o a la página anterior para continuar.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" size="lg" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Atrás
          </Button>
          <Button size="lg" onClick={() => navigate("/")} className="gap-2">
            <Home className="h-4 w-4" />
            Ir al inicio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
