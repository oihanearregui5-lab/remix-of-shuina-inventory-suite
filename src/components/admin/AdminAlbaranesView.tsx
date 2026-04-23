import { AlertTriangle, CheckCircle2, Clock3, FileSearch, ReceiptText, ScanSearch, Truck, UserRound } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";

const albaranKpis = [
  { label: "Pendientes de revisar", value: "14", detail: "8 entraron hoy", icon: Clock3 },
  { label: "Incidencias documentales", value: "5", detail: "faltan firma, sello o referencia", icon: AlertTriangle },
  { label: "Validados hoy", value: "21", detail: "ritmo estable de cierre", icon: CheckCircle2 },
  { label: "Rutas con albarán abierto", value: "7", detail: "requieren cierre operativo", icon: Truck },
];

const urgentQueue = [
  { id: "ALB-2403", route: "Bilbao → Miranda", customer: "Tubacex", issue: "Falta firma de recepción", age: "Hace 2 h", tone: "warning" },
  { id: "ALB-2398", route: "Vitoria → Pamplona", customer: "Sidenor", issue: "Peso no conciliado con el parte", age: "Hoy", tone: "destructive" },
  { id: "ALB-2394", route: "Llodio → Irun", customer: "ArcelorMittal", issue: "Sin matrícula vinculada", age: "Ayer", tone: "warning" },
  { id: "ALB-2389", route: "Burgos → Bilbao", customer: "Gestamp", issue: "Entrega cerrada sin PDF adjunto", age: "Ayer", tone: "destructive" },
];

const workflowColumns = [
  {
    title: "Entrada",
    hint: "Digitalización y registro inicial",
    items: ["Correo de clientes", "Carga desde móvil", "Referencia de ruta"],
  },
  {
    title: "Verificación",
    hint: "Cruce con parte, máquina y jornada",
    items: ["Chofer asignado", "Matrícula y ruta", "Firma / sello"],
  },
  {
    title: "Resolución",
    hint: "Corrección y confirmación administrativa",
    items: ["Reclamación al cliente", "Ajuste interno", "Cierre contable"],
  },
];

const recentDocuments = [
  { id: "ALB-2407", customer: "Tubos Reunidos", operator: "Juan", status: "Validado", statusTone: "success", summary: "Entrega completa con firma y sello.", updatedAt: "Hoy · 12:42" },
  { id: "ALB-2406", customer: "Sidenor", operator: "Andriy", status: "En revisión", statusTone: "warning", summary: "Pendiente de cotejar referencia de carga con parte de trabajo.", updatedAt: "Hoy · 11:18" },
  { id: "ALB-2405", customer: "Tubacex", operator: "Raquel", status: "Incidencia", statusTone: "destructive", summary: "Se detecta diferencia entre recepción y kilos declarados.", updatedAt: "Hoy · 10:05" },
  { id: "ALB-2404", customer: "Gestamp", operator: "Manuel", status: "Archivado", statusTone: "info", summary: "Documentación cerrada y preparada para exportación.", updatedAt: "Ayer · 18:27" },
];

const statusToneClass = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-foreground",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
} as const;

const AdminAlbaranesView = () => {
  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="Administración"
        title="Albaranes"
        description="Centro documental para revisar entradas, detectar incidencias y priorizar cierres administrativos sin perder el pulso operativo del día."
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {albaranKpis.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="panel-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
                <div className="rounded-lg bg-muted p-2 text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <article className="panel-surface p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ReceiptText className="h-4 w-4 text-primary" /> Cola prioritaria
          </div>
          <div className="mt-4 space-y-3">
            {urgentQueue.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{item.id}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${item.tone === "destructive" ? statusToneClass.destructive : statusToneClass.warning}`}>
                        {item.issue}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{item.route}</p>
                    <p className="text-sm text-muted-foreground">{item.customer}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.age}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="panel-surface p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ScanSearch className="h-4 w-4 text-primary" /> Circuito documental
          </div>
          <div className="mt-4 space-y-3">
            {workflowColumns.map((column) => (
              <div key={column.title} className="rounded-lg border border-border bg-background p-4">
                <p className="font-medium text-foreground">{column.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{column.hint}</p>
                <ul className="mt-3 space-y-2 text-sm text-foreground">
                  {column.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <article className="panel-surface p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileSearch className="h-4 w-4 text-primary" /> Últimos movimientos
          </div>
          <div className="mt-4 space-y-3">
            {recentDocuments.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{item.id}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusToneClass[item.statusTone as keyof typeof statusToneClass]}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{item.customer}</p>
                    <p className="text-sm text-muted-foreground">{item.summary}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{item.updatedAt}</p>
                    <p className="mt-1 inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" /> {item.operator}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="panel-surface p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-warning" /> Señales del día
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg bg-muted p-4 text-foreground">
              <p className="font-medium">3 albaranes siguen abiertos pese a tener parte finalizado.</p>
              <p className="mt-1 text-muted-foreground">Conviene cerrar trazabilidad antes del corte administrativo.</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-foreground">
              <p className="font-medium">2 entregas requieren reclamación al cliente.</p>
              <p className="mt-1 text-muted-foreground">La incidencia se repite en rutas de tarde y afecta al cierre diario.</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-foreground">
              <p className="font-medium">La franja 09:00–11:00 concentra la mayoría de entradas.</p>
              <p className="mt-1 text-muted-foreground">Buen momento para reforzar validación temprana y evitar cuello de botella.</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default AdminAlbaranesView;
