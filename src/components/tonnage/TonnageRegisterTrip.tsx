import { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, Minus, Plus, Scale, Truck, User } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTonnage, type TonnageMaterial, type TripType } from "@/hooks/useTonnage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DriverOption {
  /** Identificador compuesto: "user:<uuid>" si tiene cuenta, "staff:<uuid>" si solo está en directorio */
  key: string;
  staff_id: string;
  user_id: string | null;
  full_name: string;
  role: "principal" | "ocasional" | null;
}

const WEIGHT_MIN = 27500;
const WEIGHT_MAX = 28900;
const WEIGHT_STEP = 20;
const WEIGHT_DEFAULT = 28500;

const materialLabel: Record<TonnageMaterial, string> = {
  arenas: "Arenas",
  tortas: "Tortas",
  sulfatos: "Sulfatos",
};

const TonnageRegisterTrip = () => {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const { trucks, zones, addTrip } = useTonnage(today);
  const db = supabase as any;

  const [truckId, setTruckId] = useState<string>("");
  const [driverKey, setDriverKey] = useState<string>("");
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [autoSelectedTruck, setAutoSelectedTruck] = useState(false);

  const [weightKg, setWeightKg] = useState<number>(WEIGHT_DEFAULT);
  const [tripTime, setTripTime] = useState<string>(() => format(new Date(), "HH:mm"));
  const [tripType, setTripType] = useState<TripType>("tolva");
  const [loadZoneId, setLoadZoneId] = useState<string>("");
  const [unloadZoneId, setUnloadZoneId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Cargar lista de camioneros desde el directorio de personal
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await db
        .from("staff_directory")
        .select("id, full_name, linked_user_id, truck_driver_role, is_truck_driver, active")
        .eq("is_truck_driver", true)
        .eq("active", true)
        .order("truck_driver_role", { ascending: true })
        .order("full_name", { ascending: true });
      if (cancelled) return;
      const list: DriverOption[] = ((data ?? []) as any[])
        .filter((d) => (d.full_name || "").trim().length > 0)
        .map((d) => ({
          key: d.linked_user_id ? `user:${d.linked_user_id}` : `staff:${d.id}`,
          staff_id: d.id,
          user_id: d.linked_user_id ?? null,
          full_name: d.full_name,
          role: d.truck_driver_role ?? null,
        }));
      setDrivers(list);
    })();
    return () => { cancelled = true; };
  }, [db]);

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.key === driverKey) ?? null,
    [drivers, driverKey],
  );

  // Conductor por defecto = usuario actual si está en la lista
  useEffect(() => {
    if (driverKey || !user?.id || drivers.length === 0) return;
    const me = drivers.find((d) => d.user_id === user.id);
    if (me) setDriverKey(me.key);
  }, [user?.id, driverKey, drivers]);

  // Camión por defecto = el asignado al conductor seleccionado (si existe)
  useEffect(() => {
    if (autoSelectedTruck || !selectedDriver?.user_id || trucks.length === 0) return;
    const myTruck = trucks.find((t) => t.default_driver_user_id === selectedDriver.user_id);
    if (myTruck) {
      setTruckId(myTruck.id);
      setAutoSelectedTruck(true);
    }
  }, [trucks, selectedDriver, autoSelectedTruck]);

  // Actualizar la hora cada minuto para mantenerla "automática" hasta que el usuario la edite
  const [autoTime, setAutoTime] = useState(true);
  useEffect(() => {
    if (!autoTime) return;
    const tick = () => setTripTime(format(new Date(), "HH:mm"));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [autoTime]);

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

  const adjustWeight = (delta: number) => {
    setWeightKg((w) => {
      const next = Math.round((w + delta) / WEIGHT_STEP) * WEIGHT_STEP;
      return Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, next));
    });
  };

  const reset = () => {
    setWeightKg(WEIGHT_DEFAULT);
    setAutoTime(true);
    setTripTime(format(new Date(), "HH:mm"));
    // Mantener camión, conductor y zonas para acelerar viajes consecutivos
  };

  const validationError = useMemo(() => {
    if (!truckId) return "Elige un camión";
    if (!driverKey) return "Indica el conductor";
    if (!weightKg || weightKg < WEIGHT_MIN || weightKg > WEIGHT_MAX) return `Peso entre ${WEIGHT_MIN} y ${WEIGHT_MAX} kg`;
    if (!tripTime) return "Indica la hora";
    if (!loadZoneId) return "Falta la zona de carga";
    if (!unloadZoneId) return "Falta la zona de descarga";
    return null;
  }, [truckId, driverKey, weightKg, tripTime, loadZoneId, unloadZoneId]);

  const handleSubmit = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    const ok = await addTrip({
      truck_id: truckId,
      trip_date: todayStr,
      trip_time: tripTime || null,
      weight_kg: weightKg,
      load_zone_id: loadZoneId || null,
      unload_zone_id: unloadZoneId || null,
      driver_user_id: selectedDriver?.user_id ?? null,
      driver_staff_id: selectedDriver?.staff_id ?? null,
      driver_name_snapshot: selectedDriver?.full_name ?? null,
      trip_type: tripType,
    });
    setSaving(false);
    if (ok) reset();
  };

  return (
    <div className="space-y-3">
      {/* Camión */}
      <section className="panel-surface p-4">
        <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Truck className="h-4 w-4 text-primary" /> Camión <span className="text-destructive">*</span>
        </Label>
        <Select value={truckId} onValueChange={setTruckId}>
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
          </SelectContent>
        </Select>
      </section>

      {/* Conductor */}
      <section className="panel-surface p-4">
        <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <User className="h-4 w-4 text-primary" /> Conductor <span className="text-destructive">*</span>
        </Label>
        <Select value={driverKey} onValueChange={(v) => { setDriverKey(v); setAutoSelectedTruck(false); }}>
          <SelectTrigger className="h-12 text-base"><SelectValue placeholder="¿Quién conduce?" /></SelectTrigger>
          <SelectContent className="z-[100]">
            {(["principal", "ocasional"] as const).map((role) => {
              const list = drivers.filter((d) => (d.role ?? "principal") === role);
              if (list.length === 0) return null;
              return (
                <div key={role}>
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {role === "principal" ? "Camioneros titulares" : "Camioneros ocasionales"}
                  </div>
                  {list.map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {d.full_name}{d.user_id && d.user_id === user?.id ? " (tú)" : ""}
                    </SelectItem>
                  ))}
                </div>
              );
            })}
          </SelectContent>
        </Select>
      </section>

      {/* Tipo viaje */}
      <section className="panel-surface p-4">
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

      {/* Peso (stepper 27500–28900 de 20 en 20) */}
      <section className="panel-surface p-4">
        <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Scale className="h-4 w-4 text-primary" /> Peso (kg) <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" className="h-14 w-14 flex-none text-xl font-bold"
            onClick={() => adjustWeight(-WEIGHT_STEP)} disabled={weightKg <= WEIGHT_MIN}>
            <Minus className="h-6 w-6" />
          </Button>
          <Input
            type="number"
            inputMode="numeric"
            min={WEIGHT_MIN}
            max={WEIGHT_MAX}
            step={WEIGHT_STEP}
            value={weightKg}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (isNaN(n)) return;
              setWeightKg(Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, n)));
            }}
            className="h-14 flex-1 text-center text-2xl font-bold [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
          />
          <Button type="button" variant="outline" className="h-14 w-14 flex-none text-xl font-bold"
            onClick={() => adjustWeight(WEIGHT_STEP)} disabled={weightKg >= WEIGHT_MAX}>
            <Plus className="h-6 w-6" />
          </Button>
        </div>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          Rango {WEIGHT_MIN.toLocaleString("es-ES")} – {WEIGHT_MAX.toLocaleString("es-ES")} kg · pasos de {WEIGHT_STEP} kg
        </p>
      </section>

      {/* Hora (automática) */}
      <section className="panel-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-primary" /> Hora <span className="text-destructive">*</span>
          </Label>
          {!autoTime && (
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs"
              onClick={() => { setAutoTime(true); setTripTime(format(new Date(), "HH:mm")); }}>
              Usar hora actual
            </Button>
          )}
        </div>
        <Input type="time" value={tripTime} onChange={(e) => { setAutoTime(false); setTripTime(e.target.value); }} className="h-12" />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {autoTime ? "Se rellena automáticamente con la hora actual." : "Editada manualmente."}
        </p>
      </section>

      {/* Zonas */}
      <section className="panel-surface p-4">
        <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-primary" /> Zonas <span className="text-destructive">*</span>
        </Label>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Carga *</span>
            <Select value={loadZoneId} onValueChange={setLoadZoneId}>
              <SelectTrigger className="h-11"><SelectValue placeholder="¿De dónde?" /></SelectTrigger>
              <SelectContent className="z-[100]">
                {loadZones.map((z) => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Descarga *</span>
            <Select value={unloadZoneId} onValueChange={setUnloadZoneId}>
              <SelectTrigger className="h-11"><SelectValue placeholder="¿Dónde?" /></SelectTrigger>
              <SelectContent className="z-[100]">
                {unloadZones.map((z) => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <Button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={saving || !!validationError}
        className="h-16 w-full text-base font-bold uppercase tracking-wide bg-success text-white hover:bg-success/90 md:text-lg"
      >
        <Plus className="h-5 w-5" />
        {saving ? "Guardando…" : "Registrar viaje"}
      </Button>

      {validationError && (
        <p className="text-center text-xs font-medium text-destructive">{validationError}</p>
      )}
    </div>
  );
};

export default TonnageRegisterTrip;
