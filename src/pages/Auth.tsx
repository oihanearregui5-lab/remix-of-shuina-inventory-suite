import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogIn, ShieldCheck, KeyRound, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

type View = "login" | "change-pin" | "enroll-mfa" | "verify-mfa";

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

  // MFA
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

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

  const checkRoleAndContinue = async (userId: string) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleSet = new Set((roles ?? []).map((r: any) => r.role));
    const isAdmin = roleSet.has("admin") || roleSet.has("secretary");

    if (!isAdmin) {
      await bootstrapUser();
      navigate("/");
      return;
    }

    const { data: factors, error: factorsErr } = await supabase.auth.mfa.listFactors();
    if (factorsErr) {
      setError(mapAuthError(factorsErr.message));
      return;
    }
    const verifiedTotp = factors?.totp?.find((f) => f.status === "verified");
    if (verifiedTotp) {
      setFactorId(verifiedTotp.id);
      setView("verify-mfa");
    } else {
      // Enroll new factor
      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (enrollErr) {
        setError(mapAuthError(enrollErr.message));
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setView("enroll-mfa");
    }
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
      if (user) await checkRoleAndContinue(user.id);
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
      const { data, error: updErr } = await supabase.auth.updateUser({
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
      if (data.user) await checkRoleAndContinue(data.user.id);
    } catch (err: any) {
      setError(mapAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!factorId) {
      setError("No se ha podido obtener el segundo factor. Vuelve a intentarlo.");
      return;
    }
    if (!/^\d{6}$/.test(mfaCode)) {
      setError("Introduce el código de 6 dígitos.");
      return;
    }
    setLoading(true);
    try {
      const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chalErr || !chal) {
        setError("No se ha podido generar el reto. Inténtalo de nuevo.");
        return;
      }
      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: chal.id,
        code: mfaCode,
      });
      if (verErr) {
        setError("Código incorrecto, prueba otra vez");
        return;
      }
      await bootstrapUser();
      navigate("/");
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

  const renderEnrollMfa = () => (
    <form onSubmit={handleVerifyMfa} className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Configura el segundo factor</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Como administrador, necesitas activar un segundo factor para entrar. Instala una app Authenticator en tu móvil (recomendamos Microsoft Authenticator, Google Authenticator o Authy) y escanea este código QR.
        </p>
      </div>
      {qrCode && (
        <div className="flex justify-center rounded-2xl border border-border bg-card p-4">
          <img src={qrCode} alt="Código QR del segundo factor" className="h-48 w-48" />
        </div>
      )}
      {secret && (
        <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Si no puedes escanear el QR, escribe este código en la app:</p>
          <code className="block break-all text-base font-semibold tracking-wider text-foreground">{secret}</code>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="mfa">Código de 6 dígitos</Label>
        <Input
          id="mfa"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
          required
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" variant="premium" size="xl" className="w-full" disabled={loading}>
        {loading ? "Verificando…" : (<><ShieldCheck className="w-4 h-4" /> Verificar</>)}
      </Button>
    </form>
  );

  const renderVerifyMfa = () => (
    <form onSubmit={handleVerifyMfa} className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Verifica tu identidad</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Introduce el código de 6 dígitos de tu app Authenticator
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mfa">Código</Label>
        <Input
          id="mfa"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
          autoFocus
          required
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" variant="premium" size="xl" className="w-full" disabled={loading}>
        {loading ? "Verificando…" : (<><ShieldCheck className="w-4 h-4" /> Verificar</>)}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        He perdido mi móvil — pídele a Raquel que te resetee el segundo factor.
      </p>
    </form>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <div className="panel-surface w-full p-6 md:p-8">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
              <Truck className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">TRANSTUBARI</h1>
              <p className="mt-1 text-sm text-muted-foreground">Acceso al sistema</p>
            </div>
          </div>

          {view === "login" && renderLogin()}
          {view === "change-pin" && renderChangePin()}
          {view === "enroll-mfa" && renderEnrollMfa()}
          {view === "verify-mfa" && renderVerifyMfa()}
        </div>
      </div>
    </div>
  );
};

export default Auth;
