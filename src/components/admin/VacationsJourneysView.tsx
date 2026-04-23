import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarRange, Clock3, ClipboardList, UserSquare2 } from "lucide-react";
import { differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import VacationClockingsSection from "./vacations/VacationClockingsSection";
import VacationGeneralCalendarSection from "./vacations/VacationGeneralCalendarSection";
import VacationGridSection from "./vacations/VacationGridSection";
import WorkerProfilesSection from "./vacations/WorkerProfilesSection";
import type { FichajeRow, HolidayItem, ShiftSlot, TimeEntryItem, VacationSlotItem, WorkerItem, WorkerYearSummaryItem } from "./vacations/vacation-types";

const sections = [
  { key: "clockings", label: "Fichajes", icon: Clock3 },
  { key: "general", label: "Calendario general", icon: CalendarRange },
  { key: "vacations", label: "Vacaciones", icon: BriefcaseBusiness },
  { key: "excel", label: "Jornadas", icon: ClipboardList },
  { key: "workers", label: "Ficha por trabajador", icon: UserSquare2 },
] as const;

type SectionKey = (typeof sections)[number]["key"];

const VacationsJourneysView = () => {
  const [activeSection, setActiveSection] = useState<SectionKey>("clockings");
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [vacationSlots, setVacationSlots] = useState<VacationSlotItem[]>([]);
  const [summaries, setSummaries] = useState<WorkerYearSummaryItem[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryItem[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");

  const loadData = async () => {
    const [workersRes, holidaysRes, slotsRes, summariesRes, entriesRes] = await Promise.all([
      supabase.from("workers").select("id, name, display_name, color_hex, shift_default, annual_contract_hours, company_vacation_hours, worker_vacation_days, total_annual_hours, extra_vacation_days, extra_vacation_reason, linked_user_id, is_active").eq("is_active", true).order("display_name"),
      supabase.from("holidays").select("id, date, type, label, color_hex").order("date"),
      supabase.from("vacation_slots").select("id, worker_id, date, shift, note").order("date"),
      supabase.from("worker_year_summary").select("worker_id, year, total_annual_hours, worked_hours, remaining_hours, vacation_days_total, vacation_days_used, extra_days").eq("year", 2026),
      supabase.from("time_entries").select("id, user_id, clock_in, clock_out, notes, created_at").order("clock_in", { ascending: false }).limit(2000),
    ]);

    if (workersRes.error || holidaysRes.error || slotsRes.error || summariesRes.error || entriesRes.error) {
      toast.error("No se pudo cargar Vacaciones y Jornadas");
      return;
    }

    setWorkers((workersRes.data as WorkerItem[]) ?? []);
    setHolidays((holidaysRes.data as HolidayItem[]) ?? []);
    setVacationSlots((slotsRes.data as VacationSlotItem[]) ?? []);
    setSummaries((summariesRes.data as WorkerYearSummaryItem[]) ?? []);
    setTimeEntries((entriesRes.data as TimeEntryItem[]) ?? []);

    const nextWorkers = (workersRes.data as WorkerItem[]) ?? [];
    if (!selectedWorkerId && nextWorkers[0]?.id) {
      setSelectedWorkerId(nextWorkers[0].id);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const clockingRows = useMemo<FichajeRow[]>(() => {
    const workersByUserId = new Map(workers.filter((worker) => worker.linked_user_id).map((worker) => [worker.linked_user_id as string, worker]));
    return timeEntries.map((entry) => {
      const worker = workersByUserId.get(entry.user_id) ?? null;
      const hours = entry.clock_out ? Math.max(0, differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in)) / 60) : 0;
      return {
        ...entry,
        worker_id: worker?.id ?? null,
        worker_name: worker?.display_name ?? "Sin vincular",
        hours,
        source: "app",
      };
    });
  }, [timeEntries, workers]);

  const saveHoliday = async (payload: { id?: string; date: string; type: HolidayItem["type"]; label: string; color_hex: string }) => {
    const request = payload.id
      ? supabase.from("holidays").update(payload).eq("id", payload.id)
      : supabase.from("holidays").insert(payload);
    const { error } = await request;
    if (error) {
      toast.error("No se pudo guardar el festivo");
      return;
    }
    toast.success("Calendario actualizado");
    void loadData();
  };

  const deleteHoliday = async (holidayId: string) => {
    const { error } = await supabase.from("holidays").delete().eq("id", holidayId);
    if (error) {
      toast.error("No se pudo eliminar el festivo");
      return;
    }
    toast.success("Festivo eliminado");
    void loadData();
  };

  const saveVacationSlot = async (payload: { worker_id: string; date: string; shift: ShiftSlot; id?: string }) => {
    const existing = vacationSlots.find((slot) => slot.worker_id === payload.worker_id && slot.date === payload.date && slot.shift === payload.shift);
    if (existing) {
      toast.success("La franja ya estaba asignada");
      return;
    }
    const { error } = await supabase.from("vacation_slots").insert({ worker_id: payload.worker_id, date: payload.date, shift: payload.shift });
    if (error) {
      toast.error("No se pudo guardar la franja");
      return;
    }
    toast.success("Vacaciones actualizadas");
    void loadData();
  };

  const deleteVacationSlot = async (slotId: string) => {
    const { error } = await supabase.from("vacation_slots").delete().eq("id", slotId);
    if (error) {
      toast.error("No se pudo quitar la franja");
      return;
    }
    toast.success("Franja liberada");
    void loadData();
  };

  const updateWorker = async (workerId: string, payload: { display_name: string; color_hex: string }) => {
    const { error } = await supabase.from("workers").update(payload).eq("id", workerId);
    if (error) {
      toast.error("No se pudo actualizar el trabajador");
      return;
    }
    toast.success("Trabajador actualizado");
    void loadData();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader eyebrow="Administración" title="Vacaciones y Jornadas" description="Calendario editable, fichajes descargables y control anual por trabajador." />

      <section className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Button key={section.key} type="button" variant={activeSection === section.key ? "default" : "outline"} onClick={() => setActiveSection(section.key)}>
              <Icon className="h-4 w-4" /> {section.label}
            </Button>
          );
        })}
      </section>

      {activeSection === "clockings" ? <VacationClockingsSection rows={clockingRows} workers={workers} /> : null}
      {activeSection === "general" ? <VacationGeneralCalendarSection holidays={holidays} onSaveHoliday={saveHoliday} onDeleteHoliday={deleteHoliday} /> : null}
      {activeSection === "vacations" ? <VacationGridSection workers={workers} holidays={holidays} vacationSlots={vacationSlots} onSaveVacationSlot={saveVacationSlot} onDeleteVacationSlot={deleteVacationSlot} onUpdateWorker={updateWorker} /> : null}
      {activeSection === "excel" ? <VacationGridSection workers={workers} holidays={holidays} vacationSlots={vacationSlots} onSaveVacationSlot={saveVacationSlot} onDeleteVacationSlot={deleteVacationSlot} onUpdateWorker={updateWorker} mode="journeys" onOpenWorkerProfile={(workerId) => { setSelectedWorkerId(workerId); setActiveSection("workers"); }} /> : null}
      {activeSection === "workers" ? <WorkerProfilesSection workers={workers} summaries={summaries} vacationSlots={vacationSlots} holidays={holidays} selectedWorkerId={selectedWorkerId} onSelectedWorkerChange={setSelectedWorkerId} /> : null}
    </div>
  );
};

export default VacationsJourneysView;
