import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Camera,
  Download,
  FileText,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================
// TIPOS Y CONSTANTES
// ============================================================
type CompanyKey = "nacohi" | "irigaray" | "hermua" | "hergoy" | "cst" | "finanzauto" | "blumaq" | "dicona" | "sadar" | "otros";
type ExpenseTargetKey = "maquina" | "taller" | "otros";

const COMPANIES: Array<{ key: CompanyKey; label: string }> = [
  { key: "nacohi", label: "Nacohi" },
  { key: "irigaray", label: "Irigaray" },
  { key: "hermua", label: "Hermua" },
  { key: "hergoy", label: "Hergoy" },
  { key: "cst", label: "CST" },
  { key: "finanzauto", label: "Finanzauto" },
  { key: "blumaq", label: "Blumaq" },
  { key: "dicona", label: "Dicona" },
  { key: "sadar", label: "Sadar" },
  { key: "otros", label: "Otros" },
];

const EXPENSE_TARGETS: Array<{ key: ExpenseTargetKey; label: string }> = [
  { key: "maquina", label: "Máquina" },
  { key: "taller", label: "Taller" },
  { key: "otros", label: "Otros" },
];

interface DeliveryNote {
  id: string;
  order_number: string;
  company: CompanyKey;
  expense_target: ExpenseTargetKey;
  machine_asset_id: string | null;
  amount: number | null;
  delivery_date: string;
  notes: string | null;
  photo_path: string | null;
  created_at: string;
  photoUrl?: string | null;
}

interface MachineOption {
  id: string;
  display_name: string;
  license_plate: string | null;
}

const emptyForm = {
  order_number: "",
  company: "nacohi" as CompanyKey,
  expense_target: "maquina" as ExpenseTargetKey,
  machine_asset_id: "",
  amount: "",
  delivery_date: format(new Date(), "yyyy-MM-dd"),
  notes: "",
};

const BUCKET = "delivery-notes";

// ============================================================
// COMPONENTE
// ============================================================
const AdminAlbaranesView = () => {
  const { user, canViewAdmin } = useAuth();
  const db = supabase as any;
  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario y dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoPathToKeep, setPhotoPathToKeep] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState<CompanyKey | "all">("all");
  const [filterTarget, setFilterTarget] = useState<ExpenseTargetKey | "all">("all");

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // ============ FETCH ============
  const fetchNotes = async () => {
    setLoading(true);
    const { data, error } = await db
      .from("delivery_notes")
      .select("id, order_number, company, expense_target, machine_asset_id, amount, delivery_date, notes, photo_path, created_at")
      .order("delivery_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("No se pudieron cargar los albaranes");
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as DeliveryNote[];
    // Signed URLs para las fotos
    const withUrls = await Promise.all(
      rows.map(async (note) => {
        if (!note.photo_path) return note;
        const { data: urlData } = await supabase.storage.from(BUCKET).createSignedUrl(note.photo_path, 3600);
        return { ...note, photoUrl: urlData?.signedUrl };
      }),
    );
    setNotes(withUrls);
    setLoading(false);
  };

  const fetchMachines = async () => {
    const { data } = await db
      .from("machine_assets")
      .select("id, display_name, license_plate")
      .order("display_name");
    setMachines((data ?? []) as MachineOption[]);
  };

  useEffect(() => {
    if (!user) return;
    void fetchNotes();
    void fetchMachines();
  }, [user]);

  // ============ FORM ============
  const openCreate = async () => {
    setEditingId(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoPathToKeep(null);
    setDialogOpen(true);
    // Pedir el siguiente nº disponible al servidor
    const { data: nextNumber } = await db.rpc("next_delivery_note_number");
    setForm({ ...emptyForm, order_number: nextNumber ? String(nextNumber) : "" });
  };

  const openEdit = (note: DeliveryNote) => {
    setEditingId(note.id);
    setForm({
      order_number: note.order_number,
      company: note.company,
      expense_target: note.expense_target,
      machine_asset_id: note.machine_asset_id || "",
      amount: note.amount !== null ? String(note.amount) : "",
      delivery_date: note.delivery_date,
      notes: note.notes || "",
    });
    setPhotoFile(null);
    setPhotoPreview(note.photoUrl || null);
    setPhotoPathToKeep(note.photo_path);
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo imágenes");
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoPathToKeep(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const save = async () => {
    if (!user) return;
    // El nº puede estar vacío: el trigger SQL lo rellena con auto-numeración.
    setSaving(true);

    // Subir foto nueva si la hay
    let finalPhotoPath: string | null = photoPathToKeep;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop() || "jpg";
      const path = `${format(new Date(), "yyyy/MM")}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, photoFile);
      if (uploadError) {
        toast.error("No se pudo subir la foto");
        setSaving(false);
        return;
      }
      // Si reemplaza una foto anterior al editar, borramos la vieja
      if (editingId && photoPathToKeep && photoPathToKeep !== path) {
        await supabase.storage.from(BUCKET).remove([photoPathToKeep]);
      }
      finalPhotoPath = path;
    } else if (editingId && photoPathToKeep === null) {
      // Usuario eliminó la foto en edición
      const original = notes.find((n) => n.id === editingId);
      if (original?.photo_path) {
        await supabase.storage.from(BUCKET).remove([original.photo_path]);
      }
      finalPhotoPath = null;
    }

    const payload = {
      order_number: form.order_number.trim(),
      company: form.company,
      expense_target: form.expense_target,
      machine_asset_id: form.expense_target === "maquina" && form.machine_asset_id ? form.machine_asset_id : null,
      amount: form.amount ? parseFloat(form.amount.replace(",", ".")) : null,
      delivery_date: form.delivery_date,
      notes: form.notes.trim() || null,
      photo_path: finalPhotoPath,
      created_by_user_id: user.id,
    };

    const { error } = editingId
      ? await db.from("delivery_notes").update(payload).eq("id", editingId)
      : await db.from("delivery_notes").insert(payload);

    setSaving(false);
    if (error) {
      toast.error(editingId ? "No se pudo actualizar el albarán" : "No se pudo guardar el albarán");
      return;
    }
    toast.success(editingId ? "Albarán actualizado" : "Albarán guardado");
    setDialogOpen(false);
    void fetchNotes();
  };

  const deleteNote = async (note: DeliveryNote) => {
    if (!window.confirm(`¿Eliminar el albarán ${note.order_number}?`)) return;
    const { error } = await db.from("delivery_notes").delete().eq("id", note.id);
    if (error) return toast.error("No se pudo eliminar");
    if (note.photo_path) {
      await supabase.storage.from(BUCKET).remove([note.photo_path]);
    }
    toast.success("Albarán eliminado");
    void fetchNotes();
  };

  // ============ FILTROS / KPIs ============
  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (filterCompany !== "all" && n.company !== filterCompany) return false;
      if (filterTarget !== "all" && n.expense_target !== filterTarget) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const machineName = machines.find((m) => m.id === n.machine_asset_id)?.display_name || "";
      return (
        n.order_number.toLowerCase().includes(q) ||
        n.company.toLowerCase().includes(q) ||
        machineName.toLowerCase().includes(q) ||
        (n.notes || "").toLowerCase().includes(q)
      );
    });
  }, [notes, filterCompany, filterTarget, searchTerm, machines]);

  const kpis = useMemo(() => {
    const total = notes.length;
    const withPhoto = notes.filter((n) => n.photo_path).length;
    const machineCount = notes.filter((n) => n.expense_target === "maquina").length;
    const totalAmount = notes.reduce((acc, n) => acc + (n.amount || 0), 0);
    return { total, withPhoto, machineCount, totalAmount };
  }, [notes]);

  // ============ EXPORT CSV ============
  const exportCSV = () => {
    const header = "Nº pedido;Fecha;Empresa;Destino;Máquina;Importe;Foto;Observaciones";
    const rows = filtered.map((n) => {
      const mach = n.machine_asset_id ? machines.find((m) => m.id === n.machine_asset_id)?.display_name || "" : "";
      return [
        n.order_number,
        format(new Date(n.delivery_date), "yyyy-MM-dd"),
        COMPANIES.find((c) => c.key === n.company)?.label || n.company,
        EXPENSE_TARGETS.find((e) => e.key === n.expense_target)?.label || n.expense_target,
        mach,
        n.amount ? n.amount.toFixed(2).replace(".", ",") : "",
        n.photo_path ? "Sí" : "No",
        (n.notes || "").replace(/[\r\n;]/g, " "),
      ].join(";");
    });
    const csv = ["\uFEFF" + header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `albaranes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV exportado (${filtered.length} albaranes)`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        eyebrow={canViewAdmin ? "Administración" : "Compras"}
        title="Albaranes"
        description={canViewAdmin
          ? "Registro documental de pedidos por proveedor, destino y máquina."
          : "Sube las facturas y albaranes de las compras que hagas para la empresa."}
        actions={
          <div className="flex gap-2">
            {canViewAdmin && (
              <Button variant="outline" onClick={exportCSV}>
                <Download className="h-4 w-4" /> Exportar
              </Button>
            )}
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo albarán
            </Button>
          </div>
        }
      />

      {/* KPIs solo para admin */}
      {canViewAdmin && (
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="panel-surface p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Albaranes</p>
          <p className="mt-1 text-2xl font-bold">{kpis.total}</p>
        </div>
        <div className="panel-surface p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Con foto</p>
          <p className="mt-1 text-2xl font-bold">{kpis.withPhoto}</p>
        </div>
        <div className="panel-surface p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Destino máquina</p>
          <p className="mt-1 text-2xl font-bold">{kpis.machineCount}</p>
        </div>
        <div className="panel-surface p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Importe total</p>
          <p className="mt-1 text-2xl font-bold">{kpis.totalAmount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
        </div>
      </section>
      )}

      {/* Filtros */}
      <section className="panel-surface p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nº pedido, máquina u observación"
              className="pl-9"
            />
          </div>
          <Select value={filterCompany} onValueChange={(v: CompanyKey | "all") => setFilterCompany(v)}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las empresas</SelectItem>
              {COMPANIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTarget} onValueChange={(v: ExpenseTargetKey | "all") => setFilterTarget(v)}>
            <SelectTrigger className="md:w-40"><SelectValue placeholder="Destino" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {EXPENSE_TARGETS.map((e) => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Lista de albaranes */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel-surface p-12 text-center">
          <ReceiptText className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {notes.length === 0 ? "Aún no hay albaranes. Pulsa \"Nuevo albarán\" para añadir el primero." : "Ningún albarán coincide con los filtros."}
          </p>
        </div>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((note) => {
            const machine = machines.find((m) => m.id === note.machine_asset_id);
            const companyLabel = COMPANIES.find((c) => c.key === note.company)?.label || note.company;
            const targetLabel = EXPENSE_TARGETS.find((e) => e.key === note.expense_target)?.label || note.expense_target;
            return (
              <article key={note.id} className="panel-surface flex flex-col overflow-hidden p-0">
                {/* Foto */}
                <button
                  type="button"
                  onClick={() => note.photoUrl && setLightboxUrl(note.photoUrl)}
                  className="group relative block aspect-[4/3] w-full overflow-hidden bg-muted"
                  disabled={!note.photoUrl}
                >
                  {note.photoUrl ? (
                    <img
                      src={note.photoUrl}
                      alt={`Albarán ${note.order_number}`}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
                      <FileText className="h-8 w-8" />
                      <span className="mt-1 text-xs">Sin foto</span>
                    </div>
                  )}
                </button>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">#{note.order_number}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" /> {companyLabel}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {targetLabel}
                    </span>
                  </div>

                  {machine && (
                    <p className="truncate text-xs text-muted-foreground">
                      Máquina: <span className="font-medium text-foreground">{machine.display_name}</span>
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{format(new Date(note.delivery_date), "d MMM yyyy", { locale: es })}</span>
                    {canViewAdmin && note.amount !== null && <span className="font-semibold text-foreground">{note.amount.toFixed(2)} €</span>}
                  </div>

                  {note.notes && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{note.notes}</p>
                  )}

                  <div className="mt-auto flex gap-1 pt-2">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(note)} title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => void deleteNote(note)} title="Eliminar">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Dialog formulario */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar albarán" : "Nuevo albarán"}</DialogTitle>
            <DialogDescription>
              Rellena los datos del pedido y adjunta la foto del albarán si la tienes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {/* Número de pedido */}
            <div className="space-y-1.5">
              <Label>Nº de pedido</Label>
              <Input
                value={form.order_number}
                onChange={(e) => setForm((f) => ({ ...f, order_number: e.target.value }))}
                placeholder="Ej: 2025-0341"
                autoFocus
              />
            </div>

            {/* Empresa y destino en línea */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Select value={form.company} onValueChange={(v: CompanyKey) => setForm((f) => ({ ...f, company: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPANIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Destino</Label>
                <Select value={form.expense_target} onValueChange={(v: ExpenseTargetKey) => setForm((f) => ({ ...f, expense_target: v, machine_asset_id: v === "maquina" ? f.machine_asset_id : "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_TARGETS.map((e) => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Máquina (solo si destino = máquina) */}
            {form.expense_target === "maquina" && (
              <div className="space-y-1.5">
                <Label>Máquina concreta</Label>
                <Select
                  value={form.machine_asset_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, machine_asset_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Elige una máquina" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.display_name}{m.license_plate ? ` · ${m.license_plate}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Fecha (e importe solo admin) */}
            <div className={canViewAdmin ? "grid grid-cols-2 gap-2" : ""}>
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.delivery_date}
                  onChange={(e) => setForm((f) => ({ ...f, delivery_date: e.target.value }))}
                />
              </div>
              {canViewAdmin && (
                <div className="space-y-1.5">
                  <Label>Importe (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Opcional"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Opcional"
                className="min-h-20"
              />
            </div>

            {/* Foto */}
            <div className="space-y-1.5">
              <Label>Foto del albarán</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {photoPreview ? (
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
                  <img src={photoPreview} alt="Vista previa" className="h-full w-full object-contain" />
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg"
                    title="Quitar foto"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="h-20 w-full gap-2 border-dashed" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Adjuntar foto
                </Button>
              )}
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingId ? "Guardar cambios" : "Guardar albarán"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-5xl border-none bg-black/95 p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Vista ampliada</DialogTitle>
          </DialogHeader>
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {lightboxUrl && (
            <img src={lightboxUrl} alt="Albarán ampliado" className="max-h-[90vh] w-full object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAlbaranesView;
