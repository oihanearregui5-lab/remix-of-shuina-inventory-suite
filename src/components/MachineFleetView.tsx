import baneraTisvol from "@/assets/banera-tisvol-r6823bdp.jpg";
import camionicoNissan from "@/assets/camionico-nissan-3971bkd.jpg";
import komatsuImage from "@/assets/komatsu.jpg";
import liebherr900 from "@/assets/liebherr-900.jpg";
import palaVolvo220 from "@/assets/pala-volvo-vieja-220.jpg";
import retroHitachi from "@/assets/retro-hitachi.jpg";
import scaniaAzul from "@/assets/scania-azul-3930jjd.jpg";
import volvo150 from "@/assets/volvo-nueva-150.jpg";
import wirtgen2100 from "@/assets/wirtgen-2100.jpg";
import wirtgen2200Sm from "@/assets/wirtgen-2200-sm.jpg";
import { AlertTriangle, Download, Fuel, Wrench } from "lucide-react";
import { machineSeed } from "@/data/transtubari";
import { Button } from "@/components/ui/button";

const machineImages: Record<string, string> = {
  "banera-tisvol-r6823bdp": baneraTisvol,
  "camionico-nissan-3971bkd": camionicoNissan,
  komatsu: komatsuImage,
  "liebherr-900": liebherr900,
  "pala-volvo-vieja-220": palaVolvo220,
  "retro-hitachi": retroHitachi,
  "scania-azul-3930jjd": scaniaAzul,
  "volvo-nueva-150": volvo150,
  "wirtgen-2100": wirtgen2100,
  "wirtgen-2200-sm": wirtgen2200Sm,
};

const statusLabel = {
  active: "Operativa",
  maintenance: "Mantenimiento",
  repair: "Avería",
  inspection: "Inspección",
};

const statusTone = {
  active: "bg-success/10 text-success",
  maintenance: "bg-warning/15 text-foreground",
  repair: "bg-destructive/10 text-destructive",
  inspection: "bg-info/10 text-info",
};

const MachineFleetView = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Máquinas y vehículos</h1>
        <p className="text-muted-foreground">Seguimiento de flota, mantenimiento, averías a corto/medio/largo plazo, ITV y consumibles críticos.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><Wrench className="h-4 w-4 text-primary" /> Total unidades</div>
          <p className="text-3xl font-bold text-foreground">{machineSeed.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4 text-warning" /> En seguimiento</div>
          <p className="text-3xl font-bold text-foreground">{machineSeed.filter((machine) => machine.status !== "active").length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><Fuel className="h-4 w-4 text-secondary" /> Revisiones clave</div>
          <p className="text-sm font-medium text-foreground">Aceite hidráulico · aceite motor · anticongelante · ITV</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {machineSeed.map((machine) => {
          const imageSrc = machine.image ? machineImages[machine.image] : null;
          return (
            <article key={machine.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <div className="aspect-[4/3] bg-muted">
                {imageSrc ? (
                  <img src={imageSrc} alt={machine.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                    Imagen pendiente para {machine.name}
                  </div>
                )}
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-foreground">{machine.name}</h2>
                    <p className="text-sm text-muted-foreground">{machine.plate} · {machine.family}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[machine.status]}`}>
                    {statusLabel[machine.status]}
                  </span>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seguimiento clave</p>
                  <div className="flex flex-wrap gap-2">
                    {machine.focus.map((item) => (
                      <span key={item} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">{item}</span>
                    ))}
                  </div>
                </div>

                {imageSrc && (
                  <Button asChild variant="outline" className="w-full">
                    <a href={imageSrc} download={`${machine.name}.jpg`}>
                      <Download className="mr-2 h-4 w-4" /> Descargar imagen
                    </a>
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default MachineFleetView;