import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export interface StaffContractInfo {
  contract_type: string | null;
  start_date: string | null;
  weekly_hours: number | null;
  position: string | null;
}

export interface WorkerProfileData {
  staff: ({
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    color_tag: string | null;
    linked_user_id: string | null;
  } & StaffContractInfo) | null;
  lastEntry: { clock_in: string; clock_out: string | null } | null;
  activeReport: { id: string; description: string; started_at: string } | null;
  pendingTasksCount: number;
  recentTasks: Array<{ id: string; title: string; status: string; due_date: string | null }>;
  allEntries: Array<{ id: string; clock_in: string; clock_out: string | null }>;
  vacationRequests: Array<{ id: string; start_date: string; end_date: string; status: string; request_type: string }>;
  recentReports: Array<{ id: string; description: string; started_at: string; ended_at: string | null; machine: string | null }>;
  loading: boolean;
}

const initialState: WorkerProfileData = {
  staff: null,
  lastEntry: null,
  activeReport: null,
  pendingTasksCount: 0,
  recentTasks: [],
  allEntries: [],
  vacationRequests: [],
  recentReports: [],
  loading: true,
};

export const useWorkerProfile = (staffId: string | null) => {
  const [data, setData] = useState<WorkerProfileData>(initialState);

  useEffect(() => {
    if (!staffId) {
      setData(initialState);
      return;
    }

    let active = true;
    const db = supabase as any;

    const load = async () => {
      const { data: staff } = await db
        .from("staff_directory")
        .select("id, full_name, email, phone, notes, color_tag, linked_user_id, contract_type, start_date, weekly_hours, position")
        .eq("id", staffId)
        .maybeSingle();

      if (!active) return;
      if (!staff) {
        setData({ ...initialState, loading: false });
        return;
      }

      const userId = staff.linked_user_id as string | null;

      const [entriesRes, reportsRes, tasksRes, allEntriesRes, vacRes, recentReportsRes] = await Promise.all([
        userId ? db.from("time_entries").select("clock_in, clock_out").eq("user_id", userId).order("clock_in", { ascending: false }).limit(1) : Promise.resolve({ data: [] }),
        userId ? db.from("work_reports").select("id, description, started_at, ended_at").eq("user_id", userId).is("ended_at", null).order("started_at", { ascending: false }).limit(1) : Promise.resolve({ data: [] }),
        db.from("tasks").select("id, title, status, due_date").eq("assigned_staff_id", staffId).neq("status", "cancelled").order("due_date", { ascending: true, nullsFirst: false }).limit(20),
        userId ? db.from("time_entries").select("id, clock_in, clock_out").eq("user_id", userId).order("clock_in", { ascending: false }).limit(120) : Promise.resolve({ data: [] }),
        userId ? db.from("vacation_requests").select("id, start_date, end_date, status, request_type").eq("requester_user_id", userId).order("start_date", { ascending: false }).limit(40) : Promise.resolve({ data: [] }),
        userId ? db.from("work_reports").select("id, description, started_at, ended_at, machine").eq("user_id", userId).order("started_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
      ]);

      if (!active) return;

      const tasks = (tasksRes.data ?? []) as Array<{ id: string; title: string; status: string; due_date: string | null }>;
      setData({
        staff,
        lastEntry: ((entriesRes.data ?? []) as any[])[0] ?? null,
        activeReport: ((reportsRes.data ?? []) as any[])[0] ?? null,
        pendingTasksCount: tasks.filter((task) => task.status !== "completed").length,
        recentTasks: tasks.slice(0, 5),
        allEntries: (allEntriesRes.data ?? []) as any[],
        vacationRequests: (vacRes.data ?? []) as any[],
        recentReports: (recentReportsRes.data ?? []) as any[],
        loading: false,
      });
    };

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
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [staffId]);

  return data;
};

export const formatTimeSince = (iso: string | null) =>
  iso ? `Hace ${formatDistanceToNowStrict(new Date(iso), { locale: es })}` : "Sin registro";
