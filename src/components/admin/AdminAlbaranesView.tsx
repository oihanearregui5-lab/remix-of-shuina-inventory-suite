import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, ImageIcon, Search, Building2, Wrench, Truck, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DeliveryNoteDialog, {
  type DeliveryNoteRow,
  type DeliveryNoteCompany,
  type DeliveryNoteExpenseTarget,
  COMPANY_OPTIONS,
  EXPENSE_TARGET_OPTIONS,
} from "@/components/admin/DeliveryNoteDialog";

const companyLabel = (value: DeliveryNoteCompany) =>
  COMPANY_OPTIONS.find((c) => c.value === value)?.label ?? value;

const expenseLabel = (value: DeliveryNoteExpenseTarget) =>
  EXPENSE_TARGET_OPTIONS.find((c) => c.value === value)?.label ?? value;

const expenseIcon: Record<DeliveryNoteExpenseTarget, typeof Truck> = {
  maquina: Truck,
  taller: Wrench,
  otros: MoreHorizontal,
};

const formatCurrency = (value: number | null) =>
  value === null ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const AdminAlbaranesView = () => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<DeliveryNoteRow | null>(null);
  const [companyFilter, setCompanyFilter] = useState<"all" | DeliveryNoteCompany>("all");
  const [targetFilter, setTargetFilter] = useState<"all" | DeliveryNoteExpenseTarget>("all");
  const [search, setSearch] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["delivery-notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_notes")
        .select("*")
        .order("delivery_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DeliveryNoteRow[];
    },
  });

  const { data: machines = [] } = useQuery({
    queryKey: ["delivery-note-machines-index"],
    queryFn: async () => {
      const { data, error } = await supabase.from("machine_assets").select("id, display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const machineNameById = useMemo(() => {
    const map = new Map<string, string>();
    machines.forEach((m) => map.set(m.id, m.display_name));
    return map;
  }, [machines]);

  const kpis = useMemo(() => {
    const total = notes.reduce((sum, n) => sum + (n.amount ?? 0), 0);
    const byTarget = { maquina: 0, taller: 0, otros: 0 } as Record<DeliveryNoteExpenseTarget, number>;
    notes.forEach((n) => { byTarget[n.expense_target] += n.amount ?? 0; });
    return [
      { label: "Albaranes", value: notes.length.toString(), icon: FileText },
      { label: "Total importe", value: formatCurrency(total), icon: Building2 },
      { label: "Gasto en máquinas", value: formatCurrency(byTarget.maquina), icon: Truck },
      { label: "Gasto en taller", value: formatCurrency(byTarget.taller), icon: Wrench },
    ];
  }, [notes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (companyFilter !== "all" && n.company !== companyFilter) return false;
      if (targetFilter !== "all" && n.expense_target !== targetFilter) return false;
      if (!term) return true;
      const machineName = n.machine_asset_id ? machineNameById.get(n.machine_asset_id) ?? "" : "";
      return (
        n.order_number.toLowerCase().includes(term) ||
        companyLabel(n.company).toLowerCase().includes(term) ||
        machineName.toLowerCase().includes(term) ||
        (n.notes ?? "").toLowerCase().includes(term)
      );
    });
  }, [notes, companyFilter, targetFilter, search, machineNameById]);

  const handleOpenNew = () => {
    setEditingNote(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (note: DeliveryNoteRow) => {
    setEditingNote(note);
    setDialogOpen(true);
  };

  const handleViewPhoto = async (note: DeliveryNoteRow) => {
    if (!note.photo_path) {
      toast({ title: "Sin foto", description: "Este albarán no tiene foto adjunta.", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from("delivery-notes")
        .createSignedUrl(note.photo_path, 60);
      if (error || !data?.signedUrl) throw error ?? new Error("No URL");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      toast({
        title: "No se pudo abrir",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="Administración"
        title="Albaranes"
        description="Registra cada albarán con número de pedido, empresa, destino del gasto y foto del documento."
        actions={
          <Button onClick={handleOpenNew}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo albarán
          </Button>
        }
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="panel-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                </div>
                <div className="rounded-lg bg-muted p-2 text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nº, empresa, máquina o notas…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v as typeof companyFilter)}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las empresas</SelectItem>
                {COMPANY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={targetFilter} onValueChange={(v) => setTargetFilter(v as typeof targetFilter)}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los destinos</SelectItem>
                {EXPENSE_TARGET_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Cargando albaranes…</p>}
          {!isLoading && filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-background p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">No hay albaranes que coincidan</p>
              <p className="text-xs text-muted-foreground">Crea uno nuevo o ajusta los filtros.</p>
            </div>
          )}
          {filtered.map((note) => {
            const Icon = expenseIcon[note.expense_target];
            const machineName = note.machine_asset_id ? machineNameById.get(note.machine_asset_id) : null;
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => handleOpenEdit(note)}
                className="flex w-full flex-col gap-2 rounded-lg border border-border bg-background p-4 text-left transition hover:border-primary hover:bg-muted/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{note.order_number}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                        <Icon className="h-3 w-3" /> {expenseLabel(note.expense_target)}
                      </span>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                        {companyLabel(note.company)}
                      </span>
                    </div>
                    {machineName && (
                      <p className="mt-1 text-sm text-foreground">{machineName}</p>
                    )}
                    {note.notes && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{note.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(note.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(note.delivery_date), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
                  {note.photo_path && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); handleViewPhoto(note); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleViewPhoto(note); } }}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary hover:bg-primary/20"
                    >
                      <ImageIcon className="h-3.5 w-3.5" /> Ver foto
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <DeliveryNoteDialog open={dialogOpen} onOpenChange={setDialogOpen} note={editingNote} />
    </div>
  );
};

export default AdminAlbaranesView;
