import { useEffect, useMemo, useState } from "react";
import { MapPin, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTonnage, type TonnageMaterial, type ZoneType } from "@/hooks/useTonnage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const materialLabel: Record<TonnageMaterial, string> = {
  arenas: "Arenas",
  tortas: "Tortas",
  sulfatos: "Sulfatos",
};

const materialBg: Record<TonnageMaterial, string> = {
  arenas: "bg-warning/15",
  tortas: "bg-primary/10",
  sulfatos: "bg-success/15",
};

const zoneTypeLabel: Record<ZoneType, string> = {
  carga: "Carga",
  descarga: "Descarga",
  ambas: "Ambas",
};

const TonnageTrucksManager = () => {
  const { trucks, zones, reload } = useTonnage(new Date());
  const db = supabase as any;

  // Conductores disponibles para asignar
  const [drivers, setDrivers] = useState<Array<{ user_id: string; full_name: string }>>([]);
  useEffect(() => {
    (async () => {
      const { data } = await db.from("profiles").select("user_id, full_name").order("full_name");
      setDrivers(((data ?? []) as Array<{ user_id: string; full_name: string }>).filter((d) => (d.full_name || "").trim()));
    })();
  }, [db]);

  // ============ CAMIONES ============
  const [truckForm, setTruckForm] = useState<{ truck_number: string; label: string; material: TonnageMaterial; default_driver_user_id: string }>({
    truck_number: "",
    label: "",
    material: "arenas",
    default_driver_user_id: "",
  });
  const [editingTruckId, setEditingTruckId] = useState<string | null>(null);
  const [savingTruck, setSavingTruck] = useState(false);

  // Cargar TODOS los camiones, no solo los activos (para poder reactivar)
  const [allTrucks, setAllTrucks] = useState<typeof trucks>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await db
        .from("tonnage_trucks")
        .select("id, truck_number, label, material, is_active, sort_order, notes, default_driver_user_id")
        .order("sort_order", { ascending: true });
      setAllTrucks((data ?? []) as typeof trucks);
    };
    void load();
  }, [trucks, db]);

  const resetTruckForm = () => {
    setTruckForm({ truck_number: "", label: "", material: "arenas", default_driver_user_id: "" });
    setEditingTruckId(null);
  };

  const startEditTruck = (truck: typeof trucks[0]) => {
    setTruckForm({
      truck_number: String(truck.truck_number),
      label: truck.label,
      material: truck.material,
      default_driver_user_id: truck.default_driver_user_id ?? "",
    });
    setEditingTruckId(truck.id);
  };

  const saveTruck = async () => {
    const num = parseInt(truckForm.truck_number, 10);
    if (!truckForm.label.trim() || isNaN(num)) {
      toast.error("Rellena número y nombre");
      return;
    }
    setSavingTruck(true);
    const payload = {
      truck_number: num,
      label: truckForm.label.trim(),
      material: truckForm.material,
      sort_order: num,
      default_driver_user_id: truckForm.default_driver_user_id || null,
    };
    const { error } = editingTruckId
      ? await db.from("tonnage_trucks").update(payload).eq("id", editingTruckId)
      : await db.from("tonnage_trucks").insert(payload);
    setSavingTruck(false);
    if (error) {
      toast.error(editingTruckId ? "No se pudo editar el camión" : "No se pudo crear el camión");
      return;
    }
    toast.success(editingTruckId ? "Camión actualizado" : "Camión creado");
    resetTruckForm();
    void reload();
  };

  const deleteTruck = async (truck: typeof trucks[0]) => {
    if (!confirm(`¿Eliminar definitivamente el camión "${truck.label}"? Si tiene viajes asociados, se borrarán también.`)) return;
    const { error } = await db.from("tonnage_trucks").delete().eq("id", truck.id);
    if (error) return toast.error("No se pudo eliminar (revisa dependencias)");
    toast.success("Camión eliminado");
    void reload();
  };

  const toggleTruckActive = async (truck: typeof trucks[0]) => {
    const { error } = await db.from("tonnage_trucks").update({ is_active: !truck.is_active }).eq("id", truck.id);
    if (error) return toast.error("No se pudo cambiar el estado");
    void reload();
  };

  // ============ ZONAS ============
  const [zoneForm, setZoneForm] = useState<{ label: string; zone_type: ZoneType }>({ label: "", zone_type: "carga" });
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [savingZone, setSavingZone] = useState(false);

  const [allZones, setAllZones] = useState<typeof zones>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await db
        .from("tonnage_zones")
        .select("id, label, zone_type, sort_order, is_active")
        .order("sort_order", { ascending: true });
      setAllZones((data ?? []) as typeof zones);
    };
    void load();
  }, [zones, db]);

  const resetZoneForm = () => {
    setZoneForm({ label: "", zone_type: "carga" });
    setEditingZoneId(null);
  };

  const startEditZone = (zone: typeof zones[0]) => {
    setZoneForm({ label: zone.label, zone_type: zone.zone_type });
    setEditingZoneId(zone.id);
  };

  const saveZone = async () => {
    if (!zoneForm.label.trim()) {
      toast.error("Indica el nombre de la zona");
      return;
    }
    setSavingZone(true);
    const payload = {
      label: zoneForm.label.trim(),
      zone_type: zoneForm.zone_type,
      sort_order: editingZoneId ? undefined : (allZones.length + 1) * 10,
    };
    const { error } = editingZoneId
      ? await db.from("tonnage_zones").update(payload).eq("id", editingZoneId)
      : await db.from("tonnage_zones").insert(payload);
    setSavingZone(false);
    if (error) {
      toast.error(editingZoneId ? "No se pudo editar la zona" : "No se pudo crear la zona");
      return;
    }
    toast.success(editingZoneId ? "Zona actualizada" : "Zona creada");
    resetZoneForm();
  };

  const toggleZoneActive = async (zone: typeof zones[0]) => {
    const { error } = await db.from("tonnage_zones").update({ is_active: !zone.is_active }).eq("id", zone.id);
    if (error) return toast.error("No se pudo cambiar el estado");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ===== CAMIONES ===== */}
      <section className="panel-surface p-4">
        <header className="mb-3 flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Camiones</h2>
        </header>

        <div className="space-y-3 rounded-xl border-2 border-dashed border-border p-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {editingTruckId ? "Editando camión" : "Nuevo camión"}
          </Label>
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <Input type="number" placeholder="Nº" value={truckForm.truck_number} onChange={(e) => setTruckForm((f) => ({ ...f, truck_number: e.target.value }))} />
            <Input placeholder="Nombre del camión" value={truckForm.label} onChange={(e) => setTruckForm((f) => ({ ...f, label: e.target.value }))} />
          </div>
          <Select value={truckForm.material} onValueChange={(v: TonnageMaterial) => setTruckForm((f) => ({ ...f, material: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="arenas">Arenas (material principal)</SelectItem>
              <SelectItem value="tortas">Tortas (material principal)</SelectItem>
              <SelectItem value="sulfatos">Sulfatos (material principal)</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => void saveTruck()} disabled={savingTruck}>
              {editingTruckId ? "Guardar cambios" : "Crear camión"}
            </Button>
            {editingTruckId && (
              <Button variant="outline" onClick={resetTruckForm}>Cancelar</Button>
            )}
          </div>
        </div>

        <div className="mt-3 max-h-[480px] overflow-y-auto rounded-xl border border-border">
          {allTrucks.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No hay camiones aún</p>
          ) : (
            <ul className="divide-y divide-border">
              {allTrucks.map((t) => (
                <li key={t.id} className={cn("flex items-center gap-2 p-2", !t.is_active && "opacity-50")}>
                  <div className={cn("flex h-9 w-9 flex-none items-center justify-center rounded-lg text-xs font-bold", materialBg[t.material])}>
                    #{t.truck_number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{materialLabel[t.material]}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEditTruck(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => void toggleTruckActive(t)}>
                    {t.is_active ? "Desactivar" : "Activar"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ===== ZONAS ===== */}
      <section className="panel-surface p-4">
        <header className="mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Zonas de carga y descarga</h2>
        </header>

        <div className="space-y-3 rounded-xl border-2 border-dashed border-border p-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {editingZoneId ? "Editando zona" : "Nueva zona"}
          </Label>
          <Input placeholder="Nombre de la zona (ej: Pozo A, Tolva)" value={zoneForm.label} onChange={(e) => setZoneForm((f) => ({ ...f, label: e.target.value }))} />
          <Select value={zoneForm.zone_type} onValueChange={(v: ZoneType) => setZoneForm((f) => ({ ...f, zone_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="carga">Solo carga</SelectItem>
              <SelectItem value="descarga">Solo descarga</SelectItem>
              <SelectItem value="ambas">Ambas (sirve como carga y como descarga)</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => void saveZone()} disabled={savingZone}>
              {editingZoneId ? "Guardar cambios" : "Crear zona"}
            </Button>
            {editingZoneId && (
              <Button variant="outline" onClick={resetZoneForm}>Cancelar</Button>
            )}
          </div>
        </div>

        <div className="mt-3 max-h-[480px] overflow-y-auto rounded-xl border border-border">
          {allZones.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No hay zonas aún</p>
          ) : (
            <ul className="divide-y divide-border">
              {allZones.map((z) => (
                <li key={z.id} className={cn("flex items-center gap-2 p-2", !z.is_active && "opacity-50")}>
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-muted">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{z.label}</p>
                    <p className="text-xs text-muted-foreground">{zoneTypeLabel[z.zone_type]}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEditZone(z)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => void toggleZoneActive(z)}>
                    {z.is_active ? "Desactivar" : "Activar"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

export default TonnageTrucksManager;
