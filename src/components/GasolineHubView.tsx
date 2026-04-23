import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { CalendarDays, Camera, CarFront, CreditCard, Download, FileText, Fuel, MapPinned, PencilLine } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type GasolineRecord = {
  id: string;
  cardId: string;
  date: string;
  station: string;
  amount: string;
  liters: string;
  vehicle: string;
  observations: string;
  receiptPhotoName: string;
  extraInfo: string;
};

const STORAGE_KEY = "transtubari-gasoline-records";

const creditCards = Array.from({ length: 14 }, (_, index) => ({
  id: `card-${index + 1}`,
  alias: `Tarjeta ${String(index + 1).padStart(2, "0")}`,
  masked: `.... .... .... ${String(1001 + index).slice(-4)}`,
}));

const emptyForm = (cardId: string): GasolineRecord => ({
  id: "",
  cardId,
  date: new Date().toISOString().slice(0, 10),
  station: "",
  amount: "",
  liters: "",
  vehicle: "",
  observations: "",
  receiptPhotoName: "",
  extraInfo: "",
});

interface GasolineHubViewProps {
  isAdminView?: boolean;
}

const GasolineHubView = ({ isAdminView = false }: GasolineHubViewProps) => {
  const [records, setRecords] = useState<GasolineRecord[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>(creditCards[0].id);
  const [draft, setDraft] = useState<GasolineRecord>(() => emptyForm(creditCards[0].id));
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as GasolineRecord[];
      setRecords(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    setDraft((current) => {
      if (editingId) return current;
      return emptyForm(selectedCardId);
    });
  }, [selectedCardId, editingId]);

  const selectedCard = creditCards.find((card) => card.id === selectedCardId) ?? creditCards[0];
  const cardRecords = useMemo(
    () => records.filter((record) => record.cardId === selectedCardId).sort((a, b) => b.date.localeCompare(a.date)),
    [records, selectedCardId],
  );

  const cardSummaries = useMemo(
    () =>
      creditCards.map((card) => {
        const cardEntries = records.filter((record) => record.cardId === card.id);
        const totalAmount = cardEntries.reduce((sum, record) => sum + Number(record.amount || 0), 0);
        return {
          ...card,
          entries: cardEntries.length,
          totalAmount,
          lastDate: cardEntries.sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null,
        };
      }),
    [records],
  );

  const handleSave = () => {
    const payload = {
      ...draft,
      id: editingId ?? crypto.randomUUID(),
      cardId: selectedCardId,
    };

    if (editingId) {
      setRecords((current) => current.map((item) => (item.id === editingId ? payload : item)));
      setEditingId(null);
    } else {
      setRecords((current) => [payload, ...current]);
    }

    setDraft(emptyForm(selectedCardId));
  };

  const handleEdit = (record: GasolineRecord) => {
    setSelectedCardId(record.cardId);
    setDraft(record);
    setEditingId(record.id);
  };

  const handleExport = () => {
    const workbook = XLSX.utils.book_new();
    const rows = records.map((record) => ({
      Tarjeta: creditCards.find((card) => card.id === record.cardId)?.alias ?? record.cardId,
      Fecha: record.date,
      Gasolinera: record.station,
      Importe: record.amount,
      Litros: record.liters,
      Vehiculo: record.vehicle,
      Observaciones: record.observations,
      Ticket: record.receiptPhotoName,
      Extra: record.extraInfo,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 28 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, sheet, "Gasolina");
    XLSX.writeFile(workbook, "Gasolina_registros.xlsx");
  };

  const totalAmount = cardRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0);

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
                <p className="text-lg font-semibold tracking-[0.12em] text-foreground">{card.masked}</p>
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

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/80 shadow-[var(--shadow-soft)]">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Fuel className="h-5 w-5 text-primary" /> {selectedCard.alias}</CardTitle>
            <p className="text-sm text-muted-foreground">Detalle base preparado para registrar pagos, tickets y observaciones sin complicar la operativa diaria.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tarjeta</p><p className="mt-1 font-semibold text-foreground">{selectedCard.masked}</p></div>
              <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Registros</p><p className="mt-1 font-semibold text-foreground">{cardRecords.length}</p></div>
              <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Importe acumulado</p><p className="mt-1 font-semibold text-foreground">{totalAmount.toFixed(2)} €</p></div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gas-date">Fecha</Label>
                <Input id="gas-date" type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gas-station">Gasolinera</Label>
                <Input id="gas-station" placeholder="Repsol, Cepsa, BP..." value={draft.station} onChange={(event) => setDraft((current) => ({ ...current, station: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gas-amount">Importe</Label>
                <Input id="gas-amount" type="number" min="0" step="0.01" placeholder="0,00" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gas-liters">Litros / cantidad</Label>
                <Input id="gas-liters" type="number" min="0" step="0.01" placeholder="Opcional" value={draft.liters} onChange={(event) => setDraft((current) => ({ ...current, liters: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gas-vehicle">Matrícula o vehículo</Label>
                <div className="relative">
                  <CarFront className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="gas-vehicle" className="pl-10" placeholder="7050 KCZ, Volvo 360..." value={draft.vehicle} onChange={(event) => setDraft((current) => ({ ...current, vehicle: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gas-extra">Campo útil adicional</Label>
                <Input id="gas-extra" placeholder="Km, centro de coste, ruta..." value={draft.extraInfo} onChange={(event) => setDraft((current) => ({ ...current, extraInfo: event.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gas-observations">Observaciones</Label>
              <Textarea id="gas-observations" placeholder="Incidencia, motivo, detalle del repostaje..." value={draft.observations} onChange={(event) => setDraft((current) => ({ ...current, observations: event.target.value }))} />
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
                    onChange={(event) => {
                      const fileName = event.target.files?.[0]?.name ?? "";
                      setDraft((current) => ({ ...current, receiptPhotoName: fileName }));
                    }}
                  />
                </div>
                {draft.receiptPhotoName ? <p className="text-xs text-muted-foreground">Archivo seleccionado: {draft.receiptPhotoName}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {editingId ? (
                  <Button variant="outline" onClick={() => { setEditingId(null); setDraft(emptyForm(selectedCardId)); }}>Cancelar</Button>
                ) : null}
                <Button onClick={handleSave}>{editingId ? <PencilLine className="h-4 w-4" /> : <FileText className="h-4 w-4" />}{editingId ? "Guardar cambios" : "Guardar registro"}</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-[var(--shadow-soft)]">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-primary" /> Historial de la tarjeta</CardTitle>
            <p className="text-sm text-muted-foreground">Registros recientes listos para editar rápidamente cuando haga falta corregir un pago o un ticket.</p>
          </CardHeader>
          <CardContent>
            {cardRecords.length === 0 ? (
              <EmptyState icon={Fuel} title="Sin registros todavía" description="Esta tarjeta ya está preparada; cuando empieces a cargar repostajes aparecerán aquí para editar o revisar." />
            ) : (
              <div className="space-y-3">
                {cardRecords.map((record) => (
                  <article key={record.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{record.station || "Gasolinera sin nombre"}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {record.date}</span>
                          {record.vehicle ? <span className="inline-flex items-center gap-1"><MapPinned className="h-3.5 w-3.5" /> {record.vehicle}</span> : null}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(record)}><PencilLine className="h-4 w-4" /> Editar</Button>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-xl bg-muted/45 px-3 py-2"><span className="text-muted-foreground">Importe</span><p className="mt-1 font-semibold text-foreground">{record.amount || "—"} €</p></div>
                      <div className="rounded-xl bg-muted/45 px-3 py-2"><span className="text-muted-foreground">Litros</span><p className="mt-1 font-semibold text-foreground">{record.liters || "—"}</p></div>
                    </div>
                    {record.observations ? <p className="mt-3 text-sm text-muted-foreground">{record.observations}</p> : null}
                    {record.receiptPhotoName ? <p className="mt-2 text-xs text-muted-foreground">Ticket: {record.receiptPhotoName}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default GasolineHubView;
