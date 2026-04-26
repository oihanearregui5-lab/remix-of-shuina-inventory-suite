import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, PencilLine, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { HolidayItem, HolidayType, VacationViewMode } from "./vacation-types";
import {
  formatDayLabel,
  formatLongDate,
  formatMonthLabel,
  getDaysForView,
  getMonthMatrix,
  getNextAnchorDate,
  HOLIDAY_TYPE_OPTIONS,
  toDateKey,
  VIEW_LABELS,
} from "./vacation-utils";

interface Props {
  holidays: HolidayItem[];
  onSaveHoliday: (payload: { id?: string; date: string; type: HolidayType; label: string; color_hex: string }) => Promise<void>;
  onDeleteHoliday: (holidayId: string) => Promise<void>;
}

const VacationGeneralCalendarSection = ({ holidays, onSaveHoliday, onDeleteHoliday }: Props) => {
  const [viewMode, setViewMode] = useState<VacationViewMode>("month");
  const [anchorDate, setAnchorDate] = useState(new Date(2026, 0, 1));
  const [selectedDateKey, setSelectedDateKey] = useState<string>(toDateKey(new Date(2026, 0, 1)));
  const [editorLabel, setEditorLabel] = useState("");
  const [editorType, setEditorType] = useState<HolidayType>("festivo_nacional");
  const [editorColor, setEditorColor] = useState("#FF0000");
  const [editorOpen, setEditorOpen] = useState(false);

  const holidaysByDate = useMemo(() => new Map(holidays.map((holiday) => [holiday.date, holiday])), [holidays]);
  const selectedHoliday = holidaysByDate.get(selectedDateKey) ?? null;
  const visibleDays = useMemo(() => getDaysForView(anchorDate, viewMode), [anchorDate, viewMode]);

  const startEditingDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    const holiday = holidaysByDate.get(dateKey);
    setEditorLabel(holiday?.label ?? "");
    setEditorType(holiday?.type ?? "festivo_nacional");
    setEditorColor(holiday?.color_hex ?? "#FF0000");
    setEditorOpen(true);
  };

  const renderDayCell = (date: Date, compact = false) => {
    const dateKey = toDateKey(date);
    const holiday = holidaysByDate.get(dateKey);
    // Si hay holiday, aplicamos color personalizado en background con buen contraste de texto.
    const fallbackTone = date.getDay() === 0 || date.getDay() === 6 ? "bg-muted text-muted-foreground" : "bg-background text-foreground";
    const typeTone = holiday ? "" : fallbackTone;
    const selected = selectedDateKey === dateKey;

    const isOutsideMonth = viewMode === "month" && date.getMonth() !== anchorDate.getMonth();

    // Cálculo simple de luminosidad para decidir si el texto va negro o blanco
    const computeTextColor = (hex: string): string => {
      const m = hex.replace("#", "");
      const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      // Luminosidad relativa
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum > 0.6 ? "#1a1a1a" : "#ffffff";
    };

    const customStyle: React.CSSProperties | undefined = holiday
      ? { backgroundColor: holiday.color_hex, color: computeTextColor(holiday.color_hex) }
      : undefined;

    return (
      <button
        key={dateKey}
        type="button"
        title={holiday?.label ?? formatLongDate(date)}
        onClick={() => startEditingDate(dateKey)}
        style={customStyle}
        className={`rounded-lg border px-2 py-2 text-left transition-colors ${typeTone} ${selected ? "border-primary shadow-[var(--shadow-soft)]" : "border-border"} ${compact ? "min-h-[80px]" : "min-h-[112px]"} ${isOutsideMonth ? "opacity-35" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold">{date.getDate()}</span>
          {holiday ? <PencilLine className="h-3.5 w-3.5 opacity-70" /> : null}
        </div>
        <p className="mt-3 text-xs leading-5 break-words">{holiday?.label ?? ""}</p>
      </button>
    );
  };

  const handleSave = async () => {
    await onSaveHoliday({
      id: selectedHoliday?.id,
      date: selectedDateKey,
      type: editorType,
      label: editorLabel || HOLIDAY_TYPE_OPTIONS.find((option) => option.value === editorType)?.label || "Festivo",
      color_hex: editorColor,
    });
    setEditorOpen(false);
  };

  const handleTypeChange = (nextType: HolidayType) => {
    setEditorType(nextType);
    setEditorColor(HOLIDAY_TYPE_OPTIONS.find((option) => option.value === nextType)?.defaultColor ?? "#FF0000");
  };

  return (
    <>
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarDays className="h-4 w-4 text-primary" /> Calendario general</div>
            <p className="mt-1 text-sm text-muted-foreground">Festivos nacionales en rojo y cierres de fábrica en amarillo.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(VIEW_LABELS).map(([value, label]) => (
              <Button key={value} type="button" variant={viewMode === value ? "default" : "outline"} size="sm" onClick={() => setViewMode(value as VacationViewMode)}>{label}</Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" onClick={() => setAnchorDate(getNextAnchorDate(anchorDate, viewMode, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <div>
              <p className="text-sm font-semibold text-foreground">{viewMode === "year" ? anchorDate.getFullYear() : formatMonthLabel(anchorDate)}</p>
              <p className="text-xs text-muted-foreground">Año editable</p>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={() => setAnchorDate(getNextAnchorDate(anchorDate, viewMode, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Input type="number" className="w-[120px]" value={anchorDate.getFullYear()} onChange={(event) => setAnchorDate(new Date(Number(event.target.value) || 2026, anchorDate.getMonth(), 1))} />
        </div>

        {viewMode === "year" ? (
          <div className="grid gap-4 xl:grid-cols-4">
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const monthDate = new Date(anchorDate.getFullYear(), monthIndex, 1);
              const monthWeeks = getMonthMatrix(monthDate);
              return (
                <div key={monthIndex} className="rounded-lg border border-border bg-background p-3">
                  <p className="mb-3 text-sm font-semibold text-foreground">{formatMonthLabel(monthDate)}</p>
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
                    {["L", "M", "X", "J", "V", "S", "D"].map((day) => <span key={day}>{day}</span>)}
                  </div>
                  <div className="mt-2 space-y-1">
                    {monthWeeks.map((week, index) => (
                      <div key={index} className="grid grid-cols-7 gap-1">
                        {week.map((date) => <div key={date.toISOString()}>{renderDayCell(date, true)}</div>)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === "month" ? (
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <div key={day}>{day}</div>)}
            </div>
            {getMonthMatrix(anchorDate).map((week, index) => (
              <div key={index} className="grid grid-cols-7 gap-2">
                {week.map((date) => renderDayCell(date))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-7">
            {visibleDays.map((date) => (
              <div key={date.toISOString()} className="space-y-2 rounded-lg border border-border bg-background p-3">
                <p className="text-sm font-semibold text-foreground">{formatDayLabel(date)}</p>
                {renderDayCell(date, true)}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-destructive px-3 py-1 text-destructive-foreground">Festivo nacional</span>
          <span className="rounded-full bg-warning px-3 py-1 text-foreground">Cierre fábrica</span>
          <span className="rounded-full bg-accent px-3 py-1 text-accent-foreground">Festivo local</span>
          <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">Fin de semana</span>
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar día</DialogTitle>
            <DialogDescription>{selectedDateKey}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Tipo</span>
              <select value={editorType} onChange={(event) => handleTypeChange(event.target.value as HolidayType)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                {HOLIDAY_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Etiqueta</span>
              <Input value={editorLabel} onChange={(event) => setEditorLabel(event.target.value)} placeholder="Nombre del festivo" />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Color</span>
              <Input type="color" value={editorColor} onChange={(event) => setEditorColor(event.target.value)} className="h-10 p-1" />
            </label>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" disabled={!selectedHoliday} onClick={() => selectedHoliday && void onDeleteHoliday(selectedHoliday.id)}><Trash2 className="h-4 w-4" /> Eliminar festivo</Button>
            <Button onClick={() => void handleSave()}><Save className="h-4 w-4" /> Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VacationGeneralCalendarSection;
