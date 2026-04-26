import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarRange, Clock3, ClipboardList, LayoutGrid, UserSquare2 } from "lucide-react";
import { differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  useDeleteHoliday,
  useDeleteVacationSlot,
  useHolidays,
  useRecentTimeEntries,
  useSaveHoliday,
  useSaveVacationSlot,
  useUpdateWorker,
  useVacationSlots,
  useWorkerYearSummaries,
  useWorkers,
} from "@/hooks/useVacationQueries";
import VacationClockingsSection from "./vacations/VacationClockingsSection";
import VacationGeneralCalendarSection from "./vacations/VacationGeneralCalendarSection";
import JourneysSection from "./vacations/JourneysSection";
import JourneysGrid from "./vacations/JourneysGrid";
import VacationGridSection from "./vacations/VacationGridSection";
import WorkerProfilesSection from "./vacations/WorkerProfilesSection";
import type { FichajeRow } from "./vacations/vacation-types";

const sections = [
  { key: "clockings", label: "Fichajes", icon: Clock3 },
  { key: "general", label: "Calendario general", icon: CalendarRange },
  { key: "vacations", label: "Vacaciones", icon: BriefcaseBusiness },
  { key: "excel", label: "Jornadas (planilla)", icon: ClipboardList },
  { key: "grid", label: "Jornadas (rejilla)", icon: LayoutGrid },
  { key: "workers", label: "Ficha por trabajador", icon: UserSquare2 },
] as const;

type SectionKey = (typeof sections)[number]["key"];

const VacationsJourneysView = () => {
  const [activeSection, setActiveSection] = useState<SectionKey>("clockings");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");

  const { data: workers = [], isError: workersError } = useWorkers();
  const { data: holidays = [], isError: holidaysError } = useHolidays();
  const { data: vacationSlots = [], isError: slotsError } = useVacationSlots();
  const { data: summaries = [], isError: summariesError } = useWorkerYearSummaries(2026);
  const { data: timeEntries = [], isError: entriesError } = useRecentTimeEntries(2000);

  const saveHolidayMutation = useSaveHoliday();
  const deleteHolidayMutation = useDeleteHoliday();
  const saveSlotMutation = useSaveVacationSlot();
  const deleteSlotMutation = useDeleteVacationSlot();
  const updateWorkerMutation = useUpdateWorker();

  useEffect(() => {
    if (workersError || holidaysError || slotsError || summariesError || entriesError) {
      toast.error("No se pudo cargar Vacaciones y Jornadas");
    }
  }, [workersError, holidaysError, slotsError, summariesError, entriesError]);

  useEffect(() => {
    if (!selectedWorkerId && workers[0]?.id) setSelectedWorkerId(workers[0].id);
  }, [selectedWorkerId, workers]);

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

  const saveHoliday = async (payload: { id?: string; date: string; type: (typeof holidays)[number]["type"]; label: string; color_hex: string }) => {
    try {
      await saveHolidayMutation.mutateAsync(payload);
      toast.success("Calendario actualizado");
    } catch {
      toast.error("No se pudo guardar el festivo");
    }
  };

  const deleteHoliday = async (holidayId: string) => {
    try {
      await deleteHolidayMutation.mutateAsync(holidayId);
      toast.success("Festivo eliminado");
    } catch {
      toast.error("No se pudo eliminar el festivo");
    }
  };

  const saveVacationSlot = async (payload: { worker_id: string; date: string; shift: "dia" | "tarde" | "noche"; id?: string }) => {
    const existing = vacationSlots.find((slot) => slot.worker_id === payload.worker_id && slot.date === payload.date && slot.shift === payload.shift);
    if (existing) {
      toast.success("La franja ya estaba asignada");
      return;
    }
    try {
      await saveSlotMutation.mutateAsync(payload);
      toast.success("Vacaciones actualizadas");
    } catch {
      toast.error("No se pudo guardar la franja");
    }
  };

  const deleteVacationSlot = async (slotId: string) => {
    try {
      await deleteSlotMutation.mutateAsync(slotId);
      toast.success("Franja liberada");
    } catch {
      toast.error("No se pudo quitar la franja");
    }
  };

  const updateWorker = async (workerId: string, payload: { display_name: string; color_hex: string }) => {
    try {
      await updateWorkerMutation.mutateAsync({ workerId, ...payload });
      toast.success("Trabajador actualizado");
    } catch {
      toast.error("No se pudo actualizar el trabajador");
    }
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
      {activeSection === "excel" ? <JourneysSection workers={workers} holidays={holidays} vacationSlots={vacationSlots} summaries={summaries} onOpenWorkerProfile={(workerId) => { setSelectedWorkerId(workerId); setActiveSection("workers"); }} /> : null}
      {activeSection === "grid" ? <JourneysGrid /> : null}
      {activeSection === "workers" ? <WorkerProfilesSection workers={workers} summaries={summaries} vacationSlots={vacationSlots} holidays={holidays} selectedWorkerId={selectedWorkerId} onSelectedWorkerChange={setSelectedWorkerId} /> : null}
    </div>
  );
};

export default VacationsJourneysView;
