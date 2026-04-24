/**
 * Fallback visual mostrado mientras se carga un módulo lazy.
 * Usa un esqueleto con shimmer en lugar de texto plano para
 * que la transición se sienta inmediata.
 */
const SectionFallback = () => {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="space-y-4"
    >
      <div className="panel-surface px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted/70" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="panel-surface px-5 py-6">
            <div className="space-y-3">
              <div className="h-3 w-1/4 animate-pulse rounded bg-muted/70" />
              <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted/60" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando módulo…</span>
    </section>
  );
};

export default SectionFallback;
