import { useEffect, useMemo, useState } from "react";
import { isBefore, startOfToday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ReminderSection = "fichajes" | "tasks" | "workReports";

export interface SmartReminder {
  id: string;
  title: string;
  description: string;
  section: ReminderSection;
  cta: string;
  tone: "warning" | "danger" | "info";
}

type TimeEntryReminderRow = {
  id: string;
  clock_in: string;
  clock_out: string | null;
};

type WorkReportReminderRow = {
  id: string;
  description: string;
  started_at: string;
  ended_at: string | null;
};

type TaskReminderRow = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  created_at: string;
};

const formatHoursAndMinutes = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export const useSmartReminders = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntryReminderRow[]>([]);
  const [reports, setReports] = useState<WorkReportReminderRow[]>([]);
  const [tasks, setTasks] = useState<TaskReminderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setReports([]);
      setTasks([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const [entriesRes, reportsRes, tasksRes] = await Promise.all([
        supabase.from("time_entries").select("id, clock_in, clock_out").eq("user_id", user.id).order("clock_in", { ascending: false }).limit(20),
        supabase.from("work_reports").select("id, description, started_at, ended_at").eq("user_id", user.id).order("started_at", { ascending: false }).limit(20),
        supabase.from("tasks").select("id, title, status, due_date, created_at").order("updated_at", { ascending: false }).limit(20),
      ]);

      if (cancelled) return;

      setEntries((entriesRes.data ?? []) as TimeEntryReminderRow[]);
      setReports((reportsRes.data ?? []) as WorkReportReminderRow[]);
      setTasks((tasksRes.data ?? []) as TaskReminderRow[]);
      setLoading(false);
    };

    setLoading(true);
    void load();

    const interval = window.setInterval(() => {
      void load();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  const reminders = useMemo<SmartReminder[]>(() => {
    const now = new Date();
    const todayStart = startOfToday();
    const activeEntry = entries.find((entry) => !entry.clock_out) ?? null;
    const activeReport = reports.find((report) => !report.ended_at) ?? null;
    const nextReminders: SmartReminder[] = [];

    if (activeEntry) {
      const openMinutes = Math.max(0, Math.floor((now.getTime() - new Date(activeEntry.clock_in).getTime()) / 60_000));
      if (openMinutes >= 240) {
        nextReminders.push({
          id: `open-entry-${activeEntry.id}`,
          title: "Llevas muchas horas con la jornada abierta",
          description: `Tu fichaje sigue abierto desde hace ${formatHoursAndMinutes(openMinutes)}. Si ya has terminado, registra la salida ahora.`,
          section: "fichajes",
          cta: "Revisar fichaje",
          tone: "danger",
        });
      }
    }

    if (activeReport) {
      const reportMinutes = Math.max(0, Math.floor((now.getTime() - new Date(activeReport.started_at).getTime()) / 60_000));
      nextReminders.push({
        id: `open-report-${activeReport.id}`,
        title: activeEntry ? "Tienes un parte en curso" : "Has olvidado cerrar una actividad",
        description: activeEntry
          ? `El parte sigue abierto desde hace ${formatHoursAndMinutes(reportMinutes)}. Revísalo al terminar para que no se quede pendiente.`
          : "Hay un parte abierto sin jornada activa. Revísalo y ciérralo para evitar errores en el registro.",
        section: "workReports",
        cta: "Abrir parte",
        tone: activeEntry ? "warning" : "danger",
      });
    }

    const plannedTasks = tasks.filter((task) => task.status === "planned");
    const overduePlannedTask = plannedTasks.find((task) => task.due_date && isBefore(new Date(task.due_date), todayStart));
    if (overduePlannedTask) {
      nextReminders.push({
        id: `planned-task-${overduePlannedTask.id}`,
        title: "Tienes una tarea asignada sin empezar",
        description: `“${overduePlannedTask.title}” sigue pendiente y ya va con retraso. Muévela a en curso o actualiza su estado.`,
        section: "tasks",
        cta: "Ver tareas",
        tone: "warning",
      });
    } else {
      const stalePlannedTask = plannedTasks.find((task) => isBefore(new Date(task.created_at), todayStart));
      if (stalePlannedTask) {
        nextReminders.push({
          id: `stale-task-${stalePlannedTask.id}`,
          title: "Tienes trabajo pendiente sin arrancar",
          description: `“${stalePlannedTask.title}” sigue en pendiente desde antes de hoy. Revísala para que no se quede olvidada.`,
          section: "tasks",
          cta: "Abrir tareas",
          tone: "info",
        });
      }
    }

    return nextReminders;
  }, [entries, reports, tasks]);

  return { reminders, loading };
};