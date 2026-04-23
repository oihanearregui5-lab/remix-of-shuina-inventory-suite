import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type WorkerPresence = "working" | "paused" | "off";

export interface WorkerLiveStatusItem {
  id: string;
  name: string;
  presence: WorkerPresence;
  statusLabel: string;
  detail: string;
  sinceLabel: string;
}

type StaffRow = {
  id: string;
  full_name: string;
  linked_user_id: string | null;
  sort_order: number;
};

type TimeEntryRow = {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
};

type WorkReportRow = {
  id: string;
  user_id: string;
  description: string;
  started_at: string;
  ended_at: string | null;
};

const statusRank: Record<WorkerPresence, number> = {
  working: 0,
  paused: 1,
  off: 2,
};

export const useWorkerLiveStatus = () => {
  const { canViewAdmin } = useAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [reports, setReports] = useState<WorkReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canViewAdmin) {
      setStaff([]);
      setEntries([]);
      setReports([]);
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      const { data: staffRows } = await supabase
        .from("staff_directory")
        .select("id, full_name, linked_user_id, sort_order")
        .eq("active", true)
        .not("linked_user_id", "is", null)
        .order("sort_order", { ascending: true });

      if (!active) return;

      const normalizedStaff = (staffRows ?? []) as StaffRow[];
      const userIds = normalizedStaff.map((item) => item.linked_user_id).filter(Boolean) as string[];

      if (userIds.length === 0) {
        setStaff(normalizedStaff);
        setEntries([]);
        setReports([]);
        setLoading(false);
        return;
      }

      const [entriesRes, reportsRes] = await Promise.all([
        supabase.from("time_entries").select("id, user_id, clock_in, clock_out").in("user_id", userIds).order("clock_in", { ascending: false }).limit(200),
        supabase.from("work_reports").select("id, user_id, description, started_at, ended_at").in("user_id", userIds).order("started_at", { ascending: false }).limit(200),
      ]);

      if (!active) return;

      setStaff(normalizedStaff);
      setEntries((entriesRes.data ?? []) as TimeEntryRow[]);
      setReports((reportsRes.data ?? []) as WorkReportRow[]);
      setLoading(false);
    };

    setLoading(true);
    void load();

    const channel = supabase
      .channel("worker-live-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "work_reports" }, () => void load())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [canViewAdmin]);

  const items = useMemo<WorkerLiveStatusItem[]>(() => {
    const latestEntryByUser = new Map<string, TimeEntryRow>();
    const openEntryByUser = new Map<string, TimeEntryRow>();
    const latestOpenReportByUser = new Map<string, WorkReportRow>();

    entries.forEach((entry) => {
      if (!latestEntryByUser.has(entry.user_id)) latestEntryByUser.set(entry.user_id, entry);
      if (!entry.clock_out && !openEntryByUser.has(entry.user_id)) openEntryByUser.set(entry.user_id, entry);
    });

    reports.forEach((report) => {
      if (!report.ended_at && !latestOpenReportByUser.has(report.user_id)) latestOpenReportByUser.set(report.user_id, report);
    });

    return staff
      .map((person) => {
        const userId = person.linked_user_id as string;
        const openEntry = openEntryByUser.get(userId) ?? null;
        const openReport = latestOpenReportByUser.get(userId) ?? null;
        const latestEntry = latestEntryByUser.get(userId) ?? null;

        if (openEntry && openReport) {
          return {
            id: person.id,
            name: person.full_name,
            presence: "working" as const,
            statusLabel: "Trabajando",
            detail: openReport.description || "Parte en curso",
            sinceLabel: `Desde hace ${formatDistanceToNowStrict(new Date(openEntry.clock_in), { locale: es })}`,
          };
        }

        if (openEntry) {
          return {
            id: person.id,
            name: person.full_name,
            presence: "paused" as const,
            statusLabel: "En pausa",
            detail: "Jornada abierta sin parte activo",
            sinceLabel: `Desde hace ${formatDistanceToNowStrict(new Date(openEntry.clock_in), { locale: es })}`,
          };
        }

        return {
          id: person.id,
          name: person.full_name,
          presence: "off" as const,
          statusLabel: "Fuera",
          detail: latestEntry?.clock_out ? "Última salida registrada" : "Sin actividad reciente",
          sinceLabel: latestEntry?.clock_out
            ? `Hace ${formatDistanceToNowStrict(new Date(latestEntry.clock_out), { locale: es })}`
            : "Sin registro",
        };
      })
      .sort((a, b) => statusRank[a.presence] - statusRank[b.presence] || a.name.localeCompare(b.name, "es"));
  }, [entries, reports, staff]);

  const summary = useMemo(
    () => ({
      working: items.filter((item) => item.presence === "working").length,
      paused: items.filter((item) => item.presence === "paused").length,
      off: items.filter((item) => item.presence === "off").length,
    }),
    [items],
  );

  return { items, loading, summary };
};