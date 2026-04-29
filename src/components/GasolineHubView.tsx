import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, CalendarDays, Camera, CarFront, CreditCard, Download, FileText, Fuel, MapPinned, PencilLine } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buildGasolineAlerts, getFuelUnitPrice, parseFuelNumber, validateFuelDraft } from "@/lib/gasoline-alerts";

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
  const alerts = useMemo(() => buildGasolineAlerts(records), [records]);
  const selectedCardAlerts = useMemo(() => alerts.filter((alert) => alert.cardId === selectedCardId), [alerts, selectedCardId]);

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
    if (isAdminView) {
      const validationError = validateFuelDraft(draft);
      if (validationError) {
        toast.error(validationError);
        return;
      }
    } else {
      // Validación mínima para trabajador (sin importe)
      if (!draft.date) { toast.error("Indica la fecha"); return; }
      if (!draft.station.trim()) { toast.error("Indica la gasolinera"); return; }
      if (!draft.vehicle.trim()) { toast.error("Indica el vehículo o matrícula"); return; }
    }

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
    toast.success(editingId ? "Gasto actualizado" : "Gasto guardado");
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
  const totalLiters = cardRecords.reduce((sum, record) => sum + parseFuelNumber(record.liters), 0);
  const averagePrice = totalAmount > 0 && totalLiters > 0 ? totalAmount / totalLiters : null;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow={isAdminView ? "Administración" : "Operativa"}
        title="Gasolina"
        description={isAdminView ? "Control visual de tarjetas y registros de repostajes, listo para revisión y descarga." : "Acceso rápido a las tarjetas y a los repostajes asociados a cada una."}
        actions={isAdminView ? <Button onClick={handleExport}><Download className="h-4 w-4" /> Exportar Excel</Button> : undefined}
      />

      <section className="panel-surface p-2 sm:p-3">
        <Accordion
          type="single"
          collapsible
          value={selectedCardId}
          onValueChange={(value) => {
            if (!value) return;
            setEditingId(null);
            setSelectedCardId(value);
          }}
          className="divide-y divide-border"
        >
          {cardSummaries.map((card) => {
            const monthPrefix = new Date().toISOString().slice(0, 7);
            const monthEntries = records
              .filter((record) => record.cardId === card.id && record.date.startsWith(monthPrefix));
            const monthTotal = monthEntries.reduce((sum, record) => sum + Number(record.amount || 0), 0);
            const lastFive = records
              .filter((record) => record.cardId === card.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5);
            return (
              <AccordionItem key={card.id} value={card.id} className="border-b-0">
                <AccordionTrigger className="px-2 py-3 hover:no-underline">
                  <div className="flex flex-1 items-center justify-between gap-3 pr-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-secondary/25 text-secondary-foreground">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-semibold text-foreground">{card.alias} · <span className="font-mono text-xs text-muted-foreground">{card.masked.slice(-9)}</span></p>
                        <p className="text-[11px] text-muted-foreground">{card.entries} mov. · {card.lastDate ?? "sin uso"}</p>
                      </div>
                    </div>
                    {isAdminView && (
                      <span className="flex-none rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">{monthTotal.toFixed(2)} € / mes</span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-3">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingId(null);
                        setSelectedCardId(card.id);
                        setDraft(emptyForm(card.id));
                        document.getElementById("gas-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      <Fuel className="h-4 w-4" /> Registrar repostaje
                    </Button>
                    {lastFive.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin movimientos todavía.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {lastFive.map((record) => (
                          <li key={record.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{record.station || "Sin gasolinera"}</p>
                              <p className="text-[11px] text-muted-foreground">{record.date}{record.vehicle ? ` · ${record.vehicle}` : ""}</p>
                            </div>
                            {isAdminView ? (
                              <span className="flex-none font-semibold text-foreground">{record.amount ? `${Number(record.amount).toFixed(2)} €` : "—"}</span>
                            ) : (
                              <span className="flex-none text-[11px] text-muted-foreground">{record.station ? "✓" : ""}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </section>

      {isAdminView && selectedCardAlerts.length > 0 ? (
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

      <section className={cn("grid gap-4", isAdminView && "xl:grid-cols-[0.95fr_1.05fr]") }>
        {isAdminView && (
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
                      <div className="rounded-xl bg-muted/45 px-3 py-2 sm:col-span-2"><span className="text-muted-foreground">Precio medio</span><p className="mt-1 font-semibold text-foreground">{getFuelUnitPrice(record) ? `${getFuelUnitPrice(record)?.toFixed(2)} €/l` : "Sin cálculo"}</p></div>
                    </div>
                    {alerts.some((alert) => alert.recordId === record.id) ? <p className="mt-3 text-xs font-medium text-primary">Requiere revisión por patrón anómalo</p> : null}
                    {record.observations ? <p className="mt-3 text-sm text-muted-foreground">{record.observations}</p> : null}
                    {record.receiptPhotoName ? <p className="mt-2 text-xs text-muted-foreground">Ticket: {record.receiptPhotoName}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        <Card id="gas-form" className="border-border/80 shadow-[var(--shadow-soft)] scroll-mt-24">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Fuel className="h-5 w-5 text-primary" /> {selectedCard.alias}</CardTitle>
            <p className="text-sm text-muted-foreground">Formulario compacto para añadir o corregir un gasto de forma rápida.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdminView && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tarjeta</p><p className="mt-1 font-semibold text-foreground">{selectedCard.masked}</p></div>
                <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Registros</p><p className="mt-1 font-semibold text-foreground">{cardRecords.length}</p></div>
                <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Importe acumulado</p><p className="mt-1 font-semibold text-foreground">{totalAmount.toFixed(2)} €</p></div>
                <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Litros acumulados</p><p className="mt-1 font-semibold text-foreground">{totalLiters.toFixed(2)}</p></div>
                <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Precio medio</p><p className="mt-1 font-semibold text-foreground">{averagePrice ? `${averagePrice.toFixed(2)} €/l` : "—"}</p></div>
                <div className="rounded-xl bg-muted/45 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Alertas</p><p className="mt-1 font-semibold text-foreground">{selectedCardAlerts.length}</p></div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gas-date">Fecha</Label>
                <Input id="gas-date" type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gas-station">Gasolinera</Label>
                <Input id="gas-station" placeholder="Repsol, Cepsa, BP..." value={draft.station} onChange={(event) => setDraft((current) => ({ ...current, station: event.target.value }))} />
              </div>
              {isAdminView && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="gas-amount">Importe</Label>
                    <Input id="gas-amount" type="number" min="0" step="0.01" placeholder="0,00" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gas-liters">Litros / cantidad</Label>
                    <Input id="gas-liters" type="number" min="0" step="0.01" placeholder="Opcional" value={draft.liters} onChange={(event) => setDraft((current) => ({ ...current, liters: event.target.value }))} />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="gas-vehicle">Matrícula o vehículo</Label>
                <div className="relative">
                  <CarFront className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="gas-vehicle" className="pl-10" placeholder="7050 KCZ, Volvo 360..." value={draft.vehicle} onChange={(event) => setDraft((current) => ({ ...current, vehicle: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2 hide-on-simple">
                <Label htmlFor="gas-extra">Campo útil adicional</Label>
                <Input id="gas-extra" placeholder="Km, centro de coste, ruta..." value={draft.extraInfo} onChange={(event) => setDraft((current) => ({ ...current, extraInfo: event.target.value }))} />
              </div>
            </div>

            <div className="space-y-2 hide-on-simple">
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
                <Button onClick={handleSave}>{editingId ? <PencilLine className="h-4 w-4" /> : <FileText className="h-4 w-4" />}{editingId ? "Guardar cambios" : "Añadir gasto"}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default GasolineHubView;
