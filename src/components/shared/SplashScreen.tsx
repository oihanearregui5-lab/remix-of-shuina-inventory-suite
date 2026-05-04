import logoHorizontal from "@/assets/logo-transtubari-horizontal.png";

interface SplashScreenProps {
  message?: string;
  hint?: string;
}

const SplashScreen = ({
  message = "Cargando…",
  hint = "Preparando tu espacio de trabajo de Transtubari.",
}: SplashScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <img
          src={logoHorizontal}
          alt="Transtubari"
          className="h-auto w-full max-w-xs object-contain animate-pulse"
        />
        <div className="mt-8 space-y-2">
          <p className="text-base font-semibold text-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
