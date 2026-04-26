import { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, Minus, Package, Plus, Scale, Truck, PlusCircle, User } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUIMode } from "@/hooks/useUIMode";
import { useTonnage, formatKg, type TonnageMaterial } from "@/hooks/useTonnage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DriverOption {
  user_id: string;
  full_name: string;
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

// Mini stepper +/- para las cantidades de material
interface QtyStepperProps {
  label: string;
  value: number;
  color: string;
  onChange: (next: number) => void;
}

const QtyStepper = ({ label, value, color, onChange }: QtyStepperProps) => {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", color)}>
          {label}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          min="0"
          step="1"
          value={value === 0 ? "" : value}
          placeholder="0"
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(isNaN(n) || n < 0 ? 0 : n);
          }}
          className="h-9 flex-1 text-center text-lg font-semibold [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9"
          onClick={() => onChange(value + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const TonnageRegisterTrip = () => {
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

  // Cargar lista de conductores (todos los perfiles)
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
    return () => {
      cancelled = true;
    };
  }, [db]);

  // Por defecto, conductor = usuario actual
  useEffect(() => {
    if (user?.id && !driverUserId) setDriverUserId(user.id);
  }, [user?.id, driverUserId]);

  const handleTruckChange = (value: string) => {
    if (value === NEW_TRUCK_VALUE) {
      setNewTruckOpen(true);
      return;
    }
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
      .insert({
        truck_number: num,
        label: newTruckForm.label.trim(),
        material: newTruckForm.material,
        sort_order: num,
      })
      .select("id")
      .single();
    setCreatingTruck(false);
    if (error || !data) {
      toast.error("No se pudo crear el camión");
      return;
    }
    toast.success("Camión creado");
    await reload();
    setTruckId(data.id);
    setNewTruckOpen(false);
    setNewTruckForm({ truck_number: "", label: "", material: "arenas" });
  };
  const [weightKg, setWeightKg] = useState<string>("");
  const [tripTime, setTripTime] = useState<string>(() => format(new Date(), "HH:mm"));

  // Cantidades de material en este viaje
  const [qtyTortas, setQtyTortas] = useState(0);
  const [qtyArenasA, setQtyArenasA] = useState(0);
  const [qtyArenasB, setQtyArenasB] = useState(0);
  const [qtySulfatos, setQtySulfatos] = useState(0);

  // Zonas
  const [loadZoneId, setLoadZoneId] = useState<string>("");
  const [unloadZoneId, setUnloadZoneId] = useState<string>("");

  const [saving, setSaving] = useState(false);

  const selectedTruck = trucks.find((t) => t.id === truckId);
  const todayStr = format(today, "yyyy-MM-dd");

  // Zonas filtradas por tipo
  const loadZones = useMemo(
    () => zones.filter((z) => z.zone_type === "carga" || z.zone_type === "ambas"),
    [zones],
  );
  const unloadZones = useMemo(
    () => zones.filter((z) => z.zone_type === "descarga" || z.zone_type === "ambas"),
    [zones],
  );

  const totalMaterials = qtyTortas + qtyArenasA + qtyArenasB + qtySulfatos;

  const trucksByMaterial = useMemo(() => {
    const result: Record<TonnageMaterial, typeof trucks> = { arenas: [], tortas: [], sulfatos: [] };
    trucks.forEach((t) => result[t.material].push(t));
    return result;
  }, [trucks]);

  const reset = () => {
    setWeightKg("");
    setTripTime(format(new Date(), "HH:mm"));
    setQtyTortas(0);
    setQtyArenasA(0);
    setQtyArenasB(0);
    setQtySulfatos(0);
    // Camión y zonas se mantienen para acelerar viajes consecutivos
  };

  const handleSubmit = async () => {
    if (!truckId) {
      toast.error("Elige un camión");
      return;
    }
    const kg = parseFloat(weightKg.replace(",", "."));
    if (isNaN(kg) || kg <= 0) {
      toast.error("Indica un peso válido en kg");
      return;
    }
    setSaving(true);
    const ok = await addTrip({
      truck_id: truckId,
      trip_date: todayStr,
      trip_time: tripTime || null,
      weight_kg: kg,
      qty_tortas: qtyTortas,
      qty_arenas_a: qtyArenasA,
      qty_arenas_b: qtyArenasB,
      qty_sulfatos: qtySulfatos,
      load_zone_id: loadZoneId || null,
      unload_zone_id: unloadZoneId || null,
      driver_user_id: driverUserId || null,
    });
    setSaving(false);
    if (ok) reset();
  };

  return (
    <div className="space-y-3">
      {/* Camión */}
      <section className="panel-surface p-4">
        <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Truck className="h-4 w-4 text-primary" /> Camión
        </Label>
        <Select value={truckId} onValueChange={handleTruckChange}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder="Elige el camión" />
          </SelectTrigger>
          <SelectContent>
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

        <Dialog open={newTruckOpen} onOpenChange={setNewTruckOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo camión</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <Input
                  type="number"
                  placeholder="Nº"
                  value={newTruckForm.truck_number}
                  onChange={(e) => setNewTruckForm((f) => ({ ...f, truck_number: e.target.value }))}
                />
                <Input
                  placeholder="Nombre del camión"
                  value={newTruckForm.label}
                  onChange={(e) => setNewTruckForm((f) => ({ ...f, label: e.target.value }))}
                />
              </div>
              <Select
                value={newTruckForm.material}
                onValueChange={(v: TonnageMaterial) => setNewTruckForm((f) => ({ ...f, material: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
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
        {selectedTruck && (
          <p className="mt-2 text-xs text-muted-foreground">
            Material principal del camión:{" "}
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", materialTone[selectedTruck.material])}>
              {materialLabel[selectedTruck.material]}
            </span>
          </p>
        )}
      </section>

      {/* Conductor */}
      <section className="panel-surface p-4">
        <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <User className="h-4 w-4 text-primary" /> Conductor
        </Label>
        <Select value={driverUserId} onValueChange={setDriverUserId}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder="¿Quién conduce?" />
          </SelectTrigger>
          <SelectContent>
            {drivers.map((d) => (
              <SelectItem key={d.user_id} value={d.user_id}>
                {d.full_name}
                {d.user_id === user?.id ? " (tú)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Por defecto eres tú. Cámbialo si registras un viaje de un compañero.
        </p>
      </section>

      {/* Peso + hora */}
      <section className="panel-surface p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Scale className="h-4 w-4 text-primary" /> Peso (kg)
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              step="10"
              min="0"
              placeholder="28500"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="h-12 text-lg font-semibold"
            />
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

      {/* Cantidades por material */}
      <section className="panel-surface p-4">
        <Label className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Package className="h-4 w-4 text-primary" /> Materiales del viaje
          {totalMaterials > 0 && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">{totalMaterials} unidades</span>
          )}
        </Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <QtyStepper label="Tortas" value={qtyTortas} color="bg-primary/15 text-primary" onChange={setQtyTortas} />
          <QtyStepper label="Arenas A" value={qtyArenasA} color="bg-warning/20 text-foreground" onChange={setQtyArenasA} />
          <QtyStepper label="Arenas B" value={qtyArenasB} color="bg-warning/30 text-foreground" onChange={setQtyArenasB} />
          <QtyStepper label="Sulfatos" value={qtySulfatos} color="bg-success/15 text-success" onChange={setQtySulfatos} />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Si el viaje lleva un solo tipo, déjalo en 1 y los demás en 0. Si lleva varios, indica las cantidades.
        </p>
      </section>

      {/* Zonas carga/descarga */}
      <section className="panel-surface p-4">
        <Label className="mb-3 flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-primary" /> Zonas
        </Label>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Carga</span>
            <Select value={loadZoneId} onValueChange={setLoadZoneId}>
              <SelectTrigger className="h-11"><SelectValue placeholder="¿De dónde se carga?" /></SelectTrigger>
              <SelectContent>
                {loadZones.map((z) => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Descarga</span>
            <Select value={unloadZoneId} onValueChange={setUnloadZoneId}>
              <SelectTrigger className="h-11"><SelectValue placeholder="¿Dónde se descarga?" /></SelectTrigger>
              <SelectContent>
                {unloadZones.map((z) => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Botón de guardar */}
      <Button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!truckId || !weightKg || saving}
        className="h-16 w-full text-base font-bold uppercase tracking-wide bg-success text-white hover:bg-success/90 md:text-lg"
      >
        <Plus className="h-5 w-5" />
        {saving ? "Guardando…" : "Registrar viaje"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Tras guardar, el camión y las zonas se mantienen seleccionados para registrar el siguiente viaje rápido.
      </p>
    </div>
  );
};

export default TonnageRegisterTrip;
