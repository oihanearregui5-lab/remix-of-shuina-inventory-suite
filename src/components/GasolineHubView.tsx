import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CarFront,
  CreditCard,
  Fuel,
  History,
  PencilLine,
  Plus,
  Settings2,
  Wallet,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FuelCard {
  id: string;
  alias: string; // matrícula
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
  kilometers: number | null;
  vehicle: string | null;
  observations: string | null;
  receipt_photo_path: string | null;
  receipt_photo_name: string | null;
  created_by_user_id: string;
  created_at: string;
}
interface FuelRecharge {
  id: string;
  amount_eur: number;
  recharge_date: string;
  notes: string | null;
  created_by_user_id: string;
  created_at: string;
  author_name?: string;
}
interface BalanceInfo {
  current_balance: number;
  last_recharge_date: string | null;
  last_recharge_amount: number | null;
  is_below_threshold: boolean;
  is_negative: boolean;
  threshold: number;
}

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

interface GasolineHubViewProps {
  isAdminView?: boolean;
}

const emptyDraft = (cardId: string) => ({
  card_id: cardId,
  record_date: format(new Date(), "yyyy-MM-dd"),
  station: "",
  amount: "",
  liters: "",
  kilometers: "",
  observations: "",
});

const GasolineHubView = ({ isAdminView = false }: GasolineHubViewProps) => {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const showAdmin = isAdminView && isAdmin;

  // ----- queries -----
  const { data: cards = [] } = useQuery({
    queryKey: ["fuel_cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fuel_cards")
        .select("id, alias, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order")
        .order("alias");
      if (error) throw error;
      return (data ?? []) as FuelCard[];
    },
  });

  const { data: records = [] } = useQuery({
    queryKey: ["fuel_records", showAdmin ? "all" : user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fuel_records")
        .select("id, card_id, record_date, station, amount, liters, kilometers, vehicle, observations, receipt_photo_path, receipt_photo_name, created_by_user_id, created_at")
        .order("record_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as FuelRecord[];
    },
  });

  const { data: balance } = useQuery({
    queryKey: ["fuel_balance"],
    enabled: showAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_fuel_balance");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as BalanceInfo;
    },
  });

  const { data: recharges = [] } = useQuery({
    queryKey: ["fuel_recharges"],
    enabled: showAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fuel_recharges")
        .select("id, amount_eur, recharge_date, notes, created_by_user_id, created_at")
        .order("recharge_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      const list = (data ?? []) as FuelRecharge[];
      const ids = Array.from(new Set(list.map((r) => r.created_by_user_id)));
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
        const map = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));
        list.forEach((r) => { r.author_name = map.get(r.created_by_user_id) ?? "—"; });
      }
      return list;
    },
  });

  // ----- state -----
  const [refuelOpen, setRefuelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => emptyDraft(""));
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeDraft, setRechargeDraft] = useState({ amount_eur: "", recharge_date: format(new Date(), "yyyy-MM-dd"), notes: "" });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [thresholdDraft, setThresholdDraft] = useState("500");

  useEffect(() => {
    if (balance?.threshold != null) setThresholdDraft(String(balance.threshold));
  }, [balance?.threshold]);

  // Selección automática de tarjeta si solo es worker
  useEffect(() => {
    if (!draft.card_id && cards.length > 0) {
      setDraft((d) => ({ ...d, card_id: cards[0].id }));
    }
  }, [cards, draft.card_id]);

  // ----- mutations -----
  const saveRefuel = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No autenticado");
      if (!draft.card_id) throw new Error("Selecciona la matrícula");
      const amount = Number(draft.amount.replace(",", "."));
      const liters = draft.liters ? Number(draft.liters.replace(",", ".")) : null;
      const km = draft.kilometers ? parseInt(draft.kilometers, 10) : null;
      if (!draft.record_date) throw new Error("Indica la fecha");
      if (!draft.station.trim()) throw new Error("Indica la gasolinera");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Importe inválido");

      let receiptPath: string | null = null;
      let receiptName: string | null = null;
      if (receiptFile) {
        const ext = receiptFile.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("fuel-receipts").upload(path, receiptFile, { upsert: false });
        if (upErr) throw upErr;
        receiptPath = path;
        receiptName = receiptFile.name;
      }

      const card = cards.find((c) => c.id === draft.card_id);
      const payload = {
        card_id: draft.card_id,
        record_date: draft.record_date,
        station: draft.station.trim(),
        amount,
        liters,
        kilometers: km,
        vehicle: card?.alias ?? null,
        observations: draft.observations.trim() || null,
        receipt_photo_path: receiptPath,
        receipt_photo_name: receiptName,
      };

      if (editingId) {
        const { error } = await supabase.from("fuel_records").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fuel_records").insert({ ...payload, created_by_user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      toast.success(editingId ? "Repostaje actualizado" : "Repostaje registrado");
      setRefuelOpen(false);
      setEditingId(null);
      setReceiptFile(null);
      setDraft(emptyDraft(cards[0]?.id ?? ""));
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["fuel_records"] }),
        qc.invalidateQueries({ queryKey: ["fuel_balance"] }),
      ]);
      // Comprobar alarma post-insert
      if (isAdmin) {
        const { data } = await supabase.rpc("get_fuel_balance");
        const row: BalanceInfo | undefined = Array.isArray(data) ? data[0] : data;
        if (row?.is_negative) {
          await supabase.from("notifications").insert({
            user_id: user!.id,
            kind: "fuel_alert",
            title: "Saldo de gasolina negativo",
            body: `Saldo actual: ${fmtEUR(Number(row.current_balance))}. Recarga inmediata.`,
            link: "gasoline",
          });
        } else if (row?.is_below_threshold) {
          await supabase.from("notifications").insert({
            user_id: user!.id,
            kind: "fuel_alert",
            title: "Saldo de gasolina bajo",
            body: `Quedan ${fmtEUR(Number(row.current_balance))} (umbral ${fmtEUR(row.threshold)}).`,
            link: "gasoline",
          });
        }
      }
    },
    onError: (err: any) => toast.error(err.message ?? "Error al guardar"),
  });

  const saveRecharge = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No autenticado");
      const amount = Number(rechargeDraft.amount_eur.replace(",", "."));
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Importe inválido");
      const { error } = await supabase.from("fuel_recharges").insert({
        amount_eur: amount,
        recharge_date: new Date(rechargeDraft.recharge_date + "T12:00:00").toISOString(),
        notes: rechargeDraft.notes.trim() || null,
        created_by_user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Recarga registrada");
      setRechargeOpen(false);
      setRechargeDraft({ amount_eur: "", recharge_date: format(new Date(), "yyyy-MM-dd"), notes: "" });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["fuel_recharges"] }),
        qc.invalidateQueries({ queryKey: ["fuel_balance"] }),
      ]);
    },
    onError: (err: any) => toast.error(err.message ?? "Error"),
  });

  const saveThreshold = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No autenticado");
      const t = parseInt(thresholdDraft, 10);
      if (!Number.isFinite(t) || t < 0) throw new Error("Umbral inválido");
      const { error } = await supabase.from("fuel_settings").update({
        threshold_warning: t,
        updated_at: new Date().toISOString(),
        updated_by_user_id: user.id,
      }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Umbral actualizado");
      setSettingsOpen(false);
      await qc.invalidateQueries({ queryKey: ["fuel_balance"] });
    },
    onError: (err: any) => toast.error(err.message ?? "Error"),
  });

  // ----- derived per card -----
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const cardSummaries = useMemo(() => cards.map((card) => {
    const cardRecs = records.filter((r) => r.card_id === card.id);
    const monthTotal = cardRecs
      .filter((r) => r.record_date.startsWith(monthPrefix))
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const last = cardRecs[0];
    return { card, monthTotal, count: cardRecs.length, lastDate: last?.record_date ?? null };
  }), [cards, records, monthPrefix]);

  // ----- handlers -----
  const openNewRefuel = (cardId?: string) => {
    setEditingId(null);
    setReceiptFile(null);
    setDraft(emptyDraft(cardId ?? cards[0]?.id ?? ""));
    setRefuelOpen(true);
  };

  const openEditRefuel = (rec: FuelRecord) => {
    setEditingId(rec.id);
    setReceiptFile(null);
    setDraft({
      card_id: rec.card_id,
      record_date: rec.record_date,
      station: rec.station,
      amount: String(rec.amount ?? ""),
      liters: rec.liters != null ? String(rec.liters) : "",
      kilometers: rec.kilometers != null ? String(rec.kilometers) : "",
      observations: rec.observations ?? "",
    });
    setRefuelOpen(true);
  };

  const balanceColor = balance?.is_negative
    ? "text-destructive"
    : balance?.is_below_threshold
    ? "text-amber-600 dark:text-amber-400"
    : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow={showAdmin ? "Administración" : "Operativa"}
        title="Gasolina"
        description={showAdmin ? "Saldo común de la cuenta de combustible, recargas y repostajes por matrícula." : "Registra el repostaje de tu vehículo."}
        actions={<Button onClick={() => openNewRefuel()}><Fuel className="h-4 w-4" /> Registrar repostaje</Button>}
      />

      {/* Banner de alarma */}
      {showAdmin && balance && (balance.is_negative || balance.is_below_threshold) ? (
        <Alert variant={balance.is_negative ? "destructive" : "default"} className={cn(!balance.is_negative && "border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200")}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{balance.is_negative ? "Saldo negativo" : "Saldo bajo"}</AlertTitle>
          <AlertDescription>
            {balance.is_negative
              ? `El saldo común está en ${fmtEUR(Number(balance.current_balance))}. Recarga inmediata.`
              : `Quedan ${fmtEUR(Number(balance.current_balance))} en la cuenta común (umbral ${fmtEUR(balance.threshold)}).`}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Saldo común */}
      {showAdmin && (
        <Card className="border-border/80 shadow-[var(--shadow-soft)]">
          <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Wallet className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo común</p>
                <p className={cn("text-3xl font-extrabold", balanceColor)}>
                  {balance ? fmtEUR(Number(balance.current_balance)) : "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {balance?.last_recharge_date
                    ? `Última recarga: ${format(new Date(balance.last_recharge_date), "dd MMM yyyy", { locale: es })} · ${fmtEUR(Number(balance.last_recharge_amount ?? 0))}`
                    : "Aún no hay recargas registradas"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Button onClick={() => setRechargeOpen(true)}><Plus className="h-4 w-4" /> Recargar saldo</Button>
              <Button variant="outline" onClick={() => setSettingsOpen(true)}><Settings2 className="h-4 w-4" /> Umbral</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tarjetas (matrículas) */}
      <section className="panel-surface p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Tarjetas / Matrículas</p>
            <p className="text-[11px] text-muted-foreground">{cards.length} vehículos · pulsa una para registrar repostaje</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {cardSummaries.map(({ card, monthTotal, count, lastDate }) => (
            <button
              key={card.id}
              type="button"
              onClick={() => openNewRefuel(card.id)}
              className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex w-full items-start justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/25 text-secondary-foreground">
                  <CarFront className="h-4 w-4" />
                </div>
                {showAdmin && (
                  <Badge variant="secondary" className="text-[10px]">{fmtEUR(monthTotal)}</Badge>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-bold text-foreground">{card.alias}</p>
                <p className="text-[10px] text-muted-foreground">{count} repostaje{count === 1 ? "" : "s"} · {lastDate ?? "sin uso"}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Lista de repostajes */}
      <Card className="border-border/80 shadow-[var(--shadow-soft)]">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg"><History className="h-5 w-5 text-primary" /> {showAdmin ? "Repostajes" : "Mis repostajes"}</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <EmptyState icon={Fuel} title="Sin repostajes todavía" description="Registra tu primer repostaje desde el botón superior." />
          ) : (
            <div className="space-y-2">
              {records.slice(0, 50).map((r) => {
                const card = cards.find((c) => c.id === r.card_id);
                const ownsRecord = r.created_by_user_id === user?.id;
                return (
                  <article key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-muted text-foreground">
                        <Fuel className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">
                          <span className="font-mono text-sm">{card?.alias ?? "—"}</span>
                          <span className="ml-2 text-xs font-normal text-muted-foreground">{r.station}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <CalendarDays className="mr-1 inline h-3 w-3" />
                          {format(new Date(r.record_date), "dd MMM yyyy", { locale: es })}
                          {r.liters ? ` · ${r.liters} L` : ""}
                          {r.kilometers ? ` · ${r.kilometers} km` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">{fmtEUR(Number(r.amount))}</span>
                      {(showAdmin || ownsRecord) && (
                        <Button size="sm" variant="ghost" onClick={() => openEditRefuel(r)}>
                          <PencilLine className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de recargas (admin) */}
      {showAdmin && (
        <Card className="border-border/80 shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Plus className="h-5 w-5 text-primary" /> Histórico de recargas</CardTitle>
          </CardHeader>
          <CardContent>
            {recharges.length === 0 ? (
              <EmptyState icon={Wallet} title="Sin recargas todavía" description="Cuando registres una recarga, aparecerá aquí." />
            ) : (
              <div className="space-y-2">
                {recharges.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background p-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">+ {fmtEUR(Number(r.amount_eur))}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(r.recharge_date), "dd MMM yyyy HH:mm", { locale: es })} · {r.author_name}
                      </p>
                      {r.notes ? <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diálogo: Registrar repostaje */}
      <Dialog open={refuelOpen} onOpenChange={setRefuelOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar repostaje" : "Registrar repostaje"}</DialogTitle>
            <DialogDescription>Completa los datos del repostaje. Los kilómetros son opcionales.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Matrícula</Label>
              <Select value={draft.card_id} onValueChange={(v) => setDraft((d) => ({ ...d, card_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona matrícula" /></SelectTrigger>
                <SelectContent>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.alias}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input type="date" value={draft.record_date} onChange={(e) => setDraft((d) => ({ ...d, record_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Gasolinera</Label>
                {(() => {
                  const STATIONS = ["Repsol", "Cepsa", "BP", "Shell", "Galp", "Petronor", "Avia", "Plenoil"];
                  const isOther = draft.station !== "" && !STATIONS.includes(draft.station);
                  const selectValue = draft.station === "" ? "" : isOther ? "__other__" : draft.station;
                  return (
                    <>
                      <Select
                        value={selectValue}
                        onValueChange={(v) => setDraft((d) => ({ ...d, station: v === "__other__" ? (isOther ? d.station : "") : v }))}
                      >
                        <SelectTrigger className="h-12"><SelectValue placeholder="Elige gasolinera" /></SelectTrigger>
                        <SelectContent className="z-[100]">
                          {STATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          <SelectItem value="__other__">Otra…</SelectItem>
                        </SelectContent>
                      </Select>
                      {(isOther || selectValue === "__other__") && (
                        <Input
                          className="mt-2 h-12"
                          value={draft.station}
                          onChange={(e) => setDraft((d) => ({ ...d, station: e.target.value }))}
                          placeholder="Escribe el nombre"
                        />
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="space-y-1.5">
                <Label>Litros</Label>
                <Input type="number" inputMode="decimal" step="0.01" value={draft.liters} onChange={(e) => setDraft((d) => ({ ...d, liters: e.target.value }))} placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label>Importe (€)</Label>
                <Input type="number" inputMode="decimal" step="0.01" value={draft.amount} onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))} placeholder="0,00" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Kilómetros del vehículo</Label>
                <Input type="number" inputMode="numeric" value={draft.kilometers} onChange={(e) => setDraft((d) => ({ ...d, kilometers: e.target.value }))} placeholder="Opcional" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Foto del ticket</Label>
              <div className="relative">
                <Camera className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-10" type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea rows={2} value={draft.observations} onChange={(e) => setDraft((d) => ({ ...d, observations: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefuelOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveRefuel.mutate()} disabled={saveRefuel.isPending}>
              {saveRefuel.isPending ? "Guardando…" : editingId ? "Guardar cambios" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Recargar saldo */}
      <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recargar saldo</DialogTitle>
            <DialogDescription>Registra el importe que se ha ingresado en la cuenta común.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Importe (€)</Label>
              <Input type="number" step="0.01" value={rechargeDraft.amount_eur} onChange={(e) => setRechargeDraft((d) => ({ ...d, amount_eur: e.target.value }))} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={rechargeDraft.recharge_date} onChange={(e) => setRechargeDraft((d) => ({ ...d, recharge_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea rows={2} value={rechargeDraft.notes} onChange={(e) => setRechargeDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechargeOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveRecharge.mutate()} disabled={saveRecharge.isPending}>
              {saveRecharge.isPending ? "Guardando…" : "Registrar recarga"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Configurar umbral */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Umbral de alarma</DialogTitle>
            <DialogDescription>Cuando el saldo común baje de este importe, se mostrará una alarma.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Umbral (€)</Label>
            <Input type="number" min="0" value={thresholdDraft} onChange={(e) => setThresholdDraft(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveThreshold.mutate()} disabled={saveThreshold.isPending}>
              {saveThreshold.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GasolineHubView;
