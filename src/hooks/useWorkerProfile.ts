import { useCallback, useEffect, useState } from "react";
import { differenceInMinutes, endOfMonth, formatDistanceToNowStrict, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export interface WorkerProfileStaff {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  color_tag: string | null;
  linked_user_id: string | null;
  contract_type: string | null;
  start_date: string | null;
  weekly_hours: number | null;
  position: string | null;
}

export interface WorkerTimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
}

export interface WorkerVacationRequest {
  id: string;
  request_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string | null;
  admin_response: string | null;
}

export interface WorkerAllowance {
  vacation_days_base: number;
  personal_days_base: number;
  vacation_adjustment_days: number;
  personal_adjustment_days: number;
}

export interface WorkerTask {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
}

export interface WorkerReport {
  id: string;
  description: string;
  started_at: string;
  ended_at: string | null;
  machine: string | null;
}

export interface WorkerIncident {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export interface WorkerProfileData {
  staff: WorkerProfileStaff | null;
  // Nueva API
  entries: WorkerTimeEntry[];
  activeReport: { id: string; description: string; started_at: string } | null;
  vacationRequests: WorkerVacationRequest[];
  allowance: WorkerAllowance | null;
  tasks: WorkerTask[];
  reports: WorkerReport[];
  incidents: WorkerIncident[];
  // Compatibilidad con WorkerProfileDialog
  lastEntry: { clock_in: string; clock_out: string | null } | null;
  pendingTasksCount: number;
  recentTasks: WorkerTask[];
  allEntries: WorkerTimeEntry[];
  recentReports: WorkerReport[];
  loading: boolean;
}

const initialState: WorkerProfileData = {
  staff: null,
  entries: [],
  activeReport: null,
  vacationRequests: [],
  allowance: null,
  tasks: [],
  reports: [],
  incidents: [],
  lastEntry: null,
  pendingTasksCount: 0,
  recentTasks: [],
  allEntries: [],
  recentReports: [],
  loading: true,
};

export const useWorkerProfile = (staffId: string | null) => {
  const [data, setData] = useState<WorkerProfileData>(initialState);

  const load = useCallback(async () => {
    if (!staffId) return;
    const db = supabase as any;

    const { data: staff } = await db
      .from("staff_directory")
      .select("id, full_name, email, phone, notes, color_tag, linked_user_id, contract_type, start_date, weekly_hours, position")
      .eq("id", staffId)
      .maybeSingle();

    if (!staff) {
      setData({ ...initialState, loading: false });
      return;
    }

    const userId = staff.linked_user_id as string | null;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [entriesRes, activeReportRes, reportsRes, tasksRes, vacationsRes, allowanceRes, incidentsRes] = await Promise.all([
      userId
        ? db.from("time_entries").select("id, clock_in, clock_out").eq("user_id", userId).gte("clock_in", sixMonthsAgo.toISOString()).order("clock_in", { ascending: false })
        : Promise.resolve({ data: [] }),
      userId
        ? db.from("work_reports").select("id, description, started_at, ended_at").eq("user_id", userId).is("ended_at", null).order("started_at", { ascending: false }).limit(1)
        : Promise.resolve({ data: [] }),
      userId
        ? db.from("work_reports").select("id, description, started_at, ended_at, machine").eq("user_id", userId).order("started_at", { ascending: false }).limit(20)
        : Promise.resolve({ data: [] }),
      // Multi-asignación: tareas asignadas vía task_assignments + las del modo 'all'
      (async () => {
        const { data: assignedRows } = await db
          .from("task_assignments")
          .select("task_id, tasks(id, title, status, due_date, completed_at, assignment_mode)")
          .eq("staff_id", staffId);
        const assigned = ((assignedRows ?? []) as Array<{ tasks: any }>)
          .map((row) => row.tasks)
          .filter(Boolean);
        const { data: allRows } = await db
          .from("tasks")
          .select("id, title, status, due_date, completed_at, assignment_mode")
          .eq("assignment_mode", "all")
          .order("updated_at", { ascending: false })
          .limit(20);
        const merged = [...assigned, ...((allRows ?? []) as any[])];
        const seen = new Set<string>();
        const unique = merged.filter((task) => (seen.has(task.id) ? false : (seen.add(task.id), true)));
        return { data: unique.slice(0, 20) };
      })(),
      userId
        ? db.from("vacation_requests").select("id, request_type, start_date, end_date, status, reason, admin_response").eq("requester_user_id", userId).order("start_date", { ascending: false }).limit(40)
        : Promise.resolve({ data: [] }),
      db.from("staff_allowances").select("vacation_days_base, personal_days_base, vacation_adjustment_days, personal_adjustment_days").eq("staff_member_id", staffId).maybeSingle(),
      userId
        ? db.from("machine_incidents").select("id, title, status, created_at").eq("reported_by_user_id", userId).order("created_at", { ascending: false }).limit(10)
        : Promise.resolve({ data: [] }),
    ]);

    const entries = (entriesRes.data ?? []) as WorkerTimeEntry[];
    const tasks = (tasksRes.data ?? []) as WorkerTask[];
    const reports = (reportsRes.data ?? []) as WorkerReport[];

    setData({
      staff: staff as WorkerProfileStaff,
      entries,
      activeReport: ((activeReportRes.data ?? []) as any[])[0] ?? null,
      vacationRequests: (vacationsRes.data ?? []) as WorkerVacationRequest[],
      allowance: (allowanceRes.data ?? null) as WorkerAllowance | null,
      tasks,
      reports,
      incidents: (incidentsRes.data ?? []) as WorkerIncident[],
      // Compat
      lastEntry: entries[0] ? { clock_in: entries[0].clock_in, clock_out: entries[0].clock_out } : null,
      pendingTasksCount: tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled").length,
      recentTasks: tasks.slice(0, 5),
      allEntries: entries,
      recentReports: reports,
      loading: false,
    });
  }, [staffId]);

  useEffect(() => {
    if (!staffId) {
      setData(initialState);
      return;
    }

    setData((current) => ({ ...current, loading: true }));
    void load();

    const channel = supabase
      .channel(`worker-profile-${staffId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "work_reports" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "vacation_requests" }, () => void load())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [staffId, load]);

  return { ...data, refetch: load };
};

// Helpers derivados
export const formatTimeSince = (iso: string | null) =>
  iso ? `Hace ${formatDistanceToNowStrict(new Date(iso), { locale: es })}` : "Sin registro";

export const computeHoursSummaries = (entries: WorkerTimeEntry[]) => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  const sumMinutes = (filterStart: Date, filterEnd?: Date) =>
    entries.reduce((total, entry) => {
      const start = new Date(entry.clock_in);
      if (start < filterStart) return total;
      if (filterEnd && start > filterEnd) return total;
      const end = entry.clock_out ? new Date(entry.clock_out) : new Date();
      return total + Math.max(0, differenceInMinutes(end, start));
    }, 0);

  const total = entries.reduce(
    (acc, entry) =>
      acc +
      Math.max(0, differenceInMinutes(entry.clock_out ? new Date(entry.clock_out) : new Date(), new Date(entry.clock_in))),
    0,
  );

  return {
    monthMinutes: sumMinutes(monthStart, monthEnd),
    weekMinutes: sumMinutes(weekStart),
    totalMinutes: total,
  };
};

export const formatMinutesAsHours = (mins: number) => `${Math.floor(mins / 60)}h ${mins % 60}m`;
