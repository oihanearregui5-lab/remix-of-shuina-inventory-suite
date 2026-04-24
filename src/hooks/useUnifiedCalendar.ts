import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UnifiedEventCategory =
  | "task"
  | "vacation"
  | "machine_itv"
  | "machine_inspection"
  | "holiday"
  | "company_calendar";

export interface UnifiedCalendarEvent {
  id: string;
  category: UnifiedEventCategory;
  title: string;
  date: string; // ISO yyyy-mm-dd
  endDate?: string;
  meta?: {
    priority?: string;
    status?: string;
    workerName?: string;
    machineName?: string;
    shift?: string;
    notes?: string | null;
    color?: string | null;
  };
}

const CATEGORY_COLORS: Record<UnifiedEventCategory, { bg: string; fg: string; label: string }> = {
  task: { bg: "bg-blue-500/15", fg: "text-blue-700 dark:text-blue-300", label: "Tarea" },
  vacation: { bg: "bg-emerald-500/15", fg: "text-emerald-700 dark:text-emerald-300", label: "Vacaciones" },
  machine_itv: { bg: "bg-amber-500/15", fg: "text-amber-700 dark:text-amber-300", label: "ITV" },
  machine_inspection: { bg: "bg-orange-500/15", fg: "text-orange-700 dark:text-orange-300", label: "Inspección" },
  holiday: { bg: "bg-rose-500/15", fg: "text-rose-700 dark:text-rose-300", label: "Festivo" },
  company_calendar: { bg: "bg-violet-500/15", fg: "text-violet-700 dark:text-violet-300", label: "Calendario" },
};

export const getCategoryStyle = (category: UnifiedEventCategory) => CATEGORY_COLORS[category];

interface UseUnifiedCalendarOptions {
  rangeStart: Date;
  rangeEnd: Date;
}

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

export const useUnifiedCalendar = ({ rangeStart, rangeEnd }: UseUnifiedCalendarOptions) => {
  const { user } = useAuth();
  const startISO = toISODate(rangeStart);
  const endISO = toISODate(rangeEnd);

  return useQuery<UnifiedCalendarEvent[]>({
    queryKey: ["unified-calendar", startISO, endISO, user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const events: UnifiedCalendarEvent[] = [];

      // 1. Tasks with due_date in range
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, due_date, priority, status")
        .not("due_date", "is", null)
        .gte("due_date", startISO)
        .lte("due_date", endISO);

      tasks?.forEach((task) => {
        if (!task.due_date) return;
        events.push({
          id: `task-${task.id}`,
          category: "task",
          title: task.title,
          date: task.due_date,
          meta: { priority: task.priority, status: task.status },
        });
      });

      // 2. Vacation slots
      const { data: vacations } = await supabase
        .from("vacation_slots")
        .select("id, date, shift, note, worker_id, workers:worker_id(display_name, color_hex)")
        .gte("date", startISO)
        .lte("date", endISO);

      vacations?.forEach((slot: any) => {
        events.push({
          id: `vac-${slot.id}`,
          category: "vacation",
          title: slot.workers?.display_name ?? "Vacaciones",
          date: slot.date,
          meta: {
            workerName: slot.workers?.display_name,
            shift: slot.shift,
            notes: slot.note,
            color: slot.workers?.color_hex,
          },
        });
      });

      // 3. Machine ITV / inspection dates
      const { data: machines } = await supabase
        .from("machine_assets")
        .select("id, display_name, next_itv_date, next_inspection_date");

      machines?.forEach((machine) => {
        if (machine.next_itv_date && machine.next_itv_date >= startISO && machine.next_itv_date <= endISO) {
          events.push({
            id: `itv-${machine.id}`,
            category: "machine_itv",
            title: `ITV · ${machine.display_name}`,
            date: machine.next_itv_date,
            meta: { machineName: machine.display_name },
          });
        }
        if (machine.next_inspection_date && machine.next_inspection_date >= startISO && machine.next_inspection_date <= endISO) {
          events.push({
            id: `insp-${machine.id}`,
            category: "machine_inspection",
            title: `Inspección · ${machine.display_name}`,
            date: machine.next_inspection_date,
            meta: { machineName: machine.display_name },
          });
        }
      });

      // 4. Holidays
      const { data: holidays } = await supabase
        .from("holidays")
        .select("id, date, label, color_hex, type")
        .gte("date", startISO)
        .lte("date", endISO);

      holidays?.forEach((holiday) => {
        events.push({
          id: `hol-${holiday.id}`,
          category: "holiday",
          title: holiday.label,
          date: holiday.date,
          meta: { color: holiday.color_hex, status: holiday.type },
        });
      });

      // 5. Company calendar days
      const { data: calendarDays } = await supabase
        .from("company_calendar_days")
        .select("id, calendar_date, title, day_type, color_tag, notes")
        .gte("calendar_date", startISO)
        .lte("calendar_date", endISO);

      calendarDays?.forEach((day) => {
        events.push({
          id: `cal-${day.id}`,
          category: "company_calendar",
          title: day.title,
          date: day.calendar_date,
          meta: { color: day.color_tag, status: day.day_type, notes: day.notes },
        });
      });

      return events.sort((a, b) => a.date.localeCompare(b.date));
    },
  });
};
