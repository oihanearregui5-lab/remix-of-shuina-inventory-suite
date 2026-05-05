import { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, Plus, PlusCircle, Scale, Truck, User } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUIMode } from "@/hooks/useUIMode";
import { useTonnage, type TonnageMaterial, type TripType } from "@/hooks/useTonnage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DriverOption {
  user_id: string;
  full_name: string;
}

interface Props {
  onClose: () => void;
}

const NEW_TRUCK_VALUE = "__create_new_truck__";

const materialLabel: Record<TonnageMaterial, string> = {
  arenas: "Arenas",
  tortas: "Tortas",
  sulfatos: "Sulfatos",
};

const materialTone: Record<TonnageMaterial, string> = {
  arenas: "bg-warning/20 text-foreground",
  tortas: "bg-primary/15 text-primary",
  sulfatos: "bg-success/15 text-success",
};

const TonnageQuickTripDialog = ({ onClose }: Props) => {
  const { isSimple } = useUIMode();
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const { trucks, zones, addTrip, reload } = useTonnage(today);
  const db = supabase as any;

  const [truckId, setTruckId] = useState<string>("");
  const [driverUserId, setDriverUserId] = useState<string>("");
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [newTruckOpen, setNewTruckOpen] = useState(false);
  const [newTruckForm, setNewTruckForm] = useState<{ truck_number: string; label: string; material: TonnageMaterial }>({
    truck_number: "",
    label: "",
    material: "arenas",
  });
  const [creatingTruck, setCreatingTruck] = useState(false);

  const [weightKg, setWeightKg] = useState<string>("");
  const [tripTime, setTripTime] = useState<string>(() => format(new Date(), "HH:mm"));
  const [tripType, setTripType] = useState<TripType>("tolva");
  const [loadZoneId, setLoadZoneId] = useState<string>("");
  const [unloadZoneId, setUnloadZoneId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await db
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name", { ascending: true });
      if (cancelled) return;
      const list = ((data ?? []) as DriverOption[]).filter((d) => (d.full_name || "").trim().length > 0);
      setDrivers(list);
    })();
    return () => { cancelled = true; };
  }, [db]);

  useEffect(() => {
    if (user?.id && !driverUserId) setDriverUserId(user.id);
  }, [user?.id, driverUserId]);

  const handleTruckChange = (value: string) => {
    if (value === NEW_TRUCK_VALUE) { setNewTruckOpen(true); return; }
    setTruckId(value);
  };

  const createNewTruck = async () => {
    const num = parseInt(newTruckForm.truck_number, 10);
    if (!newTruckForm.label.trim() || isNaN(num)) {
      toast.error("Indica número y nombre del camión");
      return;
    }
    setCreatingTruck(true);
    const { data, error } = await db
      .from("tonnage_trucks")
      .insert({ truck_number: num, label: newTruckForm.label.trim(), material: newTruckForm.material, sort_order: num })
      .select("id")
      .single();
    setCreatingTruck(false);
    if (error || !data) { toast.error("No se pudo crear el camión"); return; }
    toast.success("Camión creado");
    await reload();
    setTruckId(data.id);
    setNewTruckOpen(false);
    setNewTruckForm({ truck_number: "", label: "", material: "arenas" });
  };

  const selectedTruck = trucks.find((t) => t.id === truckId);
  const todayStr = format(today, "yyyy-MM-dd");

  const loadZones = useMemo(
    () => zones.filter((z) => z.zone_type === "carga" || z.zone_type === "ambas"),
    [zones],
  );
  const unloadZones = useMemo(
    () => zones.filter((z) => z.zone_type === "descarga" || z.zone_type === "ambas"),
    [zones],
  );

  const trucksByMaterial = useMemo(() => {
    const result: Record<TonnageMaterial, typeof trucks> = { arenas: [], tortas: [], sulfatos: [] };
    trucks.forEach((t) => result[t.material].push(t));
    return result;
  }, [trucks]);

  const handleSubmit = async () => {
    if (!truckId) { toast.error("Elige un camión"); return; }
    const kg = parseFloat(weightKg.replace(",", "."));
    if (isNaN(kg) || kg <= 0) { toast.error("Indica un peso válido en kg"); return; }
    setSaving(true);
    const ok = await addTrip({
      truck_id: truckId,
      trip_date: todayStr,
      trip_time: tripTime || null,
      weight_kg: kg,
      load_zone_id: loadZoneId || null,
      unload_zone_id: unloadZoneId || null,
      driver_user_id: driverUserId || null,
      trip_type: tripType,
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="space-y-3 pt-1">
      {/* Camión */}
      <section className="panel-surface p-3">
        <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Truck className="h-4 w-4 text-primary" /> Camión
        </Label>
        <Select value={truckId} onValueChange={handleTruckChange}>
          <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Elige el camión" /></SelectTrigger>
          <SelectContent className="z-[100]">
            {(["arenas", "tortas", "sulfatos"] as TonnageMaterial[]).map((mat) =>
              trucksByMaterial[mat].length > 0 ? (
                <div key={mat}>
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {materialLabel[mat]}
                  </div>
                  {trucksByMaterial[mat].map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="font-medium">#{t.truck_number}</span> · {t.label}
                    </SelectItem>
                  ))}
                </div>
              ) : null,
            )}
            <div className="my-1 border-t border-border" />
            <SelectItem value={NEW_TRUCK_VALUE} className="font-semibold text-primary">
              <span className="inline-flex items-center gap-2">
                <PlusCircle className="h-4 w-4" /> Crear nuevo camión…
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        {selectedTruck && (
          <p className="mt-2 text-xs text-muted-foreground">
            Material principal:{" "}
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", materialTone[selectedTruck.material])}>
              {materialLabel[selectedTruck.material]}
            </span>
          </p>
        )}

        <Dialog open={newTruckOpen} onOpenChange={setNewTruckOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nuevo camión</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <Input type="number" placeholder="Nº" value={newTruckForm.truck_number} onChange={(e) => setNewTruckForm((f) => ({ ...f, truck_number: e.target.value }))} />
                <Input placeholder="Nombre del camión" value={newTruckForm.label} onChange={(e) => setNewTruckForm((f) => ({ ...f, label: e.target.value }))} />
              </div>
              <Select value={newTruckForm.material} onValueChange={(v: TonnageMaterial) => setNewTruckForm((f) => ({ ...f, material: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="arenas">Arenas (material principal)</SelectItem>
                  <SelectItem value="tortas">Tortas (material principal)</SelectItem>
                  <SelectItem value="sulfatos">Sulfatos (material principal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewTruckOpen(false)}>Cancelar</Button>
              <Button onClick={() => void createNewTruck()} disabled={creatingTruck}>
                {creatingTruck ? "Creando…" : "Crear y seleccionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* Conductor */}
      <section className="panel-surface p-3">
        <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <User className="h-4 w-4 text-primary" /> Conductor
        </Label>
        <Select value={driverUserId} onValueChange={setDriverUserId}>
          <SelectTrigger className="h-12 text-base"><SelectValue placeholder="¿Quién conduce?" /></SelectTrigger>
          <SelectContent className="z-[100]">
            {drivers.map((d) => (
              <SelectItem key={d.user_id} value={d.user_id}>
                {d.full_name}{d.user_id === user?.id ? " (tú)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {/* Tipo viaje */}
      <section className="panel-surface p-3">
        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tipo de viaje
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={tripType === "acopio" ? "default" : "outline"}
            className={cn("h-12 text-base font-bold", tripType === "acopio" && "bg-warning text-warning-foreground hover:bg-warning/90")}
            onClick={() => setTripType("acopio")}>ACOPIO</Button>
          <Button type="button" variant={tripType === "tolva" ? "default" : "outline"}
            className={cn("h-12 text-base font-bold", tripType === "tolva" && "bg-success text-white hover:bg-success/90")}
            onClick={() => setTripType("tolva")}>TOLVA</Button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Solo los viajes de TOLVA son facturables.</p>
      </section>

      {/* Peso + hora */}
      <section className="panel-surface p-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Scale className="h-4 w-4 text-primary" /> Peso (kg)
            </Label>
            <Input type="number" inputMode="decimal" step="10" min="0" placeholder="28500"
              value={weightKg} onChange={(e) => setWeightKg(e.target.value)}
              className="h-12 text-lg font-semibold" />
          </div>
          {!isSimple && (
            <div>
              <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-primary" /> Hora
              </Label>
              <Input type="time" value={tripTime} onChange={(e) => setTripTime(e.target.value)} className="h-12" />
            </div>
          )}
        </div>
      </section>

      {/* Zonas */}
      <section className="panel-surface p-3">
        <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-primary" /> Zonas
        </Label>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Carga</span>
            <Select value={loadZoneId} onValueChange={setLoadZoneId}>
              <SelectTrigger className="h-11"><SelectValue placeholder="¿De dónde?" /></SelectTrigger>
              <SelectContent className="z-[100]">
                {loadZones.map((z) => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Descarga</span>
            <Select value={unloadZoneId} onValueChange={setUnloadZoneId}>
              <SelectTrigger className="h-11"><SelectValue placeholder="¿Dónde?" /></SelectTrigger>
              <SelectContent className="z-[100]">
                {unloadZones.map((z) => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button type="button" onClick={() => void handleSubmit()} disabled={!truckId || !weightKg || saving}
          className="flex-1 bg-success text-white hover:bg-success/90 font-bold">
          <Plus className="h-5 w-5" />
          {saving ? "Guardando…" : "Registrar"}
        </Button>
      </div>
    </div>
  );
};

export default TonnageQuickTripDialog;
