import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Droplet, Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Consumable {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  notes: string | null;
  is_active: boolean;
}

interface Movement {
  id: string;
  consumable_id: string;
  movement_type: "in" | "out";
  quantity: number;
  machine_id: string | null;
  reason: string | null;
  movement_date: string;
  created_at: string;
  created_by_user_id: string;
}

interface MachineMini {
  id: string;
  display_name: string;
}

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "aceite_hidraulico", label: "Aceite hidráulico" },
  { value: "aceite_motor", label: "Aceite motor" },
  { value: "anticongelante", label: "Anticongelante" },
  { value: "filtro", label: "Filtros" },
  { value: "grasa", label: "Grasa" },
  { value: "liquido_frenos", label: "Líquido de frenos" },
  { value: "adblue", label: "AdBlue" },
  { value: "otros", label: "Otros" },
];

const categoryLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;

const emptyForm = { name: "", category: "aceite_hidraulico", unit: "L", current_stock: "0", min_stock: "0", notes: "" };

const ConsumablesView = () => {
  const { user, isAdmin, role } = useAuth();
  const canManage = isAdmin || role === "secretary";
  const db = supabase as any;

  const [items, setItems] = useState<Consumable[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [machines, setMachines] = useState<MachineMini[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<Consumable | null>(null);
  const [moveType, setMoveType] = useState<"in" | "out">("out");
  const [moveQty, setMoveQty] = useState("");
  const [moveMachine, setMoveMachine] = useState<string>("");
  const [moveReason, setMoveReason] = useState("");
  const [movementSaving, setMovementSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [c, m, ma] = await Promise.all([
      db.from("consumables").select("id, name, category, unit, current_stock, min_stock, notes, is_active").order("category").order("name"),
      db.from("consumable_movements").select("id, consumable_id, movement_type, quantity, machine_id, reason, movement_date, created_at, created_by_user_id").order("created_at", { ascending: false }).limit(150),
      db.from("machine_assets").select("id, display_name").order("display_name"),
    ]);
    setItems((c.data ?? []) as Consumable[]);
    setMovements((m.data ?? []) as Movement[]);
    setMachines((ma.data ?? []) as MachineMini[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    void reload();
  }, [user]);

  const lowStock = useMemo(() => items.filter((i) => i.is_active && Number(i.current_stock) <= Number(i.min_stock)), [items]);

  const grouped = useMemo(() => {
    const map = new Map<string, Consumable[]>();
    items.filter((i) => i.is_active).forEach((i) => {
      if (!map.has(i.category)) map.set(i.category, []);
      map.get(i.category)!.push(i);
    });
    return Array.from(map.entries());
  }, [items]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (c: Consumable) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      category: c.category,
      unit: c.unit,
      current_stock: String(c.current_stock),
      min_stock: String(c.min_stock),
      notes: c.notes ?? "",
    });
    setFormOpen(true);
  };

  const saveItem = async () => {
    if (!form.name.trim()) {
      toast.error("Indica el nombre");
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      unit: form.unit.trim() || "ud",
      current_stock: parseFloat(form.current_stock) || 0,
      min_stock: parseFloat(form.min_stock) || 0,
      notes: form.notes.trim() || null,
      created_by_user_id: user?.id ?? null,
    };
    const { error } = editingId
      ? await db.from("consumables").update(payload).eq("id", editingId)
      : await db.from("consumables").insert(payload);
    if (error) return toast.error(editingId ? "No se pudo editar" : "No se pudo crear");
    toast.success(editingId ? "Producto actualizado" : "Producto creado");
    setFormOpen(false);
    await reload();
  };

  const removeItem = async (c: Consumable) => {
    if (!window.confirm(`¿Desactivar ${c.name}?`)) return;
    const { error } = await db.from("consumables").update({ is_active: false }).eq("id", c.id);
    if (error) return toast.error("No se pudo desactivar");
    toast.success("Producto desactivado");
    await reload();
  };

  const openMove = (c: Consumable, type: "in" | "out") => {
    setMoveTarget(c);
    setMoveType(type);
    setMoveQty("");
    setMoveMachine("");
    setMoveReason("");
    setMoveOpen(true);
  };

  const saveMovement = async () => {
    if (!moveTarget || !user) return;
    const qty = parseFloat(moveQty.replace(",", "."));
    if (isNaN(qty) || qty <= 0) {
      toast.error("Indica una cantidad válida");
      return;
    }
    setMovementSaving(true);
    const { error } = await db.from("consumable_movements").insert({
      consumable_id: moveTarget.id,
      movement_type: moveType,
      quantity: qty,
      machine_id: moveMachine || null,
      reason: moveReason.trim() || null,
      created_by_user_id: user.id,
    });
    setMovementSaving(false);
    if (error) return toast.error("No se pudo registrar el movimiento");
    toast.success(moveType === "in" ? "Entrada registrada" : "Consumo registrado");
    setMoveOpen(false);
    await reload();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        eyebrow="Máquinas"
        title="Consumibles y stock"
        description="Aceites, anticongelante, filtros y demás material del taller."
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo producto
            </Button>
          ) : null
        }
      />

      {lowStock.length > 0 && (
        <section className="panel-surface border-warning/40 bg-warning/10 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <p className="text-sm font-semibold text-foreground">Stock bajo: {lowStock.length} producto(s)</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStock.map((c) => (
              <span key={c.id} className="rounded-full bg-warning/20 px-3 py-1 text-xs font-medium text-foreground">
                {c.name} · {c.current_stock}{c.unit} / mín {c.min_stock}{c.unit}
              </span>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="panel-surface p-8 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : grouped.length === 0 ? (
        <div className="panel-surface p-8 text-center text-sm text-muted-foreground">
          No hay productos aún. {canManage ? "Crea el primero con el botón de arriba." : "Pide al administrador que añada productos."}
        </div>
      ) : (
        grouped.map(([cat, list]) => (
          <section key={cat} className="panel-surface p-4">
            <header className="mb-3 flex items-center gap-2">
              <Droplet className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">{categoryLabel(cat)}</h2>
              <span className="ml-auto text-xs text-muted-foreground">{list.length} producto(s)</span>
            </header>
            <ul className="divide-y divide-border">
              {list.map((c) => {
                const low = Number(c.current_stock) <= Number(c.min_stock);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className={cn("flex h-10 w-10 flex-none items-center justify-center rounded-xl", low ? "bg-warning/20" : "bg-primary/10")}>
                      <Package className={cn("h-5 w-5", low ? "text-warning" : "text-primary")} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                      {c.notes && <p className="truncate text-xs text-muted-foreground">{c.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className={cn("text-base font-bold", low ? "text-warning" : "text-foreground")}>
                        {Number(c.current_stock).toLocaleString("es-ES")} {c.unit}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Mín. {c.min_stock} {c.unit}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openMove(c, "out")}>
                        <ArrowDownCircle className="h-3.5 w-3.5" /> Consumo
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openMove(c, "in")}>
                        <ArrowUpCircle className="h-3.5 w-3.5" /> Entrada
                      </Button>
                      {canManage && (
                        <>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => void removeItem(c)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {movements.length > 0 && (
        <section className="panel-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Últimos movimientos</h2>
          <ul className="divide-y divide-border">
            {movements.slice(0, 20).map((m) => {
              const item = items.find((i) => i.id === m.consumable_id);
              const machine = machines.find((x) => x.id === m.machine_id);
              return (
                <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                  {m.movement_type === "in" ? (
                    <ArrowUpCircle className="h-4 w-4 flex-none text-success" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4 flex-none text-warning" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {item?.name ?? "Producto"} · {m.quantity} {item?.unit}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {machine ? `${machine.display_name} · ` : ""}
                      {m.reason || (m.movement_type === "in" ? "Entrada de almacén" : "Consumo")}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(m.created_at), "d MMM HH:mm", { locale: es })}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Diálogo producto */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="p.ej. Aceite hidráulico 46" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Categoría</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Unidad</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue placeholder="Unidad" /></SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="L">L (litros)</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="ud">ud (unidades)</SelectItem>
                    <SelectItem value="m">m (metros)</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Stock actual</Label>
                <Input type="number" inputMode="decimal" value={form.current_stock} onChange={(e) => setForm((f) => ({ ...f, current_stock: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Stock mínimo</Label>
                <Input type="number" inputMode="decimal" value={form.min_stock} onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Proveedor, referencia, etc." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={() => void saveItem()}>{editingId ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo movimiento */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {moveType === "in" ? "Entrada de" : "Consumo de"} {moveTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Cantidad ({moveTarget?.unit})</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={moveQty}
                onChange={(e) => setMoveQty(e.target.value)}
                placeholder="0"
                autoFocus
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Stock actual: {moveTarget?.current_stock} {moveTarget?.unit}
              </p>
            </div>
            {moveType === "out" && (
              <div>
                <Label className="text-xs">Máquina (opcional)</Label>
                <Select value={moveMachine} onValueChange={setMoveMachine}>
                  <SelectTrigger><SelectValue placeholder="¿Para qué máquina?" /></SelectTrigger>
                  <SelectContent>
                    {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">Motivo / nota (opcional)</Label>
              <Input value={moveReason} onChange={(e) => setMoveReason(e.target.value)} placeholder={moveType === "in" ? "Pedido proveedor" : "Cambio de aceite, rellenar, etc."} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>Cancelar</Button>
            <Button onClick={() => void saveMovement()} disabled={movementSaving}>
              {movementSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsumablesView;
