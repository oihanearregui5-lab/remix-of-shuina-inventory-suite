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
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, Fuel, MessageSquareText, Wrench } from "lucide-react";
import { machineSeed } from "@/data/transtubari";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MachineDetailDialog, { type MachineDialogItem } from "@/components/machines/MachineDetailDialog";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const db = supabase as any;
  const [notes, setNotes] = useState<Record<string, Array<{ id: string; machine_id: string; note: string; is_highlight: boolean; created_at: string }>>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selectedMachine, setSelectedMachine] = useState<MachineDialogItem | null>(null);

  useEffect(() => {
    if (user) {
      void fetchNotes();
    }
  }, [user]);

  const fetchNotes = async () => {
    const { data, error } = await db
      .from("machine_notes")
      .select("id, machine_id, note, is_highlight, created_at")
      .order("created_at", { ascending: false })
      .limit(120);

    if (error) {
      toast.error("No se pudieron cargar las observaciones");
      return;
    }

    const grouped = (data ?? []).reduce((acc: Record<string, Array<{ id: string; machine_id: string; note: string; is_highlight: boolean; created_at: string }>>, item: any) => {
      if (!acc[item.machine_id]) acc[item.machine_id] = [];
      acc[item.machine_id].push(item);
      return acc;
    }, {});

    setNotes(grouped);
  };

  const [machineIdsByCode, setMachineIdsByCode] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      const { data } = await db.from("machine_assets").select("id, asset_code");
      const mapped = (data ?? []).reduce((acc: Record<string, string>, item: any) => {
        if (item.asset_code) acc[item.asset_code] = item.id;
        return acc;
      }, {});
      setMachineIdsByCode(mapped);
    })();
  }, []);

  const saveNote = async (assetCode: string) => {
    if (!user || !drafts[assetCode]?.trim()) return;

    const machineRecord = await db.from("machine_assets").select("id").eq("asset_code", assetCode).maybeSingle();
    if (machineRecord.error || !machineRecord.data?.id) {
      toast.error("No se encontró la máquina en la base de datos");
      return;
    }

    const { error } = await db.from("machine_notes").insert({
      machine_id: machineRecord.data.id,
      author_user_id: user.id,
      note: drafts[assetCode].trim(),
      is_highlight: drafts[assetCode].trim().length > 80,
    });

    if (error) {
      toast.error("No se pudo guardar la observación");
      return;
    }

    setDrafts((current) => ({ ...current, [assetCode]: "" }));
    toast.success("Observación guardada");
    await fetchNotes();
  };

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
          const machineNotes = notes[machineIdsByCode[machine.id]] ?? [];
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
                <button type="button" onClick={() => setSelectedMachine({
                  id: machine.id,
                  name: machine.name,
                  plate: machine.plate,
                  family: machine.family,
                  status: machine.status,
                  focus: machine.focus,
                  provider: machine.family.includes("Camión") ? "Proveedor de carretera" : "Proveedor de maquinaria",
                  nextInspection: machine.status === "inspection" ? "Esta semana" : "Próximo control mensual",
                  nextIvt: machine.plate === "Sin matrícula" ? "ITV interna según uso" : "Revisión documental pendiente según vencimiento",
                  fluids: ["Aceite motor", "Aceite hidráulico", "Anticongelante"],
                  notes: machineNotes,
                })} className="flex w-full items-start justify-between gap-3 text-left">
                  <div>
                    <h2 className="font-semibold text-foreground">{machine.name}</h2>
                    <p className="text-sm text-muted-foreground">{machine.plate} · {machine.family}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[machine.status]}`}>
                    {statusLabel[machine.status]}
                  </span>
                </button>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seguimiento clave</p>
                  <div className="flex flex-wrap gap-2">
                    {machine.focus.map((item) => (
                      <span key={item} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">{item}</span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-lg bg-muted p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><MessageSquareText className="h-4 w-4 text-primary" /> Observaciones e historial</div>
                  <Textarea
                    value={drafts[machine.id] ?? ""}
                    onChange={(e) => setDrafts((current) => ({ ...current, [machine.id]: e.target.value }))}
                    placeholder="Añadir observación, avería detectada, seguimiento o cambio reseñable"
                    className="min-h-20 bg-background"
                  />
                  <Button onClick={() => saveNote(machine.id)} className="w-full">Guardar observación</Button>
                  <div className="space-y-2">
                    {machineNotes.slice(0, 3).map((note) => (
                      <div key={note.id} className="rounded-md bg-background px-3 py-2 text-sm text-foreground">
                        <p>{note.note}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(note.created_at).toLocaleString("es-ES")}</p>
                      </div>
                    ))}
                    {machineNotes.length === 0 && <p className="text-sm text-muted-foreground">Sin observaciones todavía.</p>}
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
      <MachineDetailDialog open={Boolean(selectedMachine)} machine={selectedMachine} onOpenChange={(open) => !open && setSelectedMachine(null)} />
    </div>
  );
};

export default MachineFleetView;