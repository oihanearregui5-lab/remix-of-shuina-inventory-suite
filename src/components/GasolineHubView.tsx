import { useEffect, useMemo, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, CalendarDays, Camera, CarFront, CreditCard, Download, FileText, Fuel, MapPinned, PencilLine, Trash2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { buildGasolineAlerts, getFuelUnitPrice, parseFuelNumber, validateFuelDraft } from "@/lib/gasoline-alerts";

interface FuelCard {
  id: string;
  alias: string;
  masked_number: string | null;
  is_active: boolean;
  sort_order: number;
}

interface FuelRecord {
  id: string;
  card_id: string;
  record_date: string;
  station: string;
  amount: number;
  liters: number | null;
  vehicle: string | null;
  observations: string | null;
  receipt_photo_path: string | null;
  receipt_photo_name: string | null;
  extra_info: string | null;
  created_by_user_id: string;
}

interface DraftRecord {
  id: string | null;
  card_id: string;
  record_date: string;
  station: string;
  amount: string;
  liters: string;
  vehicle: string;
  observations: string;
  extra_info: string;
  receipt_photo_path: string | null;
  receipt_photo_name: string | null;
}

const emptyDraft = (cardId: string): DraftRecord => ({
  id: null,
  card_id: cardId,
  record_date: new Date().toISOString().slice(0, 10),
  station: "",
  amount: "",
  liters: "",
  vehicle: "",
  observations: "",
  extra_info: "",
  receipt_photo_path: null,
  receipt_photo_name: null,
});

interface GasolineHubViewProps {
  isAdminView?: boolean;
}

const GasolineHubView = ({ isAdminView = false }: GasolineHubViewProps) => {
  const { user } = useAuth();
  const [cards, setCards] = useState<FuelCard[]>([]);
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRecord | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [cardsRes, recordsRes] = await Promise.all([
      supabase.from("fuel_cards").select("id, alias, masked_number, is_active, sort_order").eq("is_active", true).order("sort_order"),
      supabase.from("fuel_records").select("*").order("record_date", { ascending: false }),
    ]);
    if (cardsRes.error) toast.error("No se pudieron cargar las tarjetas");
    if (recordsRes.error) toast.error("No se pudieron cargar los repostajes");
    const loadedCards = cardsRes.data ?? [];
    setCards(loadedCards);
    setRecords(recordsRes.data ?? []);
    if (loadedCards.length > 0) {
      setSelectedCardId((current) => current ?? loadedCards[0].id);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedCardId) return;
    if (editingId) return;
    setDraft(emptyDraft(selectedCardId));
  }, [selectedCardId, editingId]);

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;
  const cardRecords = useMemo(
    () => records.filter((record) => record.card_id === selectedCardId).sort((a, b) => b.record_date.localeCompare(a.record_date)),
    [records, selectedCardId],
  );

  const alertRecords = useMemo(
    () =>
      records.map((r) => ({
        id: r.id,
        cardId: r.card_id,
        date: r.record_date,
        station: r.station,
        amount: r.amount,
        liters: r.liters,
        vehicle: r.vehicle ?? "",
      })),
    [records],
  );
  const alerts = useMemo(() => buildGasolineAlerts(alertRecords), [alertRecords]);
  const selectedCardAlerts = useMemo(() => alerts.filter((alert) => alert.cardId === selectedCardId), [alerts, selectedCardId]);

  const cardSummaries = useMemo(
    () =>
      cards.map((card) => {
        const cardEntries = records.filter((record) => record.card_id === card.id);
        const totalAmount = cardEntries.reduce((sum, record) => sum + Number(record.amount || 0), 0);
        return {
          ...card,
          entries: cardEntries.length,
          totalAmount,
          lastDate: cardEntries.sort((a, b) => b.record_date.localeCompare(a.record_date))[0]?.record_date ?? null,
        };
      }),
    [cards, records],
  );

  const handleReceiptUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("fuel-receipts").upload(path, file, { upsert: false });
      if (error) throw error;
      setDraft((current) => current ? { ...current, receipt_photo_path: path, receipt_photo_name: file.name } : current);
      toast.success("Ticket subido");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo subir el ticket");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!draft || !user || !selectedCardId) return;
    const validationError = validateFuelDraft({
      date: draft.record_date,
      station: draft.station,
      amount: draft.amount,
      liters: draft.liters,
      vehicle: draft.vehicle,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        card_id: selectedCardId,
        record_date: draft.record_date,
        station: draft.station.trim(),
        amount: parseFuelNumber(draft.amount),
        liters: draft.liters ? parseFuelNumber(draft.liters) : null,
        vehicle: draft.vehicle.trim() || null,
        observations: draft.observations.trim() || null,
        extra_info: draft.extra_info.trim() || null,
        receipt_photo_path: draft.receipt_photo_path,
        receipt_photo_name: draft.receipt_photo_name,
      };

      if (editingId) {
        const { error } = await supabase.from("fuel_records").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Gasto actualizado");
      } else {
        const { error } = await supabase.from("fuel_records").insert({ ...payload, created_by_user_id: user.id });
        if (error) throw error;
        toast.success("Gasto guardado");
      }

      setEditingId(null);
      setDraft(emptyDraft(selectedCardId));
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("No se pudo guardar el repostaje");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record: FuelRecord) => {
    setSelectedCardId(record.card_id);
    setEditingId(record.id);
    setDraft({
      id: record.id,
      card_id: record.card_id,
      record_date: record.record_date,
      station: record.station,
      amount: String(record.amount ?? ""),
      liters: record.liters !== null ? String(record.liters) : "",
      vehicle: record.vehicle ?? "",
      observations: record.observations ?? "",
      extra_info: record.extra_info ?? "",
      receipt_photo_path: record.receipt_photo_path,
      receipt_photo_name: record.receipt_photo_name,
    });
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm("¿Eliminar este repostaje?")) return;
    const { error } = await supabase.from("fuel_records").delete().eq("id", recordId);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    toast.success("Repostaje eliminado");
    await loadData();
  };

  const handleExport = () => {
    const cardMap = new Map(cards.map((c) => [c.id, c.alias]));
    const workbook = XLSX.utils.book_new();
    const rows = records.map((record) => ({
      Tarjeta: cardMap.get(record.card_id) ?? record.card_id,
      Fecha: record.record_date,
      Gasolinera: record.station,
      Importe: record.amount,
      Litros: record.liters ?? "",
      Vehiculo: record.vehicle ?? "",
      Observaciones: record.observations ?? "",
      Ticket: record.receipt_photo_name ?? "",
      Extra: record.extra_info ?? "",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 28 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, sheet, "Gasolina");
    XLSX.writeFile(workbook, "Gasolina_registros.xlsx");
  };

  const totalAmount = cardRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const totalLiters = cardRecords.reduce((sum, record) => sum + parseFuelNumber(record.liters), 0);
  const averagePrice = totalAmount > 0 && totalLiters > 0 ? totalAmount / totalLiters : null;

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <PageHeader eyebrow="Operativa" title="Gasolina" description="Cargando tarjetas y movimientos..." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <PageHeader eyebrow="Operativa" title="Gasolina" description="Aún no hay tarjetas configuradas." />
        <EmptyState icon={CreditCard} title="Sin tarjetas" description="Pide a un administrador que configure las tarjetas de combustible." />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow={isAdminView ? "Administración" : "Operativa"}
        title="Gasolina"
        description={isAdminView ? "Control visual de tarjetas y registros de repostajes, listo para revisión y descarga." : "Acceso rápido a las tarjetas y a los repostajes asociados a cada una."}
        actions={isAdminView ? <Button onClick={handleExport}><Download className="h-4 w-4" /> Exportar Excel</Button> : undefined}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cardSummaries.map((card) => {
          const isActive = card.id === selectedCardId;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setEditingId(null);
                setSelectedCardId(card.id);
              }}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive ? "border-primary bg-primary/5 shadow-[var(--shadow-soft)]" : "border-border bg-card hover:border-primary/30 hover:bg-muted/20",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/25 text-secondary-foreground">
                  <CreditCard className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{card.alias}</span>
              </div>
              <div className="mt-5 space-y-3">
                <p className="text-lg font-semibold tracking-[0.12em] text-foreground">{card.masked_number ?? "—"}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-xl bg-muted/45 px-3 py-2">
                    <p>Movimientos</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{card.entries}</p>
                  </div>
                  <div className="rounded-xl bg-muted/45 px-3 py-2">
                    <p>Total</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{card.totalAmount.toFixed(2)} €</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{card.lastDate ? `Último uso · ${card.lastDate}` : "Sin registros todavía"}</p>
              </div>
            </button>
          );
        })}
      </section>

      {selectedCardAlerts.length > 0 ? (
        <section className="panel-surface p-4">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Alertas de revisión</h2>
              <p className="text-sm text-muted-foreground">Movimientos de esta tarjeta que conviene revisar.</p>
            </div>
          </div>
          <div className="space-y-3">
            {selectedCardAlerts.slice(0, 4).map((alert) => (
              <article key={alert.id} className={cn("rounded-xl border p-4", alert.severity === "danger" ? "border-destructive/20 bg-destructive/5" : "border-primary/20 bg-primary/5")}>
                <p className="font-semibold text-foreground">{alert.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/80 shadow-[var(--shadow-soft)] xl:order-2">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-primary" /> Movimientos de la tarjeta</CardTitle>
            <p className="text-sm text-muted-foreground">Lista simple para revisar y corregir gastos sin perder tiempo.</p>
          </CardHeader>
          <CardContent>
            {cardRecords.length === 0 ? (
              <EmptyState icon={Fuel} title="Sin movimientos todavía" description="Cuando registres el primer gasto aparecerá aquí con acceso rápido para editarlo." />
            ) : (
              <div className="space-y-3">
                {cardRecords.map((record) => {
                  const unitPrice = getFuelUnitPrice({
                    id: record.id,
                    cardId: record.card_id,
                    date: record.record_date,
                    station: record.station,
                    amount: record.amount,
                    liters: record.liters,
                    vehicle: record.vehicle ?? "",
                  });
                  return (
                    <article key={record.id} className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">{record.station || "Gasolinera sin nombre"}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {record.record_date}</span>
                            {record.vehicle ? <span className="inline-flex items-center gap-1"><MapPinned className="h-3.5 w-3.5" /> {record.vehicle}</span> : null}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(record)}><PencilLine className="h-4 w-4" /> Editar</Button>
                          {(isAdminView || record.created_by_user_id === user?.id) ? (
                            <Button variant="outline" size="sm" onClick={() => handleDelete(record.id)}><Trash2 className="h-4 w-4" /></Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <div className="rounded-xl bg-muted/45 px-3 py-2"><span className="text-muted-foreground">Importe</span><p className="mt-1 font-semibold text-foreground">{Number(record.amount).toFixed(2)} €</p></div>
                        <div className="rounded-xl bg-muted/45 px-3 py-2"><span className="text-muted-foreground">Litros</span><p className="mt-1 font-semibold text-foreground">{record.liters !== null ? Number(record.liters).toFixed(2) : "—"}</p></div>
                        <div className="rounded-xl bg-muted/45 px-3 py-2 sm:col-span-2"><span className="text-muted-foreground">Precio medio</span><p className="mt-1 font-semibold text-foreground">{unitPrice ? `${unitPrice.toFixed(2)} €/l` : "Sin cálculo"}</p></div>
                      </div>
                      {alerts.some((alert) => alert.recordId === record.id) ? <p className="mt-3 text-xs font-medium text-primary">Requiere revisión por patrón anómalo</p> : null}
                      {record.observations ? <p className="mt-3 text-sm text-muted-foreground">{record.observations}</p> : null}
                      {record.receipt_photo_name ? <p className="mt-2 text-xs text-muted-foreground">Ticket: {record.receipt_photo_name}</p> : null}
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {draft && selectedCard ? (
          <Card className="border-border/80 shadow-[var(--shadow-soft)]">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-lg"><Fuel className="h-5 w-5 text-primary" /> {selectedCard.alias}</CardTitle>
              <p className="text-sm text-muted-foreground">Formulario compacto para añadir o corregir un gasto de forma rápida.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tarjeta</p><p className="mt-1 font-semibold text-foreground">{selectedCard.masked_number ?? "—"}</p></div>
                <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Registros</p><p className="mt-1 font-semibold text-foreground">{cardRecords.length}</p></div>
                <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Importe acumulado</p><p className="mt-1 font-semibold text-foreground">{totalAmount.toFixed(2)} €</p></div>
                <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Litros acumulados</p><p className="mt-1 font-semibold text-foreground">{totalLiters.toFixed(2)}</p></div>
                <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Precio medio</p><p className="mt-1 font-semibold text-foreground">{averagePrice ? `${averagePrice.toFixed(2)} €/l` : "—"}</p></div>
                <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Alertas</p><p className="mt-1 font-semibold text-foreground">{selectedCardAlerts.length}</p></div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gas-date">Fecha</Label>
                  <Input id="gas-date" type="date" value={draft.record_date} onChange={(event) => setDraft((current) => current ? { ...current, record_date: event.target.value } : current)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gas-station">Gasolinera</Label>
                  <Input id="gas-station" placeholder="Repsol, Cepsa, BP..." value={draft.station} onChange={(event) => setDraft((current) => current ? { ...current, station: event.target.value } : current)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gas-amount">Importe</Label>
                  <Input id="gas-amount" type="number" min="0" step="0.01" placeholder="0,00" value={draft.amount} onChange={(event) => setDraft((current) => current ? { ...current, amount: event.target.value } : current)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gas-liters">Litros / cantidad</Label>
                  <Input id="gas-liters" type="number" min="0" step="0.01" placeholder="Opcional" value={draft.liters} onChange={(event) => setDraft((current) => current ? { ...current, liters: event.target.value } : current)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gas-vehicle">Matrícula o vehículo</Label>
                  <div className="relative">
                    <CarFront className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="gas-vehicle" className="pl-10" placeholder="7050 KCZ, Volvo 360..." value={draft.vehicle} onChange={(event) => setDraft((current) => current ? { ...current, vehicle: event.target.value } : current)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gas-extra">Campo útil adicional</Label>
                  <Input id="gas-extra" placeholder="Km, centro de coste, ruta..." value={draft.extra_info} onChange={(event) => setDraft((current) => current ? { ...current, extra_info: event.target.value } : current)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gas-observations">Observaciones</Label>
                <Textarea id="gas-observations" placeholder="Incidencia, motivo, detalle del repostaje..." value={draft.observations} onChange={(event) => setDraft((current) => current ? { ...current, observations: event.target.value } : current)} />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="gas-receipt">Foto del ticket / albarán</Label>
                  <div className="relative">
                    <Camera className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="gas-receipt"
                      className="pl-10"
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleReceiptUpload(file);
                      }}
                    />
                  </div>
                  {draft.receipt_photo_name ? <p className="text-xs text-muted-foreground">Archivo: {draft.receipt_photo_name}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {editingId ? (
                    <Button variant="outline" onClick={() => { setEditingId(null); setDraft(emptyDraft(selectedCardId!)); }}>Cancelar</Button>
                  ) : null}
                  <Button onClick={handleSave} disabled={saving || uploading}>
                    {editingId ? <PencilLine className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    {editingId ? "Guardar cambios" : "Añadir gasto"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  );
};

export default GasolineHubView;
