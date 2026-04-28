import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Clock, MapPin, Scale, Truck, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTonnage, type TripType } from "@/hooks/useTonnage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DriverOption {
  id: string;
  name: string;
  role: "principal" | "ocasional" | "otros";
  linked_user_id: string | null;
}

interface Props {
  onClose: () => void;
}

const WEIGHT_MIN = 27500;
const WEIGHT_MAX = 28900;
const WEIGHT_STEP = 20;
const WEIGHT_DEFAULT = 28500;

const TonnageQuickTripDialog = ({ onClose }: Props) => {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const { trucks, zones, addTrip } = useTonnage(today);
  const db = supabase as any;

  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [driverId, setDriverId] = useState<string>("");
  const [truckId, setTruckId] = useState<string>("");
  const [weight, setWeight] = useState<number>(WEIGHT_DEFAULT);
  const [tripDateTime, setTripDateTime] = useState<string>(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [tripType, setTripType] = useState<TripType | "">("");
  const [loadZoneId, setLoadZoneId] = useState<string>("");
  const [unloadZoneId, setUnloadZoneId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await db
        .from("staff_directory")
        .select("id, full_name, truck_driver_role, is_truck_driver, linked_user_id, active")
        .eq("active", true);
      if (cancelled) return;
      const list: DriverOption[] = ((data ?? []) as any[]).map((s) => ({
        id: s.id,
        name: s.full_name,
        role: s.is_truck_driver
          ? (s.truck_driver_role === "principal" ? "principal" : "ocasional")
          : "otros",
        linked_user_id: s.linked_user_id,
      }));
      const drivers = list.filter((d) => d.role !== "otros");
      drivers.sort((a, b) => {
        if (a.role !== b.role) return a.role === "principal" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setDrivers(drivers);

      // Preseleccionar conductor si el user actual está vinculado a un staff camionero
      const me = drivers.find((d) => d.linked_user_id === user?.id);
      if (me) setDriverId(me.id);
    })();
    return () => { cancelled = true; };
  }, [db, user?.id]);

  const loadZones = useMemo(
    () => zones.filter((z) => z.zone_type === "carga" || z.zone_type === "ambas"),
    [zones],
  );
  const unloadZones = useMemo(
    () => zones.filter((z) => z.zone_type === "descarga" || z.zone_type === "ambas"),
    [zones],
  );

  const principal = drivers.filter((d) => d.role === "principal");
  const ocasional = drivers.filter((d) => d.role === "ocasional");

  const submit = async () => {
    if (!driverId) return toast.error("Elige un conductor");
    if (!truckId) return toast.error("Elige un camión");
    if (!tripType) return toast.error("Marca ACOPIO o TOLVA");

    const driver = drivers.find((d) => d.id === driverId);
    const dt = new Date(tripDateTime);
    const tripDate = format(dt, "yyyy-MM-dd");
    const tripTime = format(dt, "HH:mm:ss");

    setSaving(true);
    const ok = await addTrip({
      truck_id: truckId,
      trip_date: tripDate,
      trip_time: tripTime,
      weight_kg: weight,
      load_zone_id: loadZoneId || null,
      unload_zone_id: unloadZoneId || null,
      driver_user_id: driver?.linked_user_id ?? user?.id ?? null,
      trip_type: tripType as TripType,
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Conductor */}
      <div>
        <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <User className="h-3.5 w-3.5" /> Conductor
        </Label>
        <Select value={driverId} onValueChange={setDriverId}>
          <SelectTrigger className="h-11"><SelectValue placeholder="¿Quién conduce?" /></SelectTrigger>
          <SelectContent>
            {principal.length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Principales</div>
                {principal.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </>
            )}
            {ocasional.length > 0 && (
              <>
                <div className="mt-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ocasionales</div>
                {ocasional.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Camión */}
      <div>
        <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Truck className="h-3.5 w-3.5" /> Camión
        </Label>
        <Select value={truckId} onValueChange={setTruckId}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Matrícula" /></SelectTrigger>
          <SelectContent>
            {trucks.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tipo de viaje */}
      <div>
        <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tipo de viaje
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={tripType === "acopio" ? "default" : "outline"}
            className={cn("h-14 text-base font-bold", tripType === "acopio" && "bg-warning text-warning-foreground hover:bg-warning/90")}
            onClick={() => setTripType("acopio")}
          >
            ACOPIO
          </Button>
          <Button
            type="button"
            variant={tripType === "tolva" ? "default" : "outline"}
            className={cn("h-14 text-base font-bold", tripType === "tolva" && "bg-success text-white hover:bg-success/90")}
            onClick={() => setTripType("tolva")}
          >
            TOLVA
          </Button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Solo los viajes de TOLVA son facturables.</p>
      </div>

      {/* Peso */}
      <div>
        <Label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Scale className="h-3.5 w-3.5" /> Peso · {weight.toLocaleString("es-ES")} kg
        </Label>
        <Slider
          value={[weight]}
          min={WEIGHT_MIN}
          max={WEIGHT_MAX}
          step={WEIGHT_STEP}
          onValueChange={(v) => setWeight(v[0])}
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{WEIGHT_MIN.toLocaleString("es-ES")}</span>
          <span>{WEIGHT_MAX.toLocaleString("es-ES")}</span>
        </div>
      </div>

      {/* Fecha y hora */}
      <div>
        <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> Fecha y hora
        </Label>
        <Input
          type="datetime-local"
          value={tripDateTime}
          onChange={(e) => setTripDateTime(e.target.value)}
          className="h-11"
        />
      </div>

      {/* Zonas */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Carga
          </Label>
          <Select value={loadZoneId} onValueChange={setLoadZoneId}>
            <SelectTrigger className="h-11"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {loadZones.map((z) => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Descarga
          </Label>
          <Select value={unloadZoneId} onValueChange={setUnloadZoneId}>
            <SelectTrigger className="h-11"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {unloadZones.map((z) => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button onClick={() => void submit()} disabled={saving} className="flex-1 bg-success text-white hover:bg-success/90">
          {saving ? "Guardando…" : "Registrar"}
        </Button>
      </div>
    </div>
  );
};

export default TonnageQuickTripDialog;
