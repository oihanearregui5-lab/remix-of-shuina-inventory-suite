import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary capturó:", error, info);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="hero-surface w-full max-w-lg rounded-[28px] px-8 py-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Algo ha fallado</p>
          <h1 className="mt-3 text-2xl font-bold text-foreground">Se ha producido un error inesperado</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">No te preocupes: tu trabajo está guardado. Puedes recargar la página o intentarlo de nuevo.</p>
          {import.meta.env.DEV && this.state.error ? (
            <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
          ) : null}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" size="lg" onClick={this.handleReset} className="gap-2">Volver a intentar</Button>
            <Button size="lg" onClick={this.handleReload} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Recargar
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;