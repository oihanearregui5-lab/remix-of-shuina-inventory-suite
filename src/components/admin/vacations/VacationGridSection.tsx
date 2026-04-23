import { useMemo, useState } from "react";
import { CalendarRange, Pencil, Save, Trash2, Users2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { HolidayItem, ShiftSlot, VacationSlotItem, VacationViewMode, WorkerItem } from "./vacation-types";
import { getContrastTextColor, getDaysForView, getNextAnchorDate, SHIFT_LABELS, toDateKey, VIEW_LABELS } from "./vacation-utils";

interface Props {
  workers: WorkerItem[];
  holidays: HolidayItem[];
  vacationSlots: VacationSlotItem[];
  onSaveVacationSlot: (payload: { worker_id: string; date: string; shift: ShiftSlot; id?: string }) => Promise<void>;
  onDeleteVacationSlot: (slotId: string) => Promise<void>;
  onUpdateWorker: (workerId: string, payload: { display_name: string; color_hex: string }) => Promise<void>;
}

const shiftOrder: ShiftSlot[] = ["dia", "tarde", "noche"];

const VacationGridSection = ({ workers, holidays, vacationSlots, onSaveVacationSlot, onDeleteVacationSlot, onUpdateWorker }: Props) => {
  const [viewMode, setViewMode] = useState<VacationViewMode>("month");
  const [anchorDate, setAnchorDate] = useState(new Date(2026, 0, 1));
  const [selectedCell, setSelectedCell] = useState<{ date: string; shift: ShiftSlot; workerId: string | null; slotId?: string } | null>(null);
  const [workerDraftId, setWorkerDraftId] = useState<string>(workers[0]?.id ?? "");
  const workerDraft = workers.find((worker) => worker.id === workerDraftId) ?? workers[0] ?? null;
  const [workerNameDraft, setWorkerNameDraft] = useState(workerDraft?.display_name ?? "");
  const [workerColorDraft, setWorkerColorDraft] = useState(workerDraft?.color_hex ?? "#1F77B4");

  const days = useMemo(() => getDaysForView(anchorDate, viewMode === "year" ? "year" : viewMode), [anchorDate, viewMode]);
  const slotsByKey = useMemo(() => new Map(vacationSlots.map((slot) => [`${slot.date}-${slot.shift}-${slot.worker_id}`, slot])), [vacationSlots]);
  const holidaysByDate = useMemo(() => new Map(holidays.map((holiday) => [holiday.date, holiday])), [holidays]);

  const selectedSlot = selectedCell?.workerId ? slotsByKey.get(`${selectedCell.date}-${selectedCell.shift}-${selectedCell.workerId}`) ?? null : null;

  const selectWorkerToEdit = (workerId: string) => {
    const worker = workers.find((item) => item.id === workerId);
    setWorkerDraftId(workerId);
    setWorkerNameDraft(worker?.display_name ?? "");
    setWorkerColorDraft(worker?.color_hex ?? "#1F77B4");
  };

  const renderShiftCell = (dateKey: string, shift: ShiftSlot, worker: WorkerItem, compact = false) => {
    const slot = slotsByKey.get(`${dateKey}-${shift}-${worker.id}`);
    const holiday = holidaysByDate.get(dateKey);
    const backgroundColor = slot ? worker.color_hex : undefined;
    const color = slot ? getContrastTextColor(worker.color_hex) : undefined;

    return (
      <button
        key={`${dateKey}-${shift}-${worker.id}`}
        type="button"
        onClick={() => setSelectedCell({ date: dateKey, shift, workerId: slot ? worker.id : worker.id, slotId: slot?.id })}
        className={`flex min-h-[${compact ? "36" : "42"}px] items-center justify-center border text-[11px] font-semibold transition-colors ${slot ? "" : "bg-background text-muted-foreground hover:bg-muted/70"}`}
        style={{ backgroundColor, color, borderColor: holiday?.type === "festivo_nacional" ? "hsl(var(--destructive))" : holiday?.type === "cierre_fabrica" ? "hsl(var(--warning))" : undefined }}
        title={`${worker.display_name} · ${SHIFT_LABELS[shift]} · ${dateKey}`}
      >
        {slot ? worker.display_name.slice(0, compact ? 1 : 3).toUpperCase() : SHIFT_LABELS[shift].slice(0, 1)}
      </button>
    );
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.55fr_0.45fr]">
      <section className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarRange className="h-4 w-4 text-primary" /> Rejilla de vacaciones</div>
            <p className="mt-1 text-sm text-muted-foreground">Cada día se divide en Día, Tarde y Noche con el color del trabajador.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(VIEW_LABELS).map(([value, label]) => <Button key={value} type="button" variant={viewMode === value ? "default" : "outline"} size="sm" onClick={() => setViewMode(value as VacationViewMode)}>{label}</Button>)}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setAnchorDate(getNextAnchorDate(anchorDate, viewMode === "year" ? "year" : viewMode, -1))}>Anterior</Button>
            <p className="text-sm font-semibold text-foreground">{viewMode === "year" ? anchorDate.getFullYear() : format(anchorDate, "MMMM yyyy")}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setAnchorDate(getNextAnchorDate(anchorDate, viewMode === "year" ? "year" : viewMode, 1))}>Siguiente</Button>
          </div>
          <p className="text-xs text-muted-foreground">Bordes rojos = festivo nacional · bordes amarillos = cierre fábrica</p>
        </div>

        {viewMode === "year" ? (
          <div className="overflow-x-auto">
            <div className="min-w-[980px] space-y-2">
              {workers.map((worker) => (
                <div key={worker.id} className="grid grid-cols-[180px_1fr] gap-2">
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                    <span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: worker.color_hex }} />
                    <span className="text-sm font-semibold text-foreground">{worker.display_name}</span>
                  </div>
                  <div className="grid grid-cols-[repeat(365,minmax(0,1fr))] gap-px rounded-lg border border-border bg-border p-px">
                    {days.map((date) => {
                      const dateKey = toDateKey(date);
                      const hasAny = shiftOrder.some((shift) => slotsByKey.has(`${dateKey}-${shift}-${worker.id}`));
                      return <div key={`${worker.id}-${dateKey}`} className="h-6" style={{ backgroundColor: hasAny ? worker.color_hex : "hsl(var(--background))" }} title={`${worker.display_name} · ${dateKey}`} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[980px] rounded-lg border border-border bg-background">
              <div className="grid border-b border-border" style={{ gridTemplateColumns: `160px repeat(${workers.length}, minmax(108px, 1fr))` }}>
                <div className="border-r border-border px-3 py-3 text-sm font-semibold text-foreground">Día</div>
                {workers.map((worker) => (
                  <div key={worker.id} className="border-r border-border px-2 py-2 text-center last:border-r-0">
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-foreground">
                      <span className="h-2.5 w-2.5 rounded-full border border-border" style={{ backgroundColor: worker.color_hex }} />
                      {worker.display_name}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-px text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {shiftOrder.map((shift) => <span key={shift}>{SHIFT_LABELS[shift].slice(0, 1)}</span>)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="max-h-[640px] overflow-auto">
                {days.map((date) => {
                  const dateKey = toDateKey(date);
                  const holiday = holidaysByDate.get(dateKey);
                  return (
                    <div key={dateKey} className="grid border-b border-border last:border-b-0" style={{ gridTemplateColumns: `160px repeat(${workers.length}, minmax(108px, 1fr))` }}>
                      <div className="border-r border-border px-3 py-3 text-sm">
                        <p className="font-semibold text-foreground">{format(date, "EEE d")}</p>
                        <p className="text-xs text-muted-foreground">{holiday?.label ?? "Laborable"}</p>
                      </div>
                      {workers.map((worker) => (
                        <div key={`${worker.id}-${dateKey}`} className="grid grid-cols-3 border-r border-border last:border-r-0">
                          {shiftOrder.map((shift) => renderShiftCell(dateKey, shift, worker, viewMode === "week"))}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Pencil className="h-4 w-4 text-primary" /> Editor de franja</div>
          {selectedCell ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="font-semibold text-foreground">{selectedCell.date}</p>
                <p className="text-muted-foreground">{SHIFT_LABELS[selectedCell.shift]}</p>
              </div>
              <label className="block space-y-1">
                <span className="text-muted-foreground">Trabajador</span>
                <select value={selectedCell.workerId ?? ""} onChange={(event) => setSelectedCell((current) => current ? { ...current, workerId: event.target.value } : current)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                  {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.display_name}</option>)}
                </select>
              </label>
              <Button className="w-full" onClick={() => selectedCell.workerId && void onSaveVacationSlot({ worker_id: selectedCell.workerId, date: selectedCell.date, shift: selectedCell.shift, id: selectedSlot?.id })}><Save className="h-4 w-4" /> Guardar vacaciones</Button>
              <Button className="w-full" variant="outline" disabled={!selectedSlot} onClick={() => selectedSlot && void onDeleteVacationSlot(selectedSlot.id)}><Trash2 className="h-4 w-4" /> Quitar vacaciones</Button>
            </div>
          ) : <p className="text-sm text-muted-foreground">Selecciona una subcelda para editar la franja.</p>}
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Users2 className="h-4 w-4 text-primary" /> Leyenda de trabajadores</div>
          <div className="space-y-2">
            {workers.map((worker) => (
              <button key={worker.id} type="button" onClick={() => selectWorkerToEdit(worker.id)} className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground"><span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: worker.color_hex }} /> {worker.display_name}</span>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>

          {workerDraft ? (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground">Editar trabajador</p>
              <Input value={workerNameDraft} onChange={(event) => setWorkerNameDraft(event.target.value)} placeholder="Nombre visible" />
              <Input type="color" value={workerColorDraft} onChange={(event) => setWorkerColorDraft(event.target.value)} className="h-10 p-1" />
              <Button className="w-full" onClick={() => void onUpdateWorker(workerDraft.id, { display_name: workerNameDraft, color_hex: workerColorDraft })}><Save className="h-4 w-4" /> Actualizar ficha</Button>
            </div>
          ) : null}
        </section>
      </aside>
    </div>
  );
};

export default VacationGridSection;
