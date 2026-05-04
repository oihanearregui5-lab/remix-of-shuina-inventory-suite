import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogIn, KeyRound } from "lucide-react";
import logoIcon from "@/assets/logo-transtubari-icon.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

type View = "login" | "change-pin";

const LOCK_KEY = "transtubari-auth-locked";
const ATTEMPTS_KEY = "transtubari-auth-attempts";
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 60_000;
const PIN_REGEX = /^[A-Z][0-9]{6}$/;

const checkLocked = (): number | null => {
  const stored = localStorage.getItem(LOCK_KEY);
  if (!stored) return null;
  const ts = parseInt(stored, 10);
  if (Number.isFinite(ts) && ts > Date.now()) return ts;
  localStorage.removeItem(LOCK_KEY);
  return null;
};

const recordFailedAttempt = () => {
  const current = parseInt(localStorage.getItem(ATTEMPTS_KEY) ?? "0", 10) + 1;
  localStorage.setItem(ATTEMPTS_KEY, String(current));
  if (current >= MAX_ATTEMPTS) {
    localStorage.setItem(LOCK_KEY, String(Date.now() + LOCK_DURATION_MS));
    localStorage.removeItem(ATTEMPTS_KEY);
  }
};

const recordSuccessfulLogin = () => {
  localStorage.removeItem(LOCK_KEY);
  localStorage.removeItem(ATTEMPTS_KEY);
};

const mapAuthError = (message: string | undefined): string => {
  if (!message) return "Ha ocurrido un error. Inténtalo de nuevo o pídele ayuda a Raquel.";
  const m = message.toLowerCase();
  if (m.includes("invalid login")) {
    return "Identificador o PIN incorrectos. Comprueba que has escrito bien el identificador (ej: i43777) y el PIN.";
  }
  if (m.includes("email not confirmed")) {
    return "Hay un problema con tu cuenta. Pídele a Raquel que la revise.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Demasiados intentos seguidos. Espera unos minutos.";
  }
  return "Ha ocurrido un error. Inténtalo de nuevo o pídele ayuda a Raquel.";
};

const Auth = () => {
  const navigate = useNavigate();
  const { bootstrapUser } = useAuth();

  const [view, setView] = useState<View>("login");
  const [identificador, setIdentificador] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Change pin
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const initialPinRef = useRef<string>("");

  // Lock
  const [lockedUntil, setLockedUntil] = useState<number | null>(checkLocked());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!lockedUntil) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= lockedUntil) {
        setLockedUntil(null);
        localStorage.removeItem(LOCK_KEY);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const remainingSeconds = useMemo(() => {
    if (!lockedUntil) return 0;
    return Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  }, [lockedUntil, now]);

  const goToDashboard = async () => {
    await bootstrapUser();
    navigate("/");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (lockedUntil) return;

    const ident = identificador.toLowerCase().trim();
    if (!ident || !pin) {
      setError("Escribe tu identificador y PIN.");
      return;
    }
    const email = `${ident}@transtubari.local`;
    initialPinRef.current = pin;

    setLoading(true);
    try {
      const { data, error: signErr } = await supabase.auth.signInWithPassword({ email, password: pin });
      if (signErr) {
        recordFailedAttempt();
        const lock = checkLocked();
        if (lock) setLockedUntil(lock);
        setError(mapAuthError(signErr.message));
        return;
      }

      recordSuccessfulLogin();

      const user = data.user;
      const force = (user?.user_metadata as any)?.force_password_change === true;
      if (force) {
        setView("change-pin");
        return;
      }
      await goToDashboard();
    } catch (err: any) {
      setError(mapAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!PIN_REGEX.test(newPin)) {
      setError("El PIN debe tener 1 letra mayúscula seguida de 6 dígitos. Ejemplo: M123456");
      return;
    }
    if (newPin !== newPin2) {
      setError("Los dos PINs no coinciden.");
      return;
    }
    if (newPin === initialPinRef.current) {
      setError("El PIN nuevo debe ser distinto al inicial.");
      return;
    }
    setLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({
        password: newPin,
        data: { force_password_change: false },
      });
      if (updErr) {
        const raw = updErr.message ?? "";
        const lower = raw.toLowerCase();
        if (lower.includes("password should be at least") || lower.includes("password is too short")) {
          setError("El PIN no cumple los requisitos del sistema. Inténtalo de nuevo o pídele a Raquel que te resetee.");
        } else if (lower.includes("pwned") || lower.includes("compromised") || lower.includes("leaked")) {
          setError("Este PIN aparece en listas de contraseñas filtradas. Elige otro distinto.");
        } else if (lower.includes("same") && lower.includes("password")) {
          setError("El PIN nuevo debe ser distinto al anterior.");
        } else if (raw) {
          setError(`No se ha podido guardar el PIN: ${raw}`);
        } else {
          setError("No se ha podido guardar el PIN. Inténtalo de nuevo o pídele a Raquel que te resetee.");
        }
        return;
      }
      await goToDashboard();
    } catch (err: any) {
      setError(mapAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const renderLogin = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identificador">Identificador</Label>
        <Input
          id="identificador"
          type="text"
          autoComplete="username"
          inputMode="text"
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value.toLowerCase().replace(/^\s+|\s+$/g, ""))}
          placeholder="ej: i43777"
          autoFocus
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pin">PIN</Label>
        <Input
          id="pin"
          type="password"
          autoComplete="current-password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={32}
          required
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {lockedUntil && (
        <Alert>
          <AlertDescription>
            Demasiados intentos. Espera {remainingSeconds} segundo{remainingSeconds === 1 ? "" : "s"}…
          </AlertDescription>
        </Alert>
      )}

      <Button type="submit" variant="premium" size="xl" className="w-full" disabled={loading || !!lockedUntil}>
        {loading ? "Entrando…" : (<><LogIn className="w-4 h-4" /> Entrar</>)}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        ¿Has olvidado tu PIN? Pídele a Raquel que te lo resetee.
      </p>
    </form>
  );

  const renderChangePin = () => (
    <form onSubmit={handleChangePin} className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Cambia tu PIN inicial</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Por seguridad, sustituye el PIN que te dieron por uno tuyo. Debe tener 1 letra mayúscula seguida de 6 dígitos. Ejemplo: M123456
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPin">PIN nuevo</Label>
        <Input id="newPin" type="password" autoComplete="new-password" value={newPin} onChange={(e) => setNewPin(e.target.value)} maxLength={7} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPin2">Repetir PIN nuevo</Label>
        <Input id="newPin2" type="password" autoComplete="new-password" value={newPin2} onChange={(e) => setNewPin2(e.target.value)} maxLength={7} required />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" variant="premium" size="xl" className="w-full" disabled={loading}>
        {loading ? "Guardando…" : (<><KeyRound className="w-4 h-4" /> Guardar y entrar</>)}
      </Button>
    </form>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <div className="panel-surface w-full p-6 md:p-8">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <img
              src={logoIcon}
              alt="Transtubari"
              className="h-20 w-20 object-contain drop-shadow-[var(--shadow-soft)]"
            />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">TRANSTUBARI</h1>
              <p className="mt-1 text-sm text-muted-foreground">Acceso al sistema</p>
            </div>
          </div>

          {view === "login" && renderLogin()}
          {view === "change-pin" && renderChangePin()}
        </div>
      </div>
    </div>
  );
};

export default Auth;
