import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CheckCircle2, LockKeyhole, Mail, Truck, LogIn, UserPlus, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import logoHorizontal from "@/assets/logo-horizontal.png";

const BeeMark = () => (
  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
    <img src="/favicon.svg" alt="Abeja Transtubari" className="h-10 w-10 object-contain" />
  </div>
);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { bootstrapUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await bootstrapUser();
        toast.success("¡Bienvenido de vuelta!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisa tu correo para confirmar.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAccess = async () => {
    setLoading(true);
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch (error: any) {
      toast.error(error.message ?? "No se pudo iniciar con Google");
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error("Escribe tu correo para recuperar el acceso");
      return;
    }

    setRecovering(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success("Te hemos enviado un correo para recuperar tu contraseña");
    } catch (error: any) {
      toast.error(error.message ?? "No se pudo enviar el correo de recuperación");
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="hero-surface hidden rounded-[32px] p-8 xl:flex xl:flex-col xl:justify-between">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-border/80 bg-background/85 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
                <Truck className="h-5 w-5" />
              </div>
              Plataforma centralizada de fichajes y operación
            </div>

            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Bienvenida</p>
              <h1 className="max-w-2xl text-5xl font-bold tracking-tight text-foreground">Control horario profesional para una operativa real.</h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                Accede a fichajes, tareas, vacaciones, maquinaria y comunicación interna desde una experiencia clara, fiable y diseñada para uso diario en campo y oficina.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                [Mail, "Acceso seguro", "Correo y contraseña con flujo limpio y validación clara."],
                [LockKeyhole, "Alta confianza", "Estructura orientada a empresa con estados, feedback y jerarquía nítida."],
                [CheckCircle2, "Operación centralizada", "Todo el trabajo diario en un único entorno rápido y legible."],
              ].map(([Icon, title, description]) => (
                <div key={title as string} className="rounded-2xl border border-border/80 bg-background/88 p-5 shadow-[var(--shadow-soft)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-foreground">{title as string}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description as string}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background/90 p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Acceso rápido al trabajo diario</p>
                <p className="text-sm text-muted-foreground">Diseñado para móvil, tablet y escritorio.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="panel-surface w-full max-w-xl p-6 md:p-8">
            <div className="mb-8 space-y-3 text-center xl:text-left">
              <div className="mx-auto xl:mx-0">
                <BeeMark />
              </div>
              <div>
                <img src={logoHorizontal} alt="Logo Transtubari" className="mx-auto h-10 w-auto object-contain xl:mx-0" />
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Accede al sistema de fichajes, tareas y coordinación interna con una entrada simple y segura.</p>
              </div>
            </div>

            <div className="mb-6 flex rounded-xl border border-border bg-muted/50 p-1">
              <button type="button" onClick={() => setIsLogin(true)} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${isLogin ? "bg-card text-foreground shadow-[var(--shadow-soft)]" : "text-muted-foreground"}`}>Iniciar sesión</button>
              <button type="button" onClick={() => setIsLogin(false)} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${!isLogin ? "bg-card text-foreground shadow-[var(--shadow-soft)]" : "text-muted-foreground"}`}>Crear acceso</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Juan García"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@transtubari.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>

              {isLogin && (
                <button type="button" onClick={() => void handleForgotPassword()} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline" disabled={recovering || loading}>
                  <KeyRound className="h-4 w-4" />
                  {recovering ? "Enviando recuperación..." : "¿Has olvidado tu contraseña?"}
                </button>
              )}

              <Button type="submit" variant="premium" size="xl" className="w-full" disabled={loading}>
                {loading ? (
                  "Cargando..."
                ) : isLogin ? (
                  <>
                    <LogIn className="w-4 h-4" /> Entrar
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Registrarse
                  </>
                )}
              </Button>

              <Button type="button" variant="surface" size="xl" className="w-full" disabled={loading} onClick={() => void handleGoogleAccess()}>
                Entrar con Google
              </Button>
            </form>

            <div className="mt-5 text-center xl:text-left">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm font-medium text-primary hover:underline"
              >
                {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Auth;
