import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, Download, AlertTriangle, CheckCircle2, Clock3, Archive, Search } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DeliveryNoteDialog, { type DeliveryNoteRow, type DeliveryNoteStatus } from "@/components/admin/DeliveryNoteDialog";

const statusMeta: Record<DeliveryNoteStatus, { label: string; tone: string }> = {
  pending: { label: "Pendiente", tone: "bg-warning/15 text-foreground" },
  validated: { label: "Validado", tone: "bg-success/15 text-success" },
  incident: { label: "Incidencia", tone: "bg-destructive/10 text-destructive" },
  archived: { label: "Archivado", tone: "bg-muted text-muted-foreground" },
};

const AdminAlbaranesView = () => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<DeliveryNoteRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | DeliveryNoteStatus>("all");
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

  const kpis = useMemo(() => {
    const counters = { pending: 0, incident: 0, validated: 0, archived: 0 };
    notes.forEach((n) => { counters[n.status] += 1; });
    return [
      { label: "Pendientes", value: counters.pending, icon: Clock3 },
      { label: "Incidencias", value: counters.incident, icon: AlertTriangle },
      { label: "Validados", value: counters.validated, icon: CheckCircle2 },
      { label: "Archivados", value: counters.archived, icon: Archive },
    ];
  }, [notes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      if (!term) return true;
      return (
        n.note_number.toLowerCase().includes(term) ||
        n.customer.toLowerCase().includes(term) ||
        (n.route ?? "").toLowerCase().includes(term) ||
        (n.driver_name ?? "").toLowerCase().includes(term)
      );
    });
  }, [notes, statusFilter, search]);

  const handleOpenNew = () => {
    setEditingNote(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (note: DeliveryNoteRow) => {
    setEditingNote(note);
    setDialogOpen(true);
  };

  const handleDownload = async (note: DeliveryNoteRow) => {
    if (!note.pdf_storage_path) {
      toast({ title: "Sin PDF", description: "Este albarán no tiene archivo adjunto.", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from("delivery-notes")
        .createSignedUrl(note.pdf_storage_path, 60);
      if (error || !data?.signedUrl) throw error ?? new Error("No URL");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      toast({
        title: "No se pudo descargar",
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
        description="Registra, revisa y archiva los albaranes de entrega con su PDF asociado."
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
              placeholder="Buscar por nº, cliente, ruta o chófer…"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="validated">Validados</SelectItem>
              <SelectItem value="incident">Incidencias</SelectItem>
              <SelectItem value="archived">Archivados</SelectItem>
            </SelectContent>
          </Select>
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
            const meta = statusMeta[note.status];
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
                      <p className="font-semibold text-foreground">{note.note_number}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${meta.tone}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{note.customer}</p>
                    {note.route && <p className="text-xs text-muted-foreground">{note.route}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(note.delivery_date), "d MMM yyyy", { locale: es })}
                    </p>
                    {note.weight_kg !== null && (
                      <p className="text-xs text-muted-foreground">{note.weight_kg} kg</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{note.driver_name ?? "Sin chófer"}</span>
                  {note.pdf_storage_path && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); handleDownload(note); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleDownload(note); } }}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary hover:bg-primary/20"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
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
