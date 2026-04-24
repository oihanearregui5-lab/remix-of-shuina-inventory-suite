import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export interface WorkerProfileData {
  staff: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    color_tag: string | null;
    linked_user_id: string | null;
  } | null;
  lastEntry: { clock_in: string; clock_out: string | null } | null;
  activeReport: { id: string; description: string; started_at: string } | null;
  pendingTasksCount: number;
  recentTasks: Array<{ id: string; title: string; status: string; due_date: string | null }>;
  loading: boolean;
}

const initialState: WorkerProfileData = {
  staff: null,
  lastEntry: null,
  activeReport: null,
  pendingTasksCount: 0,
  recentTasks: [],
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
        .select("id, full_name, email, phone, notes, color_tag, linked_user_id")
        .eq("id", staffId)
        .maybeSingle();

      if (!active) return;
      if (!staff) {
        setData({ ...initialState, loading: false });
        return;
      }

      const userId = staff.linked_user_id as string | null;

      const [entriesRes, reportsRes, tasksRes] = await Promise.all([
        userId ? db.from("time_entries").select("clock_in, clock_out").eq("user_id", userId).order("clock_in", { ascending: false }).limit(1) : Promise.resolve({ data: [] }),
        userId ? db.from("work_reports").select("id, description, started_at, ended_at").eq("user_id", userId).is("ended_at", null).order("started_at", { ascending: false }).limit(1) : Promise.resolve({ data: [] }),
        db.from("tasks").select("id, title, status, due_date").eq("assigned_staff_id", staffId).neq("status", "cancelled").order("due_date", { ascending: true, nullsFirst: false }).limit(20),
      ]);

      if (!active) return;

      const tasks = (tasksRes.data ?? []) as Array<{ id: string; title: string; status: string; due_date: string | null }>;
      setData({
        staff,
        lastEntry: ((entriesRes.data ?? []) as any[])[0] ?? null,
        activeReport: ((reportsRes.data ?? []) as any[])[0] ?? null,
        pendingTasksCount: tasks.filter((task) => task.status !== "completed").length,
        recentTasks: tasks.slice(0, 5),
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
