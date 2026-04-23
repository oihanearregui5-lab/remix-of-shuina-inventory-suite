import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HolidayItem, ShiftSlot, TimeEntryItem, VacationSlotItem, WorkerItem, WorkerYearSummaryItem } from "@/components/admin/vacations/vacation-types";

export const vacationKeys = {
  all: ["vacation-data"] as const,
  workers: () => [...vacationKeys.all, "workers"] as const,
  holidays: () => [...vacationKeys.all, "holidays"] as const,
  slots: () => [...vacationKeys.all, "slots"] as const,
  summaries: (year: number) => [...vacationKeys.all, "summaries", year] as const,
  timeEntries: (limit: number) => [...vacationKeys.all, "time-entries", limit] as const,
};

export const useWorkers = () =>
  useQuery({
    queryKey: vacationKeys.workers(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("id, name, display_name, color_hex, shift_default, annual_contract_hours, company_vacation_hours, worker_vacation_days, total_annual_hours, extra_vacation_days, extra_vacation_reason, linked_user_id, is_active")
        .eq("is_active", true)
        .order("display_name");
      if (error) throw error;
      return (data ?? []) as WorkerItem[];
    },
  });

export const useHolidays = () =>
  useQuery({
    queryKey: vacationKeys.holidays(),
    queryFn: async () => {
      const { data, error } = await supabase.from("holidays").select("id, date, type, label, color_hex").order("date");
      if (error) throw error;
      return (data ?? []) as HolidayItem[];
    },
  });

export const useVacationSlots = () =>
  useQuery({
    queryKey: vacationKeys.slots(),
    queryFn: async () => {
      const { data, error } = await supabase.from("vacation_slots").select("id, worker_id, date, shift, note").order("date");
      if (error) throw error;
      return (data ?? []) as VacationSlotItem[];
    },
  });

export const useWorkerYearSummaries = (year = new Date().getFullYear()) =>
  useQuery({
    queryKey: vacationKeys.summaries(year),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_year_summary")
        .select("worker_id, year, total_annual_hours, worked_hours, remaining_hours, vacation_days_total, vacation_days_used, extra_days")
        .eq("year", year);
      if (error) throw error;
      return (data ?? []) as WorkerYearSummaryItem[];
    },
  });

export const useRecentTimeEntries = (limit = 2000) =>
  useQuery({
    queryKey: vacationKeys.timeEntries(limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("id, user_id, clock_in, clock_out, notes, created_at")
        .order("clock_in", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as TimeEntryItem[];
    },
  });

export const useSaveHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id?: string; date: string; type: HolidayItem["type"]; label: string; color_hex: string }) => {
      const request = payload.id
        ? supabase.from("holidays").update(payload).eq("id", payload.id)
        : supabase.from("holidays").insert(payload);
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vacationKeys.holidays() }),
  });
};

export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (holidayId: string) => {
      const { error } = await supabase.from("holidays").delete().eq("id", holidayId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vacationKeys.holidays() }),
  });
};

export const useSaveVacationSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { worker_id: string; date: string; shift: ShiftSlot; id?: string }) => {
      const { error } = await supabase.from("vacation_slots").insert({ worker_id: payload.worker_id, date: payload.date, shift: payload.shift });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vacationKeys.slots() }),
  });
};

export const useDeleteVacationSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from("vacation_slots").delete().eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vacationKeys.slots() }),
  });
};

export const useUpdateWorker = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { workerId: string; display_name: string; color_hex: string }) => {
      const { error } = await supabase
        .from("workers")
        .update({ display_name: payload.display_name, color_hex: payload.color_hex })
        .eq("id", payload.workerId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vacationKeys.workers() }),
  });
};